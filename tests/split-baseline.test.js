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
