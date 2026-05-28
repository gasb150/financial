const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'app.data.js');

test('validatePrimaryData accepts only required array shape', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, [
    'toSafeInt',
    'isFiniteNumber',
    'sanitizeIngresoItem',
    'sanitizePrimaItem',
    'sanitizeCompromisoItem',
    'sanitizeIAConfig',
    'sanitizeIAUsage',
    'sanitizePrimaryData',
    'validateCoreDataShape',
    'validatePrimaryData'
  ], {
    APP_SCHEMA_VERSION: 2
  });

  assert.equal(
    ctx.validatePrimaryData({ ingresosList: [], primasList: [], compromisos: [], lineaTiempoGuardada: ['Junio 2026'] }),
    true
  );

  assert.equal(ctx.validatePrimaryData(null), false);
  assert.equal(ctx.validatePrimaryData({ ingresosList: [], primasList: [], compromisos: [] }), false);
  assert.equal(
    ctx.validatePrimaryData({ ingresosList: {}, primasList: [], compromisos: [], lineaTiempoGuardada: ['Junio 2026'] }),
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
    'toSafeInt',
    'isFiniteNumber',
    'sanitizeIngresoItem',
    'sanitizePrimaItem',
    'sanitizeCompromisoItem',
    'sanitizeIAConfig',
    'sanitizeIAUsage',
    'sanitizePrimaryData',
    'validateCoreDataShape',
    'validateBackupPayload'
  ], {
    APP_SCHEMA_VERSION: 2
  });

  assert.equal(
    ctx.validateBackupPayload({ ingresosList: [], primasList: [], compromisos: [], lineaTiempoGuardada: ['Junio 2026'] }),
    true
  );

  assert.equal(
    ctx.validateBackupPayload({ ingresosList: [], primasList: [], compromisos: [], lineaTiempoGuardada: null }),
    false
  );
  assert.equal(
    ctx.validateBackupPayload({ data: { ingresosList: [], primasList: [], compromisos: [], lineaTiempoGuardada: ['Junio 2026'] } }),
    true
  );
  assert.equal(ctx.validateBackupPayload({}), false);
});

test('sanitizePrimaryData supports partial recovery in non-strict mode', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, [
    'toSafeInt',
    'isFiniteNumber',
    'sanitizeIngresoItem',
    'sanitizePrimaItem',
    'sanitizeCompromisoItem',
    'sanitizeIAConfig',
    'sanitizeIAUsage',
    'sanitizePrimaryData'
  ], {
    APP_SCHEMA_VERSION: 2
  });

  const recovered = ctx.sanitizePrimaryData({
    ingresosList: [{ id: 1, nombre: 'Salario', valor: 1000000, periodo: 'q1', diaPago: 30, mesInicio: 'Junio 2026' }, { broken: true }],
    compromisos: [{ id: 2, nombre: 'Arriendo', valor: 700000, dia: 5, tipo: 'fijo', mesKey: 'Junio 2026' }],
    lineaTiempoGuardada: ['Junio 2026']
  }, { strict: false });

  assert.equal(Array.isArray(recovered.ingresosList), true);
  assert.equal(recovered.ingresosList.length, 1);
  assert.equal(recovered.compromisos.length, 1);
});

test('buildBackupPayload uses app data and schema version from current state', () => {
  const fakeAppData = { schemaVersion: 9, ingresosList: [], primasList: [], compromisos: [], lineaTiempoGuardada: ['Junio 2026'] };

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
