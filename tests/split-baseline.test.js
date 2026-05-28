const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');

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
    renderDriveSyncStatus: () => {},
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

test('evaluarPlanSyncDrive bloquea push cuando remoto va adelante y checksum difiere', () => {
  const ctx = loadFunctionsFromFile(APP_JS, ['evaluarPlanSyncDrive']);

  const ahead = ctx.evaluarPlanSyncDrive({
    remoteVersion: 5,
    remoteChecksum: 'remote-abc',
    localChecksum: 'local-def',
    lastKnownRemoteVersion: 4
  });
  assert.equal(ahead.needsPull, true);
  assert.equal(ahead.pushAllowed, false);
  assert.equal(ahead.reason, 'remote-ahead');

  const sameChecksum = ctx.evaluarPlanSyncDrive({
    remoteVersion: 5,
    remoteChecksum: 'same',
    localChecksum: 'same',
    lastKnownRemoteVersion: 1
  });
  assert.equal(sameChecksum.needsPull, false);
  assert.equal(sameChecksum.pushAllowed, true);
  assert.equal(sameChecksum.reason, 'ok');
});

test('restauracion cifrada de Drive recupera payload original con passphrase', async () => {
  const payloadOriginal = {
    schemaVersion: 5,
    compromisos: [{ id: 1, nombre: 'Prueba', valor: 12345, dia: 7 }],
    ingresosList: [{ id: 9, nombre: 'Ingreso', valor: 999999, dia: 1 }]
  };

  const ctx = loadFunctionsFromFile(
    APP_JS,
    [
      'bytesToBase64',
      'base64ToBytes',
      'deriveDriveSyncAesKey',
      'encryptDriveSyncData',
      'decryptDriveSyncData',
      'resolveDriveEnvelopeData'
    ],
    {
      DRIVE_SYNC_KDF_ITERATIONS: 120000,
      TextEncoder,
      TextDecoder,
      Uint8Array,
      crypto: webcrypto,
      window: { crypto: webcrypto },
      btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
      atob: (value) => Buffer.from(value, 'base64').toString('binary'),
      getDriveSyncPassphrase: () => 'clave-secreta-123',
      prompt: () => ''
    }
  );

  const encrypted = await ctx.encryptDriveSyncData(payloadOriginal, 'clave-secreta-123');
  const remoteEnvelope = {
    encryption: encrypted.encryption,
    ciphertext: encrypted.ciphertext
  };

  const restaurado = await ctx.resolveDriveEnvelopeData(remoteEnvelope);
  assert.deepEqual(restaurado, payloadOriginal);
});

test('snapshot replicado de Drive excluye metadata volatile de driveSync', async () => {
  const ctx = loadFunctionsFromFile(
    APP_JS,
    [
      'sanitizarSnapshotReplicadoDriveSync',
      'generarChecksumSnapshotDriveSync'
    ],
    {
      clonarJSONSeguro: (data) => JSON.parse(JSON.stringify(data)),
      generarChecksumPayload: async (data) => JSON.stringify(data)
    }
  );

  const base = {
    schemaVersion: 5,
    ingresosList: [{ id: 1, valor: 1000 }],
    driveSync: {
      localDeviceId: 'device-a',
      syncInProgress: true,
      lastSyncAt: '2026-05-28T00:00:00.000Z',
      syncEvents: [{ id: 'evt-1' }]
    }
  };
  const changedMetadata = {
    ...base,
    driveSync: {
      localDeviceId: 'device-b',
      syncInProgress: false,
      lastSyncAt: '2026-05-29T00:00:00.000Z',
      syncEvents: [{ id: 'evt-2' }]
    }
  };

  const sanitized = ctx.sanitizarSnapshotReplicadoDriveSync(base);
  const checksumA = await ctx.generarChecksumSnapshotDriveSync(base);
  const checksumB = await ctx.generarChecksumSnapshotDriveSync(changedMetadata);

  assert.equal('driveSync' in sanitized, false);
  assert.equal(checksumA, checksumB);
});

test('validarChecksumEnvelopeDriveSync rechaza checksum remoto alterado', async () => {
  const ctx = loadFunctionsFromFile(APP_JS, ['validarChecksumEnvelopeDriveSync'], {
    generarChecksumPayload: async (data) => JSON.stringify(data)
  });

  await assert.rejects(
    () => ctx.validarChecksumEnvelopeDriveSync(
      { checksum: '{"schemaVersion":5,"ok":false}' },
      { schemaVersion: 5, ok: true }
    ),
    /checksum del snapshot remoto de Drive/
  );
});

test('construirAlertasVencimientoDeudas clasifica vencidos y proximos del mes activo', () => {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const now = new Date();
  const today = now.getDate();
  const activeMonthKey = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const overdueDay = Math.max(1, today - 1);
  const dueSoonDay1 = today;
  const dueSoonDay2 = Math.min(31, today + 2);
  const farDay = Math.min(31, today + 8);

  const ctx = loadFunctionsFromFile(APP_JS, ['obtenerMesKeyActualSistema', 'construirAlertasVencimientoDeudas'], {
    ORDEN_MESES: monthNames,
    mesActivoGlobal: activeMonthKey
  });

  const alertas = ctx.construirAlertasVencimientoDeudas([
    { id: 1, nombre: 'Agua', dia: overdueDay, pagado: false },
    { id: 2, nombre: 'Luz', dia: dueSoonDay1, pagado: false },
    { id: 3, nombre: 'Internet', dia: dueSoonDay2, pagado: false },
    { id: 4, nombre: 'Credito', dia: farDay, pagado: false },
    { id: 5, nombre: 'Pagado', dia: dueSoonDay1, pagado: true }
  ], 3);

  let expectedOverdue = overdueDay < today ? 1 : 0;
  let expectedSoon = [overdueDay, dueSoonDay1, dueSoonDay2, farDay]
    .filter((day) => day >= today && day <= today + 3)
    .length;
  assert.equal(alertas.vencidos.length, expectedOverdue);
  assert.equal(alertas.proximos.length, expectedSoon);
  assert.equal(alertas.proximos.some((c) => c.nombre === 'Luz'), true);
  assert.equal(alertas.proximos.some((c) => c.nombre === 'Internet'), true);
});
