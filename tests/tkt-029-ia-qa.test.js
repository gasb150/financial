const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

test('obtenerEstadoRebalanceo inicializa estado consistente para semana/quincena', () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['obtenerEstadoRebalanceo'], {
    iaPanelState: {}
  });

  const semana = ctx.obtenerEstadoRebalanceo('semana');
  const quincena = ctx.obtenerEstadoRebalanceo('quincena');

  assert.equal(semana.stateKey, 'rebalanceSemana');
  assert.equal(quincena.stateKey, 'rebalanceQuincena');
  assert.equal(semana.state.error, false);
  assert.equal(Array.isArray(semana.state.actions), true);
  assert.equal(semana.state.actions.length, 0);
  assert.equal(quincena.state.error, false);
  assert.equal(Array.isArray(quincena.state.actions), true);
  assert.equal(quincena.state.actions.length, 0);
});

test('renderAccionesRebalanceoIA muestra CTA aplicar/deshacer segun estado', () => {
  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    ['obtenerEstadoRebalanceo', 'construirTextoImpactoRebalanceo', 'renderAccionesRebalanceoIA'],
    {
      iaPanelState: {
        rebalanceSemana: {
          loading: false,
          error: false,
          result: '',
          actions: [
            { itemId: 1, accion: 'mover_tramo', tramoDestino: 'q2', applied: false, motivo: 'Mover flujo' },
            { itemId: 2, accion: 'mover_tramo', tramoDestino: 'q1', applied: true, motivo: 'Balancear cierre' }
          ]
        }
      },
      getCompromisosMesActual: () => [
        { id: 1, nombre: 'Mercado' },
        { id: 2, nombre: 'Transporte' }
      ],
      simularMovimientoEntreTramos: (_scope, itemId) => ({
        origen: { codigo: itemId === 1 ? 'Q1' : 'Q2', antes: -100000, despues: -20000 },
        destino: { codigo: itemId === 1 ? 'Q2' : 'Q1', antes: 50000, despues: -30000 }
      }),
      formatCOP: (n) => `$${n}`,
      escapeHTML: (s) => String(s)
    }
  );

  const html = ctx.renderAccionesRebalanceoIA('semana');
  assert.match(html, /Aplicar/);
  assert.match(html, /Deshacer cambio/);
  assert.match(html, /Mercado/);
  assert.match(html, /Transporte/);
});

test('aplicarAccionRebalanceoIA marca error cuando accion no es mover_tramo', () => {
  let initCalls = 0;
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['obtenerEstadoRebalanceo', 'aplicarAccionRebalanceoIA'], {
    iaPanelState: {
      rebalanceSemana: {
        loading: false,
        error: false,
        result: '',
        actions: [{ itemId: 7, accion: 'reducir', applied: false }]
      }
    },
    appData: { compromisos: [] },
    mesActivoGlobal: 'Mayo 2026',
    initApp: () => { initCalls += 1; }
  });

  ctx.aplicarAccionRebalanceoIA('semana', 0);

  assert.equal(ctx.iaPanelState.rebalanceSemana.error, true);
  assert.match(ctx.iaPanelState.rebalanceSemana.result, /no es valida para aplicar/i);
  assert.equal(initCalls, 1);
});

test('deshacerAccionRebalanceoIA marca error cuando no hay cambio aplicado', () => {
  let initCalls = 0;
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['obtenerEstadoRebalanceo', 'deshacerAccionRebalanceoIA'], {
    iaPanelState: {
      rebalanceSemana: {
        loading: false,
        error: false,
        result: '',
        actions: [{ itemId: 99, accion: 'mover_tramo', applied: false }]
      }
    },
    appData: { compromisos: [] },
    initApp: () => { initCalls += 1; }
  });

  ctx.deshacerAccionRebalanceoIA('semana', 0);

  assert.equal(ctx.iaPanelState.rebalanceSemana.error, true);
  assert.match(ctx.iaPanelState.rebalanceSemana.result, /no hay un cambio/i);
  assert.equal(initCalls, 1);
});

test('analizarRebalanceoIA limpia estado cuando no hay deficit en el scope', async () => {
  let renderSemanaCalls = 0;
  let renderSemanalCalls = 0;
  let renderQuincenaCalls = 0;
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['analizarRebalanceoIA'], {
    iaPanelState: {
      rebalanceSemana: { loading: true, error: true, result: 'stale', actions: [{ itemId: 1 }] }
    },
    obtenerResumenTramos: () => [{ saldoCierre: 20000 }, { saldoCierre: 0 }],
    obtenerCompromisosMovibles: () => [],
    getCompromisosMesActual: () => [],
    renderSemanaActiva: () => { renderSemanaCalls += 1; },
    renderIAPanelSemanal: () => { renderSemanalCalls += 1; },
    renderIAPanelQuincena: () => { renderQuincenaCalls += 1; }
  });

  await ctx.analizarRebalanceoIA('semana');

  assert.deepEqual(ctx.iaPanelState.rebalanceSemana, {
    loading: false,
    error: false,
    result: '',
    actions: []
  });
  assert.equal(renderSemanaCalls, 1);
  assert.equal(renderSemanalCalls, 1);
  assert.equal(renderQuincenaCalls, 1);
});

test('analizarRebalanceoIA reporta falta de capacidad cuando hay deficit sin superavit', async () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['analizarRebalanceoIA'], {
    iaPanelState: {},
    obtenerResumenTramos: () => [{ saldoCierre: -90000 }, { saldoCierre: 0 }],
    obtenerCompromisosMovibles: () => [{ id: 4 }],
    getCompromisosMesActual: () => [],
    renderSemanaActiva: () => {},
    renderIAPanelSemanal: () => {},
    renderIAPanelQuincena: () => {}
  });

  await ctx.analizarRebalanceoIA('semana');

  assert.equal(ctx.iaPanelState.rebalanceSemana.error, false);
  assert.equal(Array.isArray(ctx.iaPanelState.rebalanceSemana.actions), true);
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions.length, 0);
  assert.match(ctx.iaPanelState.rebalanceSemana.result, /no hay tramos con capacidad/i);
});

test('analizarRebalanceoIA conserva resultado sin acciones cuando no hay sugerencia estructurada valida', async () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['analizarRebalanceoIA'], {
    iaPanelState: {},
    obtenerResumenTramos: () => [{ saldoCierre: -30000 }, { saldoCierre: 50000 }],
    obtenerCompromisosMovibles: () => [{ id: 8, nombre: 'Internet' }],
    getCompromisosMesActual: () => [],
    construirPromptRebalanceoTramos: () => 'prompt',
    ejecutarConsultaIA: async () => ({ message: 'Mover un item' }),
    construirEscenarioBaseRebalanceo: () => ({ item: { id: 8, nombre: 'Internet' }, destino: { id: 'q2' } }),
    formatearEscenarioBase: () => 'Escenario base',
    normalizarAccionIAUnificada: () => null,
    renderSemanaActiva: () => {},
    renderIAPanelSemanal: () => {},
    renderIAPanelQuincena: () => {}
  });

  await ctx.analizarRebalanceoIA('semana');

  assert.equal(ctx.iaPanelState.rebalanceSemana.error, false);
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions.length, 0);
  assert.match(ctx.iaPanelState.rebalanceSemana.result, /Escenario base/);
  assert.match(ctx.iaPanelState.rebalanceSemana.result, /Sugerencias IA:\nMover un item/);
});

test('analizarRebalanceoIA genera accion aplicable cuando hay sugerencia valida', async () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['analizarRebalanceoIA'], {
    iaPanelState: {},
    obtenerResumenTramos: () => [{ saldoCierre: -10000 }, { saldoCierre: 20000 }],
    obtenerCompromisosMovibles: () => [{ id: 5, nombre: 'Mercado' }],
    getCompromisosMesActual: () => [],
    construirPromptRebalanceoTramos: () => 'prompt',
    ejecutarConsultaIA: async () => ({ message: 'Sugerido mover Mercado a Q2' }),
    construirEscenarioBaseRebalanceo: () => ({ item: { id: 5, nombre: 'Mercado' }, destino: { id: 'q2' } }),
    formatearEscenarioBase: () => 'Escenario optimizado',
    normalizarAccionIAUnificada: () => ({ itemId: 5, accion: 'mover_tramo', tramoDestino: 'q2' }),
    renderSemanaActiva: () => {},
    renderIAPanelSemanal: () => {},
    renderIAPanelQuincena: () => {}
  });

  await ctx.analizarRebalanceoIA('semana');

  assert.equal(ctx.iaPanelState.rebalanceSemana.error, false);
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions.length, 1);
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions[0].itemId, 5);
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions[0].scope, 'semana');
  assert.equal(ctx.iaPanelState.rebalanceSemana.actions[0].nombre, 'Mercado');
});
