const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');
const APP_JS = path.join(ROOT, 'app.js');

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

test('renderBalanceQuincena muestra CTA de rebalanceo en deficit y modo preventivo sin deficit', () => {
  const container = { innerHTML: '' };
  const baseSandbox = {
    document: {
      getElementById: (id) => id === 'balance-quincena-bloque' ? container : null
    },
    mesActivoGlobal: 'Mayo 2026',
    obtenerEventosIngresoDelMes: () => [],
    iaPanelState: { rebalanceQuincena: { loading: false, error: false, result: '' } },
    escapeHTML: (s) => String(s),
    formatCOP: (n) => `$${n}`,
    renderAccionesRebalanceoIA: () => ''
  };

  const ctxConDeficit = loadFunctionsFromFile(APP_JS, ['renderBalanceQuincena'], {
    ...baseSandbox,
    calcularResumenBalanceQuincena: () => ({
      tramos: [
        { id: 'q1', nombre: 'Q1', saldoCierre: -1000, saldoInicial: 0, ingresos: 100, gastos: 1100, neto: -1000, gastosPreMes: 0, gastosNativos: 1100 },
        { id: 'q2', nombre: 'Q2', saldoCierre: 0, saldoInicial: -1000, ingresos: 1000, gastos: 0, neto: 1000, gastosPreMes: 0, gastosNativos: 0 }
      ]
    })
  });

  ctxConDeficit.renderBalanceQuincena([]);
  assert.match(container.innerHTML, /data-action="rebalance-quincena-from-balance"/);

  const ctxSinDeficit = loadFunctionsFromFile(APP_JS, ['renderBalanceQuincena'], {
    ...baseSandbox,
    calcularResumenBalanceQuincena: () => ({
      tramos: [
        { id: 'q1', nombre: 'Q1', saldoCierre: 1000, saldoInicial: 0, ingresos: 1500, gastos: 500, neto: 1000, gastosPreMes: 0, gastosNativos: 500 },
        { id: 'q2', nombre: 'Q2', saldoCierre: 1400, saldoInicial: 1000, ingresos: 400, gastos: 0, neto: 400, gastosPreMes: 0, gastosNativos: 0 }
      ]
    })
  });

  ctxSinDeficit.renderBalanceQuincena([]);
  assert.match(container.innerHTML, /data-action="rebalance-quincena-from-balance"/);
  assert.match(container.innerHTML, /Sin deficit en quincena/);
});
