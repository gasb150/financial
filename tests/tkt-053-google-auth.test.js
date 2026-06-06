const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');

test('isGoogleOAuthSessionActive validates token expiry window', () => {
  const now = Date.now();
  const ctx = loadFunctionsFromFile(APP_JS, ['getGoogleOAuthSession', 'isGoogleOAuthSessionActive'], {
    googleOAuthAccessTokenRuntime: '',
    appData: {
      googleAuth: {
        session: {
          accessToken: 'token-ok',
          expiresAtMs: now + 120000
        }
      }
    },
    Date: { now: () => now }
  });

  assert.equal(ctx.isGoogleOAuthSessionActive(), true);

  ctx.appData.googleAuth.session.expiresAtMs = now + 5000;
  assert.equal(ctx.isGoogleOAuthSessionActive(), false);

  ctx.appData.googleAuth.session = null;
  assert.equal(ctx.isGoogleOAuthSessionActive(), false);
});

test('renderGoogleAuthConfig shows active session and clears error when empty', () => {
  const nodes = {
    'google-oauth-client-id': { value: '' },
    'google-oauth-redirect': { value: '' },
    'google-auth-status': { innerText: '' },
    'google-auth-error': { innerText: '' }
  };

  const now = Date.now();
  const ctx = loadFunctionsFromFile(APP_JS, [
    'getGoogleOAuthConfig',
    'getGoogleOAuthRedirectUri',
    'getGoogleOAuthSession',
    'isGoogleOAuthSessionActive',
    'renderGoogleAuthConfig'
  ], {
    googleOAuthAccessTokenRuntime: '',
    appData: {
      googleAuth: {
        provider: 'google',
        clientId: 'abc.apps.googleusercontent.com',
        scope: 'openid profile email',
        lastError: '',
        session: {
          accessToken: 'token',
          expiresAtMs: now + 300000,
          user: { email: 'demo@example.com' }
        }
      }
    },
    window: {
      location: {
        origin: 'https://demo.test',
        pathname: '/index.html'
      }
    },
    document: {
      getElementById: (id) => nodes[id] || null
    },
    Date: class extends Date {
      static now() { return now; }
    },
    GOOGLE_OAUTH_DEFAULT_SCOPE: 'openid profile email https://www.googleapis.com/auth/drive.appdata'
  });

  ctx.renderGoogleAuthConfig();

  assert.equal(nodes['google-oauth-client-id'].value, 'abc.apps.googleusercontent.com');
  assert.equal(nodes['google-oauth-redirect'].value, 'https://demo.test/index.html');
  assert.match(nodes['google-auth-status'].innerText, /Sesión activa/);
  assert.match(nodes['google-auth-status'].innerText, /demo@example.com/);
  assert.equal(nodes['google-auth-error'].innerText, '');
});

test('renderDriveSyncStatus includes the last Drive account email when available', () => {
  const nodes = {
    'drive-sync-status': { innerText: '' },
    'drive-sync-error': { innerText: '' }
  };

  const ctx = loadFunctionsFromFile(APP_JS, ['renderDriveSyncStatus'], {
    getDriveSyncState: () => ({
      syncInProgress: false,
      lastSyncAt: '2026-06-06T12:00:00.000Z',
      lastSyncEmail: 'demo@example.com',
      lastError: ''
    }),
    syncDriveEncryptionFlagFromUI: () => {},
    window: {
      FinancialI18n: {
        t: (key, vars) => {
          if(key === 'config.driveSyncLastOkWithEmail') return `Sincronizado con Drive (${vars.email}) · ${vars.date}`;
          return key;
        }
      }
    },
    document: {
      getElementById: (id) => nodes[id] || null
    }
  });

  ctx.renderDriveSyncStatus();

  assert.match(nodes['drive-sync-status'].innerText, /demo@example.com/);
  assert.match(nodes['drive-sync-status'].innerText, /Sincronizado con Drive/);
  assert.equal(nodes['drive-sync-error'].innerText, '');
});

test('force pull stores the Google account email used for Drive recovery', async () => {
  const now = Date.now();
  const appData = {
    googleAuth: {
      session: {
        accessToken: 'token-ok',
        scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
        expiresAtMs: now + 120000,
        user: { email: 'recovery@example.com' }
      }
    },
    driveSync: {
      fileId: null,
      syncInProgress: false,
      syncEvents: []
    }
  };

  const ctx = loadFunctionsFromFile(APP_JS, [
    'getGoogleOAuthSession',
    'getGoogleOAuthSessionEmail',
    'sincronizarDriveConGoogle'
  ], {
    appData,
    googleOAuthAccessTokenRuntime: '',
    driveSyncRuntimeInProgress: false,
    getDriveSyncState: () => appData.driveSync,
    syncDriveEncryptionFlagFromUI: () => {},
    appendDriveSyncEvent: (type, details = {}) => {
      appData.driveSync.syncEvents.push({ type, details });
    },
    setDriveSyncError: (message) => {
      appData.driveSync.lastError = message;
    },
    persistirDataPrincipalConFallback: () => {},
    persistirAuxiliaresConFallback: async () => {},
    renderDriveSyncStatus: () => {},
    asegurarSesionGoogleParaDrive: async () => {},
    findDriveSyncFile: async () => ({ id: 'drive-file-1' }),
    downloadDriveSyncEnvelope: async () => ({
      version: 3,
      checksum: 'remote-checksum',
      data: { schemaVersion: 5, ingresosList: [], compromisos: [], primasList: [] }
    }),
    resolverChecksumComparacionDriveSync: async () => 'remote-checksum',
    buildDriveSyncBackupPayload: () => ({ data: { schemaVersion: 5 }, checksum: 'local-checksum' }),
    asegurarChecksumPayload: async (payload) => payload.checksum,
    evaluarPlanSyncDrive: () => ({ needsPull: false, pushAllowed: true, reason: 'ok' }),
    resolveDriveEnvelopeData: async (envelope) => envelope.data,
    validarPayloadRespaldo: () => true,
    validarChecksumEnvelopeDriveSync: async () => 'remote-checksum',
    generarChecksumSnapshotDriveSync: async () => 'remote-checksum',
    aplicarMigracionesSchema: (data) => ({ ...data, driveSync: appData.driveSync }),
    normalizarEstadoCargado: () => {},
    initApp: () => {},
    Date: class extends Date {
      static now() { return now; }
    }
  });

  const result = await ctx.sincronizarDriveConGoogle({ forcePull: true });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'force-pulled');
  assert.equal(appData.driveSync.fileId, 'drive-file-1');
  assert.equal(appData.driveSync.lastSyncEmail, 'recovery@example.com');
  assert.equal(appData.driveSync.syncEvents.at(-1).details.email, 'recovery@example.com');
});

test('sincronizarDriveConGoogle ignores stale persisted syncInProgress when no runtime sync is active', async () => {
  const now = Date.now();
  const appData = {
    googleAuth: {
      session: {
        accessToken: 'token-ok',
        scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
        expiresAtMs: now + 120000,
        user: { email: 'sync@example.com' }
      }
    },
    driveSync: {
      fileId: null,
      syncInProgress: true,
      syncEvents: []
    }
  };

  const ctx = loadFunctionsFromFile(APP_JS, [
    'getGoogleOAuthSession',
    'getGoogleOAuthSessionEmail',
    'sincronizarDriveConGoogle'
  ], {
    appData,
    googleOAuthAccessTokenRuntime: '',
    driveSyncRuntimeInProgress: false,
    getDriveSyncState: () => appData.driveSync,
    syncDriveEncryptionFlagFromUI: () => {},
    appendDriveSyncEvent: (type, details = {}) => {
      appData.driveSync.syncEvents.push({ type, details });
    },
    setDriveSyncError: (message) => {
      appData.driveSync.lastError = message;
    },
    persistirDataPrincipalConFallback: () => {},
    persistirAuxiliaresConFallback: async () => {},
    renderDriveSyncStatus: () => {},
    asegurarSesionGoogleParaDrive: async () => {},
    findDriveSyncFile: async () => null,
    buildDriveSyncBackupPayload: () => ({ data: { schemaVersion: 5 }, checksum: 'local-checksum' }),
    asegurarChecksumPayload: async (payload) => payload.checksum,
    evaluarPlanSyncDrive: () => ({ needsPull: false, pushAllowed: true, reason: 'ok' }),
    buildDriveSyncEnvelope: async () => ({ version: 1, checksum: 'local-checksum', updatedAt: '2026-06-06T12:00:00.000Z' }),
    uploadDriveSyncEnvelope: async () => ({ id: 'drive-file-2' }),
    Date: class extends Date {
      static now() { return now; }
    }
  });

  const result = await ctx.sincronizarDriveConGoogle();

  assert.equal(result.ok, true);
  assert.equal(result.action, 'pushed');
  assert.equal(appData.driveSync.syncInProgress, false);
  assert.equal(appData.driveSync.fileId, 'drive-file-2');
  assert.equal(appData.driveSync.lastSyncEmail, 'sync@example.com');
});

test('sincronizarDriveConGoogle still blocks when a runtime sync is active', async () => {
  const appData = {
    driveSync: {
      syncInProgress: false,
      syncEvents: []
    }
  };

  const ctx = loadFunctionsFromFile(APP_JS, ['sincronizarDriveConGoogle'], {
    appData,
    driveSyncRuntimeInProgress: true,
    getDriveSyncState: () => appData.driveSync
  });

  const result = await ctx.sincronizarDriveConGoogle();

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'already-running');
});

test('sincronizarDriveConGoogle allows local changes when remote is unchanged during revalidation', async () => {
  const now = Date.now();
  let confirmCalls = 0;
  const appData = {
    googleAuth: {
      session: {
        accessToken: 'token-ok',
        scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
        expiresAtMs: now + 120000,
        user: { email: 'sync@example.com' }
      }
    },
    driveSync: {
      fileId: null,
      lastKnownRemoteVersion: 3,
      syncInProgress: false,
      syncEvents: []
    }
  };

  const ctx = loadFunctionsFromFile(APP_JS, [
    'getGoogleOAuthSession',
    'getGoogleOAuthSessionEmail',
    'sincronizarDriveConGoogle'
  ], {
    appData,
    googleOAuthAccessTokenRuntime: '',
    driveSyncRuntimeInProgress: false,
    getDriveSyncState: () => appData.driveSync,
    syncDriveEncryptionFlagFromUI: () => {},
    appendDriveSyncEvent: (type, details = {}) => {
      appData.driveSync.syncEvents.push({ type, details });
    },
    setDriveSyncError: (message) => {
      appData.driveSync.lastError = message;
    },
    persistirDataPrincipalConFallback: () => {},
    persistirAuxiliaresConFallback: async () => {},
    renderDriveSyncStatus: () => {},
    asegurarSesionGoogleParaDrive: async () => {},
    findDriveSyncFile: async () => ({ id: 'drive-file-3' }),
    downloadDriveSyncEnvelope: async () => ({
      version: 3,
      checksum: 'remote-checksum',
      data: { schemaVersion: 5, ingresosList: [{ id: 1, valor: 400000 }], compromisos: [], primasList: [] }
    }),
    resolverChecksumComparacionDriveSync: async () => 'remote-checksum',
    buildDriveSyncBackupPayload: () => ({
      data: { schemaVersion: 5, ingresosList: [{ id: 1, valor: 300000 }], compromisos: [], primasList: [] },
      checksum: 'local-changed-checksum'
    }),
    asegurarChecksumPayload: async (payload) => payload.checksum,
    evaluarPlanSyncDrive: () => ({ needsPull: false, pushAllowed: true, reason: 'diverged-same-version' }),
    confirmarSubidaCambiosLocalesDriveSync: async () => {
      confirmCalls += 1;
      return true;
    },
    buildDriveSyncEnvelope: async () => ({
      version: 4,
      checksum: 'local-changed-checksum',
      updatedAt: '2026-06-06T12:00:00.000Z'
    }),
    uploadDriveSyncEnvelope: async () => ({ id: 'drive-file-3' }),
    Date: class extends Date {
      static now() { return now; }
    }
  });

  const result = await ctx.sincronizarDriveConGoogle();

  assert.equal(result.ok, true);
  assert.equal(result.action, 'pushed');
  assert.equal(result.version, 4);
  assert.equal(confirmCalls, 1);
  assert.equal(appData.driveSync.lastKnownRemoteChecksum, 'local-changed-checksum');
});

test('confirmarSubidaCambiosLocalesDriveSync summarizes changed values before upload', async () => {
  let confirmMessage = '';
  const ctx = loadFunctionsFromFile(APP_JS, [
    'resolveDriveEnvelopeData',
    'sanitizarSnapshotReplicadoDriveSync',
    'formatearValorCambioDriveSync',
    'nombreCampoCambioDriveSync',
    'etiquetaCambioDriveSync',
    'acumularCambiosDriveSync',
    'confirmarSubidaCambiosLocalesDriveSync'
  ], {
    clonarJSONSeguro: (data) => JSON.parse(JSON.stringify(data)),
    formatCOP: (value) => `$${Math.round(value).toLocaleString('es-CO')}`,
    getDriveSyncPassphrase: () => '',
    confirm: (message) => {
      confirmMessage = message;
      return true;
    }
  });

  const ok = await ctx.confirmarSubidaCambiosLocalesDriveSync(
    {
      data: {
        schemaVersion: 5,
        googleAuth: {
          provider: 'google',
          clientId: 'client-1',
          scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
          session: { obtainedAtMs: 1000, expiresAtMs: 2000 }
        },
        ingresosList: [{ id: 1, nombre: 'Salario', valor: 400000 }],
        compromisos: [],
        primasList: []
      }
    },
    {
      schemaVersion: 5,
      googleAuth: {
        provider: 'google',
        clientId: 'client-1',
        scope: 'https://www.googleapis.com/auth/userinfo.email openid profile https://www.googleapis.com/auth/drive.appdata',
        session: { obtainedAtMs: 3000, expiresAtMs: 4000 }
      },
      ingresosList: [{ id: 1, nombre: 'Salario', valor: 300000 }],
      compromisos: [],
      primasList: []
    }
  );

  assert.equal(ok, true);
  assert.match(confirmMessage, /Tu información local tiene cambios/);
  assert.match(confirmMessage, /Salario/);
  assert.match(confirmMessage, /\$400\.000/);
  assert.match(confirmMessage, /\$300\.000/);
  assert.doesNotMatch(confirmMessage, /googleapis/);
  assert.doesNotMatch(confirmMessage, /obtainedAtMs|expiresAtMs|session|scope/);
  assert.match(confirmMessage, /reemplazar el respaldo remoto/);
});
