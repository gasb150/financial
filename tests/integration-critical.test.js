const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');
const SW_JS = path.join(ROOT, 'service-worker.js');

test('initApp integrates summary refresh and key render calls without crashing', () => {
  const calls = [];
  const nodes = {
    'tit-cal-dinamico': { innerText: '' },
    'tit-semanas-dinamico': { innerText: '' },
    'res-ingresos': { innerText: '' },
    'res-ingresos-detalle': { innerText: '' },
    'res-gastos': { innerText: '' },
    'res-gastos-porc': { innerText: '' },
    'res-balance': { innerText: '', style: {} },
    'res-balance-text': { innerText: '' },
    'alerta-deficit': { style: { display: '' } },
    'alerta-b-text': { innerText: '' },
    'res-pendiente': { innerText: '' },
    'add-tipo-gasto': { value: 'variable' }
  };

  const ctx = loadFunctionsFromFile(APP_JS, ['initApp'], {
    window: {
      FinancialI18n: {
        initializeLocale: () => calls.push('i18n.init'),
        applyStaticTranslations: () => calls.push('i18n.apply'),
        setupLanguageSwitcher: () => calls.push('i18n.switcher')
      }
    },
    document: {
      getElementById: (id) => nodes[id] || null
    },
    appData: { schemaVersion: 0 },
    APP_SCHEMA_VERSION: 4,
    mesActivoGlobal: 'Junio 2026',
    diaSeleccionadoActivo: null,
    modoAltaDeuda: 'rapido',
    aplicarCorreccionMesBaseSiAplica: () => calls.push('migrate.base'),
    normalizarRecurrenciasCompromisos: () => calls.push('normalize.recurrencias'),
    normalizarIngresosConDia: () => calls.push('normalize.ingresos'),
    persistirDataPrincipalConFallback: () => calls.push('persist.main'),
    persistirAuxiliaresConFallback: () => calls.push('persist.aux'),
    actualizarSelectoresDeMes: () => calls.push('render.month-selectors'),
    getCompromisosMesActual: () => [
      { valor: 120, pagado: false },
      { valor: 30, pagado: true }
    ],
    obtenerEventosIngresoDelMes: () => [
      { valor: 400, origen: 'normal' },
      { valor: 100, origen: 'arrastre' }
    ],
    formatCOP: (n) => `$${n}`,
    renderSobrante: () => calls.push('render.sobrante'),
    renderIAPanelResumen: () => calls.push('render.ia.resumen'),
    renderIngresosResumen: () => calls.push('render.ingresos.resumen'),
    renderCalendario: () => calls.push('render.calendario'),
    renderQuincenas: () => calls.push('render.quincenas'),
    renderDeudasModulo: () => calls.push('render.deudas'),
    renderMenuSemanas: () => calls.push('render.menu-semanas'),
    renderSemanaActiva: () => calls.push('render.semana-activa'),
    renderSelectoresVigenciaIngreso: () => calls.push('render.vigencia-ingreso'),
    renderConfigIngresos: () => calls.push('render.config.ingresos'),
    renderConfigPrimas: () => calls.push('render.config.primas'),
    renderConfigIA: () => calls.push('render.config.ia'),
    renderIAPanelSemanal: () => calls.push('render.ia.semanal'),
    renderIAPanelQuincena: () => calls.push('render.ia.quincena'),
    renderIAPanelDeudas: () => calls.push('render.ia.deudas'),
    renderUltimoGuardado: () => calls.push('render.last-save'),
    aplicarFormatoMonedaInputs: () => calls.push('format.money-inputs'),
    ocultarVistaDiariaDOM: () => calls.push('render.diaria.hide'),
    setModoAltaDeuda: () => calls.push('deuda.mode'),
    toggleCuotasInput: () => calls.push('deuda.cuotas'),
    actualizarPreviewNuevaDeuda: () => calls.push('deuda.preview')
  });

  ctx.initApp();

  assert.equal(ctx.appData.schemaVersion, 4);
  assert.equal(nodes['tit-cal-dinamico'].innerText, 'Calendario de Flujo - Junio 2026');
  assert.equal(nodes['tit-semanas-dinamico'].innerText, 'Línea de Semanas - Junio 2026');
  assert.equal(nodes['res-ingresos'].innerText, '$500');
  assert.equal(nodes['res-gastos'].innerText, '$150');
  assert.equal(nodes['res-pendiente'].innerText, '$120');
  assert.ok(calls.includes('render.calendario'));
  assert.ok(calls.includes('render.menu-semanas'));
  assert.ok(calls.includes('render.semana-activa'));
  assert.ok(calls.includes('render.ia.deudas'));
});

test('ejecutarConsultaIA routes through OFF/LOCAL/API modes as expected', async () => {
  const ctx = loadFunctionsFromFile(APP_JS, ['ejecutarConsultaIA'], {
    getModoIA: () => 'off',
    consultarIALocal: async () => ({ ok: true, mode: 'local', message: 'unused' })
  });

  await assert.rejects(
    async () => ctx.ejecutarConsultaIA('hola'),
    /Modo IA en OFF/
  );

  ctx.getModoIA = () => 'local';
  let localPrompt = '';
  ctx.consultarIALocal = async (prompt) => {
    localPrompt = prompt;
    return { ok: true, mode: 'local', message: 'ok local' };
  };

  const localOut = await ctx.ejecutarConsultaIA('estrategia deuda');
  assert.equal(localPrompt, 'estrategia deuda');
  assert.deepEqual(localOut, { ok: true, mode: 'local', message: 'ok local' });

  ctx.getModoIA = () => 'api';
  const apiOut = await ctx.ejecutarConsultaIA('resumen');
  assert.equal(apiOut.ok, false);
  assert.equal(apiOut.mode, 'api');
  assert.match(apiOut.message, /Gateway\/API externa aun no integrada/);
});

test('service worker caches stable CSS opaque responses and handles offline miss safely', async () => {
  const source = fs.readFileSync(SW_JS, 'utf8');
  const listeners = {};

  let putCalls = 0;
  let putCompletedResolve;
  const putCompleted = new Promise((resolve) => {
    putCompletedResolve = resolve;
  });
  let fetchBehavior = async () => ({
    ok: false,
    type: 'opaque',
    clone() { return this; }
  });

  const context = {
    console,
    Response,
    URL,
    self: {
      location: { origin: 'http://localhost:8080' },
      addEventListener: (evt, handler) => { listeners[evt] = handler; },
      skipWaiting: () => {},
      clients: { claim: () => {} }
    },
    caches: {
      open: async () => ({
        put: async () => {
          putCalls += 1;
          putCompletedResolve();
        }
      }),
      match: async () => null,
      keys: async () => []
    },
    fetch: (...args) => fetchBehavior(...args)
  };

  vm.runInNewContext(source, context, { filename: SW_JS });

  const cssEvent = {
    request: { method: 'GET', url: 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/tabler-icons.min.css' },
    respondWith(promise) { this.responsePromise = promise; }
  };
  listeners.fetch(cssEvent);
  const cssResponse = await cssEvent.responsePromise;
  assert.equal(cssResponse.type, 'opaque');
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Timed out waiting for cache.put to be called'));
    }, 250);
  });
  await Promise.race([
    putCompleted.then(() => {
      clearTimeout(timeoutHandle);
    }),
    timeoutPromise
  ]);
  assert.equal(putCalls, 1);

  fetchBehavior = async () => { throw new Error('offline'); };
  const offlineEvent = {
    request: { method: 'GET', url: 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/tabler-icons.min.css' },
    respondWith(promise) { this.responsePromise = promise; }
  };
  listeners.fetch(offlineEvent);
  const offlineResponse = await offlineEvent.responsePromise;
  assert.equal(offlineResponse.type, 'error');
});