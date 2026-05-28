const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');
const APP_RULES_JS = path.join(ROOT, 'app.rules.js');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

test('parseMontoInput soporta formatos comunes y casos invalidos', () => {
  const ctx = loadFunctionsFromFile(APP_JS, ['parseMontoInput']);
  assert.equal(ctx.parseMontoInput('$ 1.234.567'), 1234567);
  assert.equal(ctx.parseMontoInput('12,5'), 12.5);
  assert.equal(ctx.parseMontoInput('200000'), 200000);
  assert.ok(Number.isNaN(ctx.parseMontoInput('')));
  assert.ok(Number.isNaN(ctx.parseMontoInput('-')));
});

test('parseMesKey y utilidades de mes calculan indice y suma de meses', () => {
  const ctx = loadFunctionsFromFile(
    APP_RULES_JS,
    ['parseMesKeySafe', 'mesKeyToNumericIndex', 'numericIndexToMesKey', 'addMonthsToMesKey'],
    {
      ORDEN_MESES: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ]
    }
  );

  const parsed = ctx.parseMesKeySafe('Mayo 2026');
  assert.equal(parsed.mes, 'Mayo');
  assert.equal(parsed.anio, 2026);

  const idx = ctx.mesKeyToNumericIndex('Mayo 2026');
  assert.equal(ctx.numericIndexToMesKey(idx), 'Mayo 2026');
  assert.equal(ctx.addMonthsToMesKey('Diciembre 2026', 1), 'Enero 2027');
});

test('calcularBalanceSemanal usa ingresos por dias y pre-mes en semana 1', () => {
  const ctx = loadFunctionsFromFile(APP_RULES_JS, ['calculateWeeklyBalance'], {
    mesActivoGlobal: 'Mayo 2026',
    getIncomeEventsForMonth: () => [
      { dia: 1, valor: 1000 },
      { dia: 3, valor: 500 },
      { dia: 7, valor: 300 }
    ]
  });

  const semana1 = { id: 'sem-1', dias: [1, 2, 3] };
  const compromisos = [
    { dia: -1, valor: 200 },
    { dia: 2, valor: 300 },
    { dia: 10, valor: 999 }
  ];

  const out = ctx.calculateWeeklyBalance(compromisos, semana1);
  assert.equal(out.ingresosSemana, 1500);
  assert.equal(out.gastosSemana, 500);
  assert.equal(out.balanceSemana, 1000);
  assert.equal(out.ingresosEventos.length, 3);
});

test('calcularResumenBalanceQuincena integra Pre-Mes en Q1 y arrastra saldo a Q2', () => {
  const ctx = loadFunctionsFromFile(APP_JS, ['calcularResumenBalanceQuincena']);

  const eventos = [
    { dia: 1, valor: 1000 },
    { dia: 14, valor: 500 },
    { dia: 20, valor: 1200 }
  ];
  const compromisos = [
    { dia: -1, valor: 300 },
    { dia: 10, valor: 700 },
    { dia: 22, valor: 800 }
  ];

  const out = ctx.calcularResumenBalanceQuincena(eventos, compromisos);
  assert.equal(out.preComps.length, 1);
  assert.equal(out.q1Comps.length, 1);
  assert.equal(out.q2Comps.length, 1);
  assert.equal(out.tramos[0].ingresos, 1500);
  assert.equal(out.tramos[0].gastosPreMes, 300);
  assert.equal(out.tramos[0].gastosNativos, 700);
  assert.equal(out.tramos[0].gastos, 1000);
  assert.equal(out.tramos[0].saldoCierre, 500);
  assert.equal(out.tramos[1].saldoInicial, 500);
  assert.equal(out.tramos[1].saldoCierre, 900);
});

test('normalizarAccionIAUnificada valida contrato y normaliza payload', () => {
  const baseCtx = loadFunctionsFromFile(APP_JS, ['parseMontoInput'], {
    IA_ACTION_SCHEMA_VERSION: 1,
    IA_ACTION_TYPES: ['reducir', 'posponer', 'mover_tramo']
  });

  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    [
      'normalizarAccionRecorte',
      'normalizarRiesgoRecorte',
      'normalizarPrioridadRecorte',
      'normalizarTramoDestinoRecorte',
      'normalizarAccionIAUnificada'
    ],
    baseCtx
  );

  const normalizada = ctx.normalizarAccionIAUnificada(
    {
      source: 'recorte',
      itemId: '42',
      accion: 'Reducir',
      ahorroEstimado: '$ 25.000',
      riesgo: 'ALTO',
      prioridad: 'alta',
      nuevoValor: '100000',
      motivo: 'Prueba',
      applied: false
    },
    { source: 'recorte', allowedItemIds: [42, 99] }
  );

  assert.equal(normalizada.schemaVersion, 1);
  assert.equal(normalizada.itemId, 42);
  assert.equal(normalizada.accion, 'reducir');
  assert.equal(normalizada.ahorroEstimado, 25000);
  assert.equal(normalizada.riesgo, 'alto');
  assert.equal(normalizada.prioridad, 'alta');
  assert.equal(normalizada.nuevoValor, 100000);

  const bloqueada = ctx.normalizarAccionIAUnificada(
    { itemId: 777, accion: 'reducir', ahorroEstimado: 0 },
    { allowedItemIds: [42] }
  );
  assert.equal(bloqueada, null);
});

test('extraerJSONDeTextoIA recupera JSON con o sin markdown fences', () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['extraerJSONDeTextoIA']);

  const directo = ctx.extraerJSONDeTextoIA('{"ok":true}');
  assert.deepEqual(directo, { ok: true });

  const conFences = ctx.extraerJSONDeTextoIA('```json\n{"sugerencias":[{"itemId":1}]}\n```');
  assert.deepEqual(conFences, { sugerencias: [{ itemId: 1 }] });

  const invalido = ctx.extraerJSONDeTextoIA('sin json');
  assert.equal(invalido, null);
});

test('renderConfigIA no rehidrata la API key en el input', () => {
  const nodes = {
    'ia-mode-selector': { value: '' },
    'ia-mode-help': { innerText: '' },
    'ia-api-key': { value: 'visible-secret' },
    'ia-api-endpoint': { value: '' },
    'ia-api-provider': { value: '' },
    'ia-api-model': { value: '' },
    'ia-api-daily-tokens': { value: '' },
    'ia-api-monthly-tokens': { value: '' },
    'ia-api-daily-cop': { value: '' },
    'ia-api-monthly-cop': { value: '' },
    'ia-api-cost-1k': { value: '' }
  };
  let consumoRenderCalls = 0;

  const ctx = loadFunctionsFromFile(APP_JS, ['renderConfigIA'], {
    document: {
      getElementById: (id) => nodes[id] || null
    },
    getModoIA: () => 'api',
    textoModoIA: () => 'Modo API',
    getConfigIALocal: () => ({
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3.1:8b',
      timeoutMs: 45000,
      retries: 1
    }),
    getConfigIAApi: () => ({
      endpoint: 'https://gateway.example.test',
      provider: 'generic',
      model: 'gpt-4.1-mini',
      apiKey: 'secret-runtime-key',
      limits: {
        dailyTokenLimit: 80000,
        monthlyTokenLimit: 1200000,
        dailyCopLimit: 20000,
        monthlyCopLimit: 200000,
        estimatedCopPer1kTokens: 40
      }
    }),
    renderGoogleAuthConfig: () => {},
    renderPanelConsumoIA: () => { consumoRenderCalls += 1; }
  });

  ctx.renderConfigIA();

  assert.equal(nodes['ia-mode-selector'].value, 'api');
  assert.equal(nodes['ia-mode-help'].innerText, 'Modo API');
  assert.equal(nodes['ia-api-key'].value, '');
  assert.equal(nodes['ia-api-endpoint'].value, 'https://gateway.example.test');
  assert.equal(nodes['ia-api-model'].value, 'gpt-4.1-mini');
  assert.equal(consumoRenderCalls, 1);
});
