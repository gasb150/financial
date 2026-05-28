const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');
const DATA_JS = path.join(ROOT, 'app.data.js');

test('sanitizeCompromisoItem conserva diaPagoReal valido y limpia invalido', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, ['toSafeInt', 'isFiniteNumber', 'sanitizeCompromisoItem']);

  const ok = ctx.sanitizeCompromisoItem({
    id: 1,
    nombre: 'Seguro',
    valor: 300000,
    dia: 10,
    diaPagoReal: 12,
    tipo: 'fijo',
    mesKey: 'Junio 2026'
  });
  assert.equal(ok.diaPagoReal, 12);

  const bad = ctx.sanitizeCompromisoItem({
    id: 2,
    nombre: 'Mercado',
    valor: 200000,
    dia: 8,
    diaPagoReal: 42,
    tipo: 'variable',
    mesKey: 'Junio 2026'
  });
  assert.equal(bad.diaPagoReal, null);
});

test('modificarCompromisoPropiedad permite editar diaPagoReal opcional', () => {
  let initCalls = 0;
  const ctx = loadFunctionsFromFile(APP_JS, ['modificarCompromisoPropiedad'], {
    appData: {
      compromisos: [
        { id: 10, nombre: 'Arriendo', valor: 1000000, dia: 5, diaPagoReal: null, pagado: false, tipo: 'fijo', mesKey: 'Junio 2026' }
      ]
    },
    parseMontoInput: (v) => Number(v),
    initApp: () => { initCalls += 1; }
  });

  ctx.modificarCompromisoPropiedad(10, 'diaPagoReal', '18');
  assert.equal(ctx.appData.compromisos[0].diaPagoReal, 18);

  ctx.modificarCompromisoPropiedad(10, 'diaPagoReal', '');
  assert.equal(ctx.appData.compromisos[0].diaPagoReal, null);
  assert.equal(initCalls, 2);
});

test('revertirEventoHistorialIA restaura snapshot previo y marca evento revertido', () => {
  let persistedAt = null;
  const ctx = loadFunctionsFromFile(APP_IA_JS, [
    'asegurarHistorialIA',
    'clonarCompromisoHistorial',
    'registrarEventoHistorialIA',
    'obtenerEventoHistorialIA',
    'getEstadoRecortesItemsMes',
    'actualizarEstadoAplicadoDesdeHistorialIA',
    'revertirEventoHistorialIA'
  ], {
    appData: {
      compromisos: [
        { id: 30, nombre: 'Streaming', valor: 90000, dia: 20, diaPagoReal: 22, pagado: false, tipo: 'fijo', mesKey: 'Julio 2026', recurringKey: 'rk-streaming', autoGenerado: true }
      ],
      iaHistory: { version: 1, lastEventAt: null, events: [] }
    },
    iaPanelState: {
      recortesItemsMes: { loading: false, error: '', result: '', items: [] },
      rebalanceQuincena: { loading: false, error: false, result: '', actions: [] },
      rebalanceSemana: { loading: false, error: false, result: '', actions: [] }
    },
    mesActivoGlobal: 'Julio 2026',
    persistirDataPrincipalConFallback: () => {},
    persistirAuxiliaresConFallback: (iso) => { persistedAt = iso; },
    initApp: () => {}
  });

  const before = { ...ctx.appData.compromisos[0] };
  ctx.appData.compromisos[0].valor = 65000;
  ctx.appData.compromisos[0].dia = 12;
  const after = { ...ctx.appData.compromisos[0] };

  const evt = ctx.registrarEventoHistorialIA({
    source: 'recorte',
    action: 'reducir',
    monthKey: 'Julio 2026',
    before,
    after,
    reason: 'Ajuste IA'
  });

  const out = ctx.revertirEventoHistorialIA(evt.id, { silent: true, reason: 'test' });

  assert.equal(out.ok, true);
  assert.equal(ctx.appData.compromisos[0].valor, 90000);
  assert.equal(ctx.appData.compromisos[0].dia, 20);
  assert.equal(ctx.appData.compromisos[0].recurringKey, 'rk-streaming');
  assert.equal(ctx.appData.compromisos[0].autoGenerado, true);
  assert.equal(typeof ctx.obtenerEventoHistorialIA(evt.id).revertedAt, 'string');
  assert.equal(typeof persistedAt, 'string');
});
