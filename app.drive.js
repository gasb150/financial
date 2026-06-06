// Google OAuth and Drive sync module extracted from app.js for maintainability.

function translateDriveText(key, fallback, vars = {}) {
  if(typeof window !== 'undefined' && window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
    let translated = window.FinancialI18n.t(key, vars);
    if(translated !== key && translated != null && translated !== '') return translated;
  }
  return fallback.replace(/{{\s*(\w+)\s*}}/g, (_match, name) => vars[name] ?? '');
}

function getGoogleOAuthConfig() {
  if(!appData.googleAuth || typeof appData.googleAuth !== 'object') normalizarEstadoCargado();
  let cfg = appData.googleAuth || {};
  return {
    provider: 'google',
    clientId: String(cfg.clientId || '').trim(),
    scope: GOOGLE_OAUTH_DEFAULT_SCOPE
  };
}

function getGoogleOAuthRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getGoogleOAuthSession() {
  let session = appData && appData.googleAuth ? appData.googleAuth.session : null;
  if(!session || typeof session !== 'object') return null;
  if(googleOAuthAccessTokenRuntime) {
    return { ...session, accessToken: googleOAuthAccessTokenRuntime };
  }
  return session;
}

function getGoogleOAuthSessionEmail() {
  let session = getGoogleOAuthSession();
  if(!session || typeof session !== 'object') return '';
  let user = session.user && typeof session.user === 'object' ? session.user : {};
  return String(user.email || session.email || '').trim();
}

function hasGoogleScope(scopeText, requiredScope) {
  let scope = String(scopeText || '').trim();
  if(!scope) return false;
  return scope.split(/\s+/).includes(requiredScope);
}

function isGoogleOAuthSessionActive() {
  let session = getGoogleOAuthSession();
  if(!session || !session.accessToken) return false;
  let expiresAtMs = parseInt(session.expiresAtMs, 10) || 0;
  return expiresAtMs > Date.now() + 15000;
}

function limpiarSesionGoogleOAuth(persist = true) {
  if(!appData.googleAuth || typeof appData.googleAuth !== 'object') return;
  appData.googleAuth.session = null;
  googleOAuthAccessTokenRuntime = '';
  if(persist) {
    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());
  }
}

function setErrorGoogleOAuth(msg) {
  if(!appData.googleAuth || typeof appData.googleAuth !== 'object') return;
  appData.googleAuth.lastError = String(msg || '').trim();
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
}

function renderGoogleAuthConfig() {
  let clientInput = document.getElementById('google-oauth-client-id');
  let redirectInput = document.getElementById('google-oauth-redirect');
  let statusEl = document.getElementById('google-auth-status');
  let errorEl = document.getElementById('google-auth-error');
  if(!clientInput || !redirectInput || !statusEl || !errorEl) return;

  let cfg = getGoogleOAuthConfig();
  let session = getGoogleOAuthSession();
  let activo = isGoogleOAuthSessionActive();
  clientInput.value = cfg.clientId;
  redirectInput.value = getGoogleOAuthRedirectUri();

  if(activo) {
    let user = session.user && typeof session.user === 'object' ? session.user : {};
    let email = String(user.email || '').trim();
    let exp = session.expiresAtMs ? new Date(session.expiresAtMs).toLocaleString('es-CO') : 'N/D';
    statusEl.innerText = `Active session${email ? ` · ${email}` : ''}. Expires: ${exp}.`;
  } else if(session && session.accessToken) {
    statusEl.innerText = 'Session expired. Sign in again or refresh the token.';
  } else {
    statusEl.innerText = 'Session not started.';
  }

  errorEl.innerText = appData.googleAuth && appData.googleAuth.lastError ? appData.googleAuth.lastError : '';
}

let googleOAuthTokenClient = null;
let googleOAuthTokenClientClientId = '';
let googleOAuthPendingRequest = null;
let googleOAuthAccessTokenRuntime = '';
let driveSyncRuntimeInProgress = false;

function googleSDKDisponible() {
  return !!(
    window.google
    && window.google.accounts
    && window.google.accounts.oauth2
    && typeof window.google.accounts.oauth2.initTokenClient === 'function'
  );
}

function limpiarQueryOAuthLegacy() {
  let url = new URL(window.location.href);
  let changed = false;
  ['code', 'state', 'scope', 'authuser', 'prompt', 'error', 'iss'].forEach((k) => {
    if(url.searchParams.has(k)) {
      url.searchParams.delete(k);
      changed = true;
    }
  });
  if(changed) {
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }
}

function reiniciarClienteGoogleOAuth() {
  googleOAuthTokenClient = null;
  googleOAuthTokenClientClientId = '';
}

function inicializarClienteTokenGoogleOAuth() {
  if(googleOAuthTokenClient) return googleOAuthTokenClient;
  if(!googleSDKDisponible()) return null;

  let cfg = getGoogleOAuthConfig();
  if(!cfg.clientId) return null;

  googleOAuthTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: cfg.clientId,
    scope: cfg.scope,
    callback: async (resp) => {
      if(!resp || resp.error) {
        let detalle = resp && (resp.error_description || resp.error) ? (resp.error_description || resp.error) : 'Error desconocido en login Google.';
        setErrorGoogleOAuth(`Google auth failed: ${detalle}`);
        renderGoogleAuthConfig();
        if(googleOAuthPendingRequest) {
          googleOAuthPendingRequest.reject(new Error(detalle));
          googleOAuthPendingRequest = null;
        }
        return;
      }

      try {
        let expiresIn = Math.max(1, parseInt(resp.expires_in, 10) || 3600);
        let now = Date.now();
        let user = await obtenerPerfilGoogleOAuth(resp.access_token);
        googleOAuthAccessTokenRuntime = resp.access_token;
        appData.googleAuth.session = {
          tokenType: 'Bearer',
          scope: String(resp.scope || cfg.scope || '').trim(),
          obtainedAtMs: now,
          expiresAtMs: now + (expiresIn * 1000),
          user: user || null
        };
        appData.googleAuth.lastError = '';
        persistirDataPrincipalConFallback();
        persistirAuxiliaresConFallback(new Date().toISOString());
        if(googleOAuthPendingRequest) {
          googleOAuthPendingRequest.resolve(appData.googleAuth.session);
          googleOAuthPendingRequest = null;
        }
      } catch(err) {
        setErrorGoogleOAuth(err && err.message ? err.message : 'No fue posible completar login Google.');
        if(googleOAuthPendingRequest) {
          googleOAuthPendingRequest.reject(err instanceof Error ? err : new Error('No fue posible completar login Google.'));
          googleOAuthPendingRequest = null;
        }
      }

      renderGoogleAuthConfig();
    }
  });

  googleOAuthTokenClientClientId = cfg.clientId;

  return googleOAuthTokenClient;
}

async function iniciarFlujoGoogleGISToken(options = {}) {
  let opts = options && typeof options === 'object' ? options : {};
  let cfg = getGoogleOAuthConfig();
  if(!cfg.clientId) {
    let message = translateDriveText('config.googleOAuthClientIdRequired', 'Configure the Google Client ID before signing in.');
    setErrorGoogleOAuth(message);
    renderGoogleAuthConfig();
    throw new Error(message);
  }

  if(!googleSDKDisponible()) {
    setErrorGoogleOAuth('Google Identity Services is not available yet. Reload the page and try again.');
    renderGoogleAuthConfig();
    throw new Error('Google Identity Services is not available yet.');
  }

  if(googleOAuthTokenClient && googleOAuthTokenClientClientId !== cfg.clientId) {
    reiniciarClienteGoogleOAuth();
  }

  let tokenClient = inicializarClienteTokenGoogleOAuth();
  if(!tokenClient) {
    setErrorGoogleOAuth('No fue posible inicializar cliente OAuth de Google.');
    renderGoogleAuthConfig();
    throw new Error('No fue posible inicializar cliente OAuth de Google.');
  }

  appData.googleAuth.lastError = '';
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  let prompt = opts.forceConsent ? 'consent' : (getGoogleOAuthSession() ? '' : 'consent');
  if(googleOAuthPendingRequest) {
    googleOAuthPendingRequest.reject(new Error('A new OAuth request started.'));
    googleOAuthPendingRequest = null;
  }
  let requestPromise = new Promise((resolve, reject) => {
    googleOAuthPendingRequest = { resolve, reject };
  });
  tokenClient.requestAccessToken({ prompt });
  return requestPromise;
}

function getDriveSyncState() {
  if(!appData.driveSync || typeof appData.driveSync !== 'object') normalizarEstadoCargado();
  return appData.driveSync;
}

function ensureDriveSyncLocalDeviceId() {
  let state = getDriveSyncState();
  if(state.localDeviceId && state.localDeviceId.trim()) return state.localDeviceId;
  let rnd = Math.random().toString(36).slice(2, 10);
  state.localDeviceId = `device-${Date.now().toString(36)}-${rnd}`;
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  return state.localDeviceId;
}

function setDriveSyncError(message) {
  let state = getDriveSyncState();
  state.lastError = String(message || '').trim();
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
}

function appendDriveSyncEvent(type, details = {}) {
  let state = getDriveSyncState();
  if(!Array.isArray(state.syncEvents)) state.syncEvents = [];
  state.syncEvents.push({
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: new Date().toISOString(),
    details
  });
  if(state.syncEvents.length > DRIVE_SYNC_TRACE_LIMIT) {
    state.syncEvents = state.syncEvents.slice(-DRIVE_SYNC_TRACE_LIMIT);
  }
}

function getDriveSyncPassphrase() {
  let input = document.getElementById('drive-sync-passphrase');
  if(!input) return '';
  return String(input.value || '').trim();
}

function syncDriveEncryptionFlagFromUI() {
  let state = getDriveSyncState();
  state.encryptionEnabled = !!getDriveSyncPassphrase();
}

function bytesToBase64(bytes) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function base64ToBytes(b64) {
  let bin = atob(String(b64 || ''));
  let out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveDriveSyncAesKey(passphrase, saltBytes) {
  let encoder = new TextEncoder();
  let baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: DRIVE_SYNC_KDF_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptDriveSyncData(dataObj, passphrase) {
  if(!(window.crypto && crypto.subtle)) {
    throw new Error('Web Crypto is not available to encrypt the remote backup.');
  }
  let encoder = new TextEncoder();
  let payload = encoder.encode(JSON.stringify(dataObj));
  let salt = crypto.getRandomValues(new Uint8Array(16));
  let iv = crypto.getRandomValues(new Uint8Array(12));
  let key = await deriveDriveSyncAesKey(passphrase, salt);
  let encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return {
    encryption: {
      alg: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: DRIVE_SYNC_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv)
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptDriveSyncData(envelope, passphrase) {
  if(!envelope || !envelope.encryption || !envelope.ciphertext) {
    throw new Error('There is no valid encryption metadata in the remote snapshot.');
  }
  if(!(window.crypto && crypto.subtle)) {
    throw new Error('Web Crypto is not available to decrypt the remote backup.');
  }
  let enc = envelope.encryption;
  let salt = base64ToBytes(enc.salt || '');
  let iv = base64ToBytes(enc.iv || '');
  let key = await deriveDriveSyncAesKey(passphrase, salt);
  let plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(envelope.ciphertext || ''));
  let decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext));
}

function renderDriveSyncStatus() {
  let statusEl = document.getElementById('drive-sync-status');
  let errorEl = document.getElementById('drive-sync-error');
  if(!statusEl || !errorEl) return;

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  let state = getDriveSyncState();
  syncDriveEncryptionFlagFromUI();
  if(state.syncInProgress) {
    statusEl.innerText = i18nT('config.driveSyncInProgress', {}, 'Sincronizando con Drive...');
  } else if(state.lastSyncAt) {
    let date = new Date(state.lastSyncAt).toLocaleString('es-CO');
    let email = String(state.lastSyncEmail || '').trim();
    statusEl.innerText = email
      ? i18nT('config.driveSyncLastOkWithEmail', { date, email }, `Last successful sync with ${email}: ${date}.`)
      : i18nT('config.driveSyncLastOk', { date }, `Last successful sync: ${date}.`);
  } else {
    statusEl.innerText = i18nT('config.driveSyncIdle', {}, 'No Drive sync yet.');
  }

  errorEl.innerText = state.lastError || '';
}

function evaluarPlanSyncDrive({ remoteVersion = 0, remoteChecksum = '', localChecksum = '', lastKnownRemoteVersion = 0 }) {
  let plan = {
    needsPull: false,
    pushAllowed: true,
    reason: 'ok'
  };

  if(!remoteVersion || !remoteChecksum) return plan;
  if(remoteChecksum === localChecksum) return plan;
  if(remoteVersion > lastKnownRemoteVersion) {
    plan.needsPull = true;
    plan.pushAllowed = false;
    plan.reason = 'remote-ahead';
    return plan;
  }
  plan.reason = 'diverged-same-version';
  return plan;
}

async function googleDriveApiFetch(path, options = {}) {
  let session = getGoogleOAuthSession();
  let token = session && session.accessToken ? session.accessToken : '';
  if(!token) throw new Error('There is no active OAuth session for Drive.');

  let resp = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if(!resp.ok) {
    let text = '';
    let payload = null;
    try {
      text = await resp.text();
      payload = JSON.parse(text);
    } catch(_e) {
      payload = null;
    }

    let message = payload && payload.error && payload.error.message
      ? payload.error.message
      : (text || 'request failed');
    let err = new Error(`Drive API ${resp.status}: ${message}`);
    err.status = resp.status;

    let details = payload && payload.error && Array.isArray(payload.error.details) ? payload.error.details : [];
    let detailReason = details.find((d) => d && d.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT');
    let errors = payload && payload.error && Array.isArray(payload.error.errors) ? payload.error.errors : [];
    let reasonInsufficient = errors.some((e) => e && e.reason === 'insufficientPermissions');

    if(detailReason || reasonInsufficient) {
      err.code = 'ACCESS_TOKEN_SCOPE_INSUFFICIENT';
    }
    throw err;
  }
  return resp;
}

async function buildDriveSyncEnvelope(remoteVersion = 0) {
  let deviceId = ensureDriveSyncLocalDeviceId();
  let payload = buildDriveSyncBackupPayload();
  let checksum = await asegurarChecksumPayload(payload);
  let state = getDriveSyncState();
  let envelope = {
    schema: 'financial.drive.sync.v1',
    version: Math.max(1, parseInt(remoteVersion, 10) + 1),
    checksum,
    updatedAt: new Date().toISOString(),
    deviceId,
    data: payload.data,
    encryption: null,
    ciphertext: null,
    meta: {
      appSchemaVersion: APP_SCHEMA_VERSION,
      prevRemoteVersion: Math.max(0, state.lastKnownRemoteVersion || 0)
    }
  };

  syncDriveEncryptionFlagFromUI();
  if(state.encryptionEnabled) {
    let passphrase = getDriveSyncPassphrase();
    if(!passphrase) throw new Error('Activa cifrado solo si defines una passphrase.');
    let encrypted = await encryptDriveSyncData(payload.data, passphrase);
    envelope.data = null;
    envelope.encryption = encrypted.encryption;
    envelope.ciphertext = encrypted.ciphertext;
  }

  return envelope;
}

async function findDriveSyncFile() {
  let query = encodeURIComponent(`name='${DRIVE_SYNC_FILENAME}' and 'appDataFolder' in parents and trashed=false`);
  let url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime,size)`;
  let resp = await googleDriveApiFetch(url);
  let json = await resp.json();
  let files = Array.isArray(json.files) ? json.files : [];
  return files[0] || null;
}

async function downloadDriveSyncEnvelope(fileId) {
  let resp = await googleDriveApiFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
  return resp.json();
}

async function resolveDriveEnvelopeData(remoteEnvelope) {
  if(remoteEnvelope && remoteEnvelope.data) return remoteEnvelope.data;
  if(!(remoteEnvelope && remoteEnvelope.encryption && remoteEnvelope.ciphertext)) return null;

  let passphrase = getDriveSyncPassphrase();
  if(!passphrase) {
    let prompted = prompt('The remote backup is encrypted. Enter the passphrase to decrypt it:');
    passphrase = String(prompted || '').trim();
  }
  if(!passphrase) throw new Error('Se requiere passphrase para descifrar el respaldo remoto.');
  return decryptDriveSyncData(remoteEnvelope, passphrase);
}

function sanitizarSnapshotReplicadoDriveSync(dataObj) {
  let snapshot = clonarJSONSeguro(dataObj);
  if(!snapshot || typeof snapshot !== 'object') return {};
  delete snapshot.driveSync;
  if(snapshot.googleAuth && typeof snapshot.googleAuth === 'object') {
    snapshot.googleAuth = {
      provider: String(snapshot.googleAuth.provider || 'google'),
      clientId: String(snapshot.googleAuth.clientId || '')
    };
  }
  return snapshot;
}

function buildDriveSyncBackupPayload() {
  let payload = buildBackupPayload();
  return {
    ...payload,
    data: sanitizarSnapshotReplicadoDriveSync(payload.data),
    checksum: ''
  };
}

async function generarChecksumSnapshotDriveSync(dataObj) {
  return generarChecksumPayload(sanitizarSnapshotReplicadoDriveSync(dataObj));
}

async function validarChecksumEnvelopeDriveSync(remoteEnvelope, remoteData) {
  let envelopeChecksum = String(remoteEnvelope && remoteEnvelope.checksum ? remoteEnvelope.checksum : '').trim();
  let payloadChecksum = await generarChecksumPayload(remoteData);
  if(envelopeChecksum && payloadChecksum !== envelopeChecksum) {
    throw new Error('El checksum del snapshot remoto de Drive no coincide con el contenido descargado.');
  }
  return envelopeChecksum || payloadChecksum;
}

async function resolverChecksumComparacionDriveSync(remoteEnvelope, checksumBase = '') {
  let checksum = String(checksumBase || '').trim();
  if(remoteEnvelope && remoteEnvelope.data) {
    return generarChecksumSnapshotDriveSync(remoteEnvelope.data);
  }
  if(remoteEnvelope && remoteEnvelope.encryption && remoteEnvelope.ciphertext) {
    let passphrase = getDriveSyncPassphrase();
    if(passphrase) {
      try {
        let decrypted = await decryptDriveSyncData(remoteEnvelope, passphrase);
        if(validarPayloadRespaldo(decrypted)) {
          return generarChecksumSnapshotDriveSync(decrypted);
        }
      } catch(_e) {}
    }
  }
  return checksum;
}

function crearMultipartDriveBody(metadata, contentObj, boundary) {
  let delimiter = `--${boundary}`;
  let close = `--${boundary}--`;
  let payload = JSON.stringify(contentObj);
  return `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${payload}\r\n${close}`;
}

function formatearValorCambioDriveSync(valor) {
  if(typeof window !== 'undefined' && window.FinancialDriveSyncChangeSummary && typeof window.FinancialDriveSyncChangeSummary.formatChangedValue === 'function') {
    return window.FinancialDriveSyncChangeSummary.formatChangedValue(valor, formatCOP);
  }
  if(valor === null || valor === undefined) return 'sin valor';
  if(typeof valor === 'number') return formatCOP(valor);
  if(typeof valor === 'boolean') return valor ? 'yes' : 'no';
  if(typeof valor === 'string') return valor.trim() ? valor.trim() : 'empty';
  if(Array.isArray(valor)) return `lista (${valor.length} items)`;
  if(typeof valor === 'object') {
    if(valor.nombre) return String(valor.nombre);
    return 'objeto';
  }
  return String(valor);
}

function nombreCampoCambioDriveSync(campo) {
  if(typeof window !== 'undefined' && window.FinancialDriveSyncChangeSummary && typeof window.FinancialDriveSyncChangeSummary.getFieldLabel === 'function') {
    return window.FinancialDriveSyncChangeSummary.getFieldLabel(campo);
  }
  return campo;
}

function etiquetaCambioDriveSync(pathParts, campo, remoto, local) {
  if(typeof window !== 'undefined' && window.FinancialDriveSyncChangeSummary && typeof window.FinancialDriveSyncChangeSummary.buildChangeLabel === 'function') {
    return window.FinancialDriveSyncChangeSummary.buildChangeLabel(pathParts, campo, remoto, local);
  }
  let nombre = '';
  if(local && typeof local === 'object' && local.nombre) nombre = String(local.nombre);
  if(!nombre && remoto && typeof remoto === 'object' && remoto.nombre) nombre = String(remoto.nombre);
  if(nombre) return `${nombre} · ${nombreCampoCambioDriveSync(campo)}`;
  return [...pathParts, nombreCampoCambioDriveSync(campo)].map(nombreCampoCambioDriveSync).join(' > ');
}

function acumularCambiosDriveSync(remoto, local, pathParts = [], cambios = [], limite = 8) {
  if(typeof window !== 'undefined' && window.FinancialDriveSyncChangeSummary && typeof window.FinancialDriveSyncChangeSummary.collectDriveSyncChanges === 'function') {
    return window.FinancialDriveSyncChangeSummary.collectDriveSyncChanges(remoto, local, {
      pathParts,
      changes: cambios,
      limit: limite,
      formatCurrency: formatCOP
    });
  }
  if(cambios.length >= limite) return cambios;
  if(Object.is(remoto, local)) return cambios;

  if(!remoto || !local || typeof remoto !== 'object' || typeof local !== 'object') {
    cambios.push(`${pathParts.map(nombreCampoCambioDriveSync).join(' > ') || 'dato'}: ${formatearValorCambioDriveSync(remoto)} → ${formatearValorCambioDriveSync(local)}`);
    return cambios;
  }

  if(Array.isArray(remoto) || Array.isArray(local)) {
    let remArr = Array.isArray(remoto) ? remoto : [];
    let locArr = Array.isArray(local) ? local : [];
    let max = Math.max(remArr.length, locArr.length);
    for(let i = 0; i < max && cambios.length < limite; i += 1) {
      let r = remArr[i];
      let l = locArr[i];
      if(r && l && typeof r === 'object' && typeof l === 'object') {
        acumularCambiosDriveSync(r, l, [...pathParts, `${nombreCampoCambioDriveSync(pathParts[pathParts.length - 1] || 'item')} ${i + 1}`], cambios, limite);
      } else if(!Object.is(r, l)) {
        let nombre = (l && l.nombre) || (r && r.nombre) || `${nombreCampoCambioDriveSync(pathParts[pathParts.length - 1] || 'item')} ${i + 1}`;
        cambios.push(`${nombre}: ${formatearValorCambioDriveSync(r)} → ${formatearValorCambioDriveSync(l)}`);
      }
    }
    return cambios;
  }

  let keys = Array.from(new Set([...Object.keys(remoto), ...Object.keys(local)]));
  for(let key of keys) {
    if(cambios.length >= limite) break;
    let r = remoto[key];
    let l = local[key];
    if(Object.is(r, l)) continue;
    if(r && l && typeof r === 'object' && typeof l === 'object') {
      acumularCambiosDriveSync(r, l, [...pathParts, nombreCampoCambioDriveSync(key)], cambios, limite);
    } else {
      cambios.push(`${etiquetaCambioDriveSync(pathParts, key, remoto, local)}: ${formatearValorCambioDriveSync(r)} → ${formatearValorCambioDriveSync(l)}`);
    }
  }

  return cambios;
}

async function confirmarSubidaCambiosLocalesDriveSync(remoteEnvelope, localData) {
  if(!remoteEnvelope) return true;

  let cambios = [];
  try {
    let remoteData = await resolveDriveEnvelopeData(remoteEnvelope);
    if(remoteData && typeof remoteData === 'object') {
      cambios = acumularCambiosDriveSync(
        sanitizarSnapshotReplicadoDriveSync(remoteData),
        sanitizarSnapshotReplicadoDriveSync(localData)
      );
    }
  } catch(_e) {
    cambios = [];
  }

  let detalle = cambios.length
    ? `\n\nDetected changes:\n- ${cambios.join('\n- ')}`
    : '\n\nCould not list the changes, but your local version differs from the remote version.';
  return confirm(`Your local information has changes compared with the Drive backup.${detalle}\n\nDo you agree to upload these changes and replace the remote backup?`);
}

async function uploadDriveSyncEnvelope(existingFileId, envelope) {
  let boundary = `financial-sync-${Date.now().toString(36)}`;
  let metadata = existingFileId
    ? { name: DRIVE_SYNC_FILENAME }
    : { name: DRIVE_SYNC_FILENAME, parents: ['appDataFolder'] };

  let method = existingFileId ? 'PATCH' : 'POST';
  let endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  let body = crearMultipartDriveBody(metadata, envelope, boundary);
  let resp = await googleDriveApiFetch(endpoint, {
    method,
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  return resp.json();
}

async function asegurarSesionGoogleParaDrive() {
  let session = getGoogleOAuthSession();
  let needsFreshLogin = !isGoogleOAuthSessionActive();
  let hasDriveAccess = session && hasGoogleScope(session.scope, GOOGLE_DRIVE_APPDATA_SCOPE);

  if(needsFreshLogin || !hasDriveAccess) {
    await iniciarFlujoGoogleGISToken({ forceConsent: !hasDriveAccess });
  }

  if(!isGoogleOAuthSessionActive()) throw new Error('Could not get an active Google session.');
  return getGoogleOAuthSession();
}

async function sincronizarDriveConGoogle(options = {}) {
  let dryRun = !!options.dryRun;
  let forcePull = !!options.forcePull;
  let state = getDriveSyncState();
  if(driveSyncRuntimeInProgress) return { ok: false, reason: 'already-running' };
  if(state.syncInProgress) state.syncInProgress = false;

  driveSyncRuntimeInProgress = true;
  state.syncInProgress = true;
  state.lastError = '';
  syncDriveEncryptionFlagFromUI();
  appendDriveSyncEvent('sync-start', { dryRun, forcePull, encryptionEnabled: state.encryptionEnabled });
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  renderDriveSyncStatus();

  try {
    await asegurarSesionGoogleParaDrive();
    let syncEmail = getGoogleOAuthSessionEmail();
    let remoteFile = await findDriveSyncFile();
    let remoteEnvelope = null;
    let remoteVersion = 0;
    let remoteChecksum = '';

    if(remoteFile && remoteFile.id) {
      remoteEnvelope = await downloadDriveSyncEnvelope(remoteFile.id);
      remoteVersion = Math.max(0, parseInt(remoteEnvelope && remoteEnvelope.version, 10) || 0);
      remoteChecksum = await resolverChecksumComparacionDriveSync(remoteEnvelope, remoteEnvelope && remoteEnvelope.checksum);
      state.fileId = remoteFile.id;
    }

    let localPayload = buildDriveSyncBackupPayload();
    let localChecksum = await asegurarChecksumPayload(localPayload);
    let plan = evaluarPlanSyncDrive({
      remoteVersion,
      remoteChecksum,
      localChecksum,
      lastKnownRemoteVersion: state.lastKnownRemoteVersion
    });

    if(forcePull) {
      if(!remoteEnvelope) throw new Error('There is no remote snapshot in Drive to recover.');

      let remoteData = await resolveDriveEnvelopeData(remoteEnvelope);
      if(!validarPayloadRespaldo(remoteData)) {
        throw new Error('The remote Drive snapshot is invalid or corrupted.');
      }
      await validarChecksumEnvelopeDriveSync(remoteEnvelope, remoteData);
      remoteChecksum = await generarChecksumSnapshotDriveSync(remoteData);

      if(dryRun) {
        return { ok: true, dryRun: true, action: 'force-pull-ready', remoteVersion };
      }

      appData = aplicarMigracionesSchema(remoteData);
      normalizarEstadoCargado();
      marcarCorreccionMesBaseComoAplicada(appData);
      asegurarMesesAnioActualEnLineaTiempo();
      persistirDataPrincipalConFallback();
      persistirAuxiliaresConFallback(new Date().toISOString());
      initApp({ skipDataNormalization: false });

      let refreshedState = getDriveSyncState();
      refreshedState.fileId = remoteFile && remoteFile.id ? remoteFile.id : (refreshedState.fileId || null);
      refreshedState.lastKnownRemoteVersion = remoteVersion;
      refreshedState.lastKnownRemoteChecksum = remoteChecksum;
      refreshedState.lastSyncAt = new Date().toISOString();
      refreshedState.lastSyncEmail = syncEmail;
      appendDriveSyncEvent('force-pull-applied', {
        remoteVersion,
        remoteChecksum,
        email: syncEmail
      });

      return { ok: true, action: 'force-pulled', remoteVersion };
    }

    if(plan.needsPull) {
      let remoteData = await resolveDriveEnvelopeData(remoteEnvelope);
      if(!remoteEnvelope || !validarPayloadRespaldo(remoteData)) {
        throw new Error('Remote changes were detected, but the remote snapshot is not valid.');
      }
      await validarChecksumEnvelopeDriveSync(remoteEnvelope, remoteData);
      remoteChecksum = await generarChecksumSnapshotDriveSync(remoteData);

      if(dryRun) {
        return { ok: true, dryRun: true, action: 'pull-required', remoteVersion };
      }

      let confirmarPull = confirm('Newer remote changes were detected in Drive. Accept: use remote version. Cancel: keep local and overwrite remote.');
      if(!confirmarPull) {
        let confirmarSobrescritura = confirm('The remote version will be overwritten with your current local state. Do you want to continue?');
        if(!confirmarSobrescritura) {
          throw new Error('Sync canceled to prevent silent overwrite.');
        }
        appendDriveSyncEvent('conflict-resolved-local-wins', {
          remoteVersion,
          localChecksum,
          remoteChecksum
        });
      } else {
        appData = aplicarMigracionesSchema(remoteData);
        normalizarEstadoCargado();
        marcarCorreccionMesBaseComoAplicada(appData);
        asegurarMesesAnioActualEnLineaTiempo();
        persistirDataPrincipalConFallback();
        persistirAuxiliaresConFallback(new Date().toISOString());
        initApp({ skipDataNormalization: false });
        alert('The remote Drive version was downloaded. Run sync again to upload new local changes.');
        let refreshedState = getDriveSyncState();
        refreshedState.fileId = remoteFile && remoteFile.id ? remoteFile.id : (refreshedState.fileId || null);
        refreshedState.lastKnownRemoteVersion = remoteVersion;
        refreshedState.lastKnownRemoteChecksum = remoteChecksum;
        refreshedState.lastSyncAt = new Date().toISOString();
        refreshedState.lastSyncEmail = syncEmail;
        appendDriveSyncEvent('conflict-resolved-remote-wins', {
          remoteVersion,
          remoteChecksum,
          email: syncEmail
        });
        return { ok: true, action: 'pulled-remote', remoteVersion };
      }
    }

    if(dryRun) {
      return { ok: true, dryRun: true, action: 'push-ready', remoteVersion };
    }

    if(remoteEnvelope && remoteChecksum && localChecksum !== remoteChecksum) {
      let confirmarSubidaLocal = await confirmarSubidaCambiosLocalesDriveSync(remoteEnvelope, localPayload.data);
      if(!confirmarSubidaLocal) {
        throw new Error('Sync canceled: local changes were not confirmed for upload to Drive.');
      }
      appendDriveSyncEvent('local-changes-confirmed', {
        remoteVersion,
        localChecksum,
        remoteChecksum
      });
    }

    if(state.fileId) {
      let refreshedRemoteEnvelope = await downloadDriveSyncEnvelope(state.fileId);
      let refreshedRemoteVersion = Math.max(0, parseInt(refreshedRemoteEnvelope && refreshedRemoteEnvelope.version, 10) || 0);
      let refreshedRemoteChecksum = await resolverChecksumComparacionDriveSync(
        refreshedRemoteEnvelope,
        refreshedRemoteEnvelope && refreshedRemoteEnvelope.checksum
      );

      if(
        refreshedRemoteVersion !== remoteVersion
        || refreshedRemoteChecksum !== remoteChecksum
      ) {
        throw new Error('The remote snapshot changed before upload to Drive. Sync again to revalidate the remote state.');
      }
    }

    let uploadEnvelope = await buildDriveSyncEnvelope(remoteVersion);
    let uploadResult = await uploadDriveSyncEnvelope(state.fileId || null, uploadEnvelope);

    state.fileId = uploadResult && uploadResult.id ? uploadResult.id : (state.fileId || null);
    state.lastKnownRemoteVersion = uploadEnvelope.version;
    state.lastKnownRemoteChecksum = uploadEnvelope.checksum;
    state.lastSyncAt = uploadEnvelope.updatedAt;
    state.lastSyncEmail = syncEmail;
    state.lastError = '';
    appendDriveSyncEvent('sync-pushed', {
      version: uploadEnvelope.version,
      encryptionEnabled: !!uploadEnvelope.encryption,
      email: syncEmail
    });

    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());
    renderDriveSyncStatus();

    return {
      ok: true,
      action: 'pushed',
      version: uploadEnvelope.version,
      fileId: state.fileId
    };
  } catch(err) {
    if(err && err.code === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' && !options._scopeRetryDone) {
      appendDriveSyncEvent('scope-upgrade-retry', { reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' });
      await iniciarFlujoGoogleGISToken({ forceConsent: true });

      let retryState = getDriveSyncState();
      retryState.syncInProgress = false;
      driveSyncRuntimeInProgress = false;
      persistirDataPrincipalConFallback();
      persistirAuxiliaresConFallback(new Date().toISOString());
      renderDriveSyncStatus();

      return await sincronizarDriveConGoogle({ ...options, _scopeRetryDone: true });
    }

    let mensaje = err && err.message ? err.message : 'Unknown error during Drive sync.';
    setDriveSyncError(mensaje);
    appendDriveSyncEvent('sync-error', { message: mensaje });
    renderDriveSyncStatus();
    throw err;
  } finally {
    let latestState = getDriveSyncState();
    latestState.syncInProgress = false;
    driveSyncRuntimeInProgress = false;
    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());
    renderDriveSyncStatus();
  }
}

async function obtenerPerfilGoogleOAuth(accessToken) {
  let resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if(!resp.ok) return null;
  try {
    return await resp.json();
  } catch(_e) {
    return null;
  }
}

async function refrescarSesionGoogleOAuth() {
  return false;
}

async function procesarCallbackGoogleOAuthSiAplica() {
  limpiarQueryOAuthLegacy();
}

async function cerrarSesionGoogleOAuth() {
  let session = getGoogleOAuthSession();
  try {
    if(session && session.accessToken) {
      if(googleSDKDisponible() && typeof window.google.accounts.oauth2.revoke === 'function') {
        await new Promise((resolve) => {
          window.google.accounts.oauth2.revoke(session.accessToken, () => resolve());
        });
      } else {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.accessToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      }
    }
  } catch(_e) {}

  reiniciarClienteGoogleOAuth();
  limpiarSesionGoogleOAuth(false);
  if(appData.googleAuth && typeof appData.googleAuth === 'object') appData.googleAuth.lastError = '';
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
}

function validarDataPrincipal(payload) {
  return window.FinancialData.validatePrimaryData(payload);
}

function abrirIndexedDB() {
  return window.FinancialData.openIndexedDB();
}

async function idbGetRaw(key) {
  return window.FinancialData.idbGetRaw(key);
}

async function idbSetRaw(key, value) {
  return window.FinancialData.idbSetRaw(key, value);
}

async function hidratarDataDesdeIndexedDB() {
  return window.FinancialData.hydrateDataFromIndexedDB();
}

function persistirDataPrincipalConFallback() {
  return window.FinancialData.persistPrimaryDataWithFallback();
}

async function persistirAuxiliaresConFallback(marcaGuardadoISO) {
  return window.FinancialData.persistAuxDataWithFallback(marcaGuardadoISO);
}
