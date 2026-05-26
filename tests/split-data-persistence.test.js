const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const DATA_JS = path.join(ROOT, 'app.data.js');

test('validatePrimaryData accepts only required array shape', () => {
  const ctx = loadFunctionsFromFile(DATA_JS, ['validatePrimaryData']);

  assert.equal(
    ctx.validatePrimaryData({ ingresosList: [], compromisos: [], lineaTiempoGuardada: [] }),
    true
  );

  assert.equal(ctx.validatePrimaryData(null), false);
  assert.equal(ctx.validatePrimaryData({ ingresosList: [], compromisos: [] }), false);
  assert.equal(
    ctx.validatePrimaryData({ ingresosList: {}, compromisos: [], lineaTiempoGuardada: [] }),
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
  const ctx = loadFunctionsFromFile(DATA_JS, ['validateBackupPayload']);

  assert.equal(
    ctx.validateBackupPayload({ ingresosList: [], compromisos: [], lineaTiempoGuardada: [] }),
    true
  );

  assert.equal(
    ctx.validateBackupPayload({ ingresosList: [], compromisos: [], lineaTiempoGuardada: null }),
    false
  );
  assert.equal(ctx.validateBackupPayload({}), false);
});

test('buildBackupPayload uses app data and schema version from current state', () => {
  const fakeAppData = { schemaVersion: 9, ingresosList: [], compromisos: [], lineaTiempoGuardada: [] };

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
