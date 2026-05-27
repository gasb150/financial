const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'app.data.js');

test('validatePrimaryData accepts only required array shape', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, [
    'isFiniteNumber',
    'isNonEmptyString',
    'normalizeIAConfig',
    'isValidIngreso',
    'isValidCompromiso',
    'isValidPrima',
    'isValidHistoryEntry',
    'validatePrimaryData'
  ]);

  assert.equal(
    ctx.validatePrimaryData({
      ingresosList: [{ nombre: 'Salario', valor: 1000 }],
      compromisos: [{ nombre: 'Arriendo', valor: 500, dia: 5, mesKey: 'Mayo 2026' }],
      lineaTiempoGuardada: ['Mayo 2026']
    }),
    true
  );

  assert.equal(ctx.validatePrimaryData(null), false);
  assert.equal(ctx.validatePrimaryData({ ingresosList: [], compromisos: [] }), false);
  assert.equal(
    ctx.validatePrimaryData({ ingresosList: {}, compromisos: [], lineaTiempoGuardada: [] }),
    false
  );

  assert.equal(
    ctx.validatePrimaryData({
      ingresosList: [{ nombre: '', valor: 1000 }],
      compromisos: [{ nombre: 'Arriendo', valor: 500, dia: 5, mesKey: 'Mayo 2026' }],
      lineaTiempoGuardada: ['Mayo 2026']
    }),
    false
  );
});

test('hashFallbackHex is deterministic and returns fixed-length hash', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, ['hashFallbackHex']);

  const a = ctx.hashFallbackHex('abc');
  const b = ctx.hashFallbackHex('abc');
  const c = ctx.hashFallbackHex('abcd');

  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 16);
});

test('validateBackupPayload enforces required backup structure', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, [
    'isFiniteNumber',
    'isNonEmptyString',
    'normalizeIAConfig',
    'isValidIngreso',
    'isValidCompromiso',
    'isValidPrima',
    'isValidHistoryEntry',
    'validatePrimaryData',
    'validateBackupPayload'
  ]);

  assert.equal(
    ctx.validateBackupPayload({
      ingresosList: [{ nombre: 'Salario', valor: 1000 }],
      compromisos: [{ nombre: 'Arriendo', valor: 500, dia: 5, mesKey: 'Mayo 2026' }],
      lineaTiempoGuardada: ['Mayo 2026']
    }),
    true
  );

  assert.equal(
    ctx.validateBackupPayload({ ingresosList: [], compromisos: [], lineaTiempoGuardada: null }),
    false
  );
  assert.equal(ctx.validateBackupPayload({}), false);
});

test('buildBackupPayload uses app data and schema version from current state', () => {
  const fakeAppData = {
    schemaVersion: 9,
    ingresosList: [{ nombre: 'Salario', valor: 1000 }],
    compromisos: [{ nombre: 'Arriendo', valor: 500, dia: 5, mesKey: 'Mayo 2026' }],
    lineaTiempoGuardada: ['Mayo 2026'],
    iaHistory: []
  };

  const ctx = loadFunctionsFromFile(DATA_JS, ['buildBackupPayload'], {
    appData: fakeAppData,
    APP_SCHEMA_VERSION: 2
  });

  const payload = ctx.buildBackupPayload();

  assert.equal(payload.version, 1);
  assert.equal(payload.dataSchemaVersion, 9);
  assert.equal(payload.data, fakeAppData);
  assert.equal(typeof payload.savedAt, 'string');
  assert.equal(payload.checksum, '');
});

test('sanitizePrimaryData recovers valid blocks from malformed payload', () => {
  const defaults = {
    ingresosList: [],
    primasList: [],
    compromisos: [],
    iaHistory: [],
    lineaTiempoGuardada: ['Mayo 2026'],
    iaConfig: {
      mode: 'off',
      providerLocalEndpoint: 'http://localhost:11434/api/generate',
      providerLocalModel: 'llama3.1:8b',
      timeoutMs: 45000,
      retries: 1,
      updatedAt: null
    }
  };

  const ctx = loadFunctionsFromFile(DATA_JS, [
    'isFiniteNumber',
    'isNonEmptyString',
    'normalizeIAConfig',
    'isValidIngreso',
    'isValidCompromiso',
    'isValidPrima',
    'isValidHistoryEntry',
    'sanitizePrimaryData',
    'validatePrimaryData'
  ], {
    datosDefault: defaults,
    APP_SCHEMA_VERSION: 3
  });

  const sane = ctx.sanitizePrimaryData({
    ingresosList: [{ nombre: 'Salario', valor: 2000 }, { nombre: '', valor: 10 }],
    compromisos: [{ nombre: 'Arriendo', valor: 900, dia: 5, mesKey: 'Mayo 2026' }, { dia: 40 }],
    lineaTiempoGuardada: ['Mayo 2026', ''],
    iaHistory: [{ id: 'ok', at: '2026-05-26T00:00:00.000Z', source: 'ia', actionType: 'reducir', status: 'applied' }, { id: '' }],
    iaConfig: { mode: 'LOCAL', timeoutMs: 5, retries: 99 }
  });

  assert.equal(ctx.validatePrimaryData(sane), true);
  assert.equal(sane.ingresosList.length, 1);
  assert.equal(sane.compromisos.length, 1);
  assert.equal(sane.lineaTiempoGuardada.length, 1);
  assert.equal(sane.iaHistory.length, 1);
  assert.equal(sane.iaConfig.mode, 'local');
  assert.equal(sane.iaConfig.timeoutMs, 10000);
  assert.equal(sane.iaConfig.retries, 4);
});
