let mesesLineaTiempo = [
  "Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"
];

let mesActivoGlobal = "Mayo 2026";
let filtroDeudaActivo = "todas";
let semanaSeleccionadaIndex = 0;
let diaSeleccionadoActivo = null; // Guarda el día activo elegido para la vista diaria
let filtroDiaDesde = null;
let filtroDiaHasta = null;
let deudasExpandState = new Set();
let ingresosExpandState = new Set();
let primasExpandState = new Set();
let addIngresoCardExpanded = false;
let addPrimaCardExpanded = false;
let modoAltaDeuda = 'rapido';
let deferredInstallPrompt = null;
let htmlActionHandlersBound = false;
let iaPanelState = {
  deudas: { loading: false, error: '', result: '' },
  gastosMes: { loading: false, error: '', result: '' },
  gastosQuincena: { loading: false, error: '', result: '' },
  gastosSemana: { loading: false, error: '', result: '' },
  resumenMensual: { loading: false, error: '', result: '' },
  alertasDeficit: { loading: false, error: '', result: '' },
  simuladorEscenarios: { loading: false, error: '', result: '' },
  recortesItemsMes: { loading: false, error: '', result: '', items: [] },
  rebalanceQuincena: { loading: false, error: false, result: '', actions: [] },
  rebalanceSemana: { loading: false, error: false, result: '', actions: [] }
};

function clonarJSONSeguro(data) {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch(_e) {
    return null;
  }
}

function resolverDatosDefaultExternos() {
  let local = window.__FINANZAS_SEED_LOCAL_DATA__;
  let publico = window.__FINANZAS_SEED_DATA__;

  if(local && typeof local === 'object') return clonarJSONSeguro(local);
  if(publico && typeof publico === 'object') return clonarJSONSeguro(publico);

  return null;
}

const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const GOOGLE_OAUTH_DEFAULT_SCOPE = `openid profile email ${GOOGLE_DRIVE_APPDATA_SCOPE}`;
const DRIVE_SYNC_FILENAME = 'finanzas-sync-v1.json';
const DRIVE_SYNC_TRACE_LIMIT = 50;
const DRIVE_SYNC_KDF_ITERATIONS = 120000;

const datosDefault = resolverDatosDefaultExternos() || {
  ingresosList: [],
  primasList: [],
  compromisos: [],
  lineaTiempoGuardada: ["Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"],
  iaConfig: {
    mode: 'off',
    providerLocalEndpoint: 'http://localhost:11434/api/generate',
    providerLocalModel: 'llama3.1:8b',
    providerApiEndpoint: '',
    providerApiName: 'generic',
    providerApiModel: 'gpt-4.1-mini',
    providerApiKey: '',
    apiDailyTokenLimit: 80000,
    apiMonthlyTokenLimit: 1200000,
    apiDailyCopLimit: 20000,
    apiMonthlyCopLimit: 200000,
    apiEstimatedCopPer1kTokens: 40,
    timeoutMs: 45000,
    retries: 1,
    updatedAt: null
  },
  iaUsage: {
    dayKey: null,
    monthKey: null,
    dailyRequests: 0,
    monthlyRequests: 0,
    dailyTokens: 0,
    monthlyTokens: 0,
    dailyCostCop: 0,
    monthlyCostCop: 0,
    lastRequestAt: null
  },
  iaHistory: {
    version: 1,
    lastEventAt: null,
    events: []
  },
  googleAuth: {
    provider: 'google',
    clientId: '',
    scope: GOOGLE_OAUTH_DEFAULT_SCOPE,
    session: null,
    lastError: ''
  },
  driveSync: {
    fileId: null,
    localDeviceId: '',
    encryptionEnabled: false,
    lastKnownRemoteVersion: 0,
    lastKnownRemoteChecksum: '',
    lastSyncAt: null,
    lastError: '',
    syncInProgress: false,
    syncEvents: []
  }
};

const STORAGE_KEY = 'finanzas_linea_tiempo_v7';
const STORAGE_BACKUP_KEY = 'finanzas_linea_tiempo_v7_backup';
const STORAGE_LAST_SAVE_KEY = 'finanzas_linea_tiempo_v7_last_save';
const IDB_NAME = 'financial_app_db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv';
const APP_SCHEMA_VERSION = 5;
const IA_MODES = ['off', 'local', 'api'];
const IA_ACTION_SCHEMA_VERSION = 1;
const IA_ACTION_TYPES = ['reducir', 'posponer', 'mover_tramo'];
let iaApiKeyRuntime = '';

const APP_SCHEMA_MIGRATORS = {
  1: (data) => {
    if(!Array.isArray(data.ingresosList)) data.ingresosList = [];
    if(!Array.isArray(data.compromisos)) data.compromisos = [];
    if(!Array.isArray(data.primasList)) data.primasList = [];
    if(!Array.isArray(data.lineaTiempoGuardada) || data.lineaTiempoGuardada.length === 0) {
      data.lineaTiempoGuardada = [...mesesLineaTiempo];
    }
    if(!data.migraciones || typeof data.migraciones !== 'object') data.migraciones = {};
    return data;
  },
  2: (data) => {
    let mesBase = (Array.isArray(data.lineaTiempoGuardada) && data.lineaTiempoGuardada[0])
      ? data.lineaTiempoGuardada[0]
      : 'Junio 2026';

    if(Array.isArray(data.ingresosList)) {
      data.ingresosList.forEach((ing) => {
        if(!ing || typeof ing !== 'object') return;
        if(!ing.mesInicio) ing.mesInicio = mesBase;
        if(ing.mesFin === undefined) ing.mesFin = null;
        if(ing.mesFinIndefinido === undefined) {
          ing.mesFinIndefinido = !ing.mesFin;
        }
      });
    }
    return data;
  },
  3: (data) => {
    if(Array.isArray(data.compromisos)) {
      data.compromisos.forEach((comp) => {
        if(!comp || typeof comp !== 'object') return;
        if(comp.diaPagoReal === undefined || comp.diaPagoReal === '') {
          comp.diaPagoReal = null;
          return;
        }
        let diaPagoReal = parseInt(comp.diaPagoReal, 10);
        if(Number.isNaN(diaPagoReal) || diaPagoReal < 1 || diaPagoReal > 31) {
          comp.diaPagoReal = null;
        } else {
          comp.diaPagoReal = diaPagoReal;
        }
      });
    }

    if(!data.iaHistory || typeof data.iaHistory !== 'object') {
      data.iaHistory = { version: 1, lastEventAt: null, events: [] };
    }
    if(!Array.isArray(data.iaHistory.events)) data.iaHistory.events = [];
    if(typeof data.iaHistory.version !== 'number' || data.iaHistory.version < 1) data.iaHistory.version = 1;
    if(typeof data.iaHistory.lastEventAt !== 'string') data.iaHistory.lastEventAt = null;
    return data;
  },
  4: (data) => {
    if(!data.googleAuth || typeof data.googleAuth !== 'object') {
      data.googleAuth = {
        provider: 'google',
        clientId: '',
        scope: GOOGLE_OAUTH_DEFAULT_SCOPE,
        session: null,
        lastError: ''
      };
    }
    if(typeof data.googleAuth.provider !== 'string' || !data.googleAuth.provider.trim()) data.googleAuth.provider = 'google';
    if(typeof data.googleAuth.clientId !== 'string') data.googleAuth.clientId = '';
    if(typeof data.googleAuth.scope !== 'string' || !data.googleAuth.scope.trim()) {
      data.googleAuth.scope = GOOGLE_OAUTH_DEFAULT_SCOPE;
    }
    if(!data.googleAuth.session || typeof data.googleAuth.session !== 'object') data.googleAuth.session = null;
    if(typeof data.googleAuth.lastError !== 'string') data.googleAuth.lastError = '';
    return data;
  },
  5: (data) => {
    if(!data.driveSync || typeof data.driveSync !== 'object') {
      data.driveSync = {
        fileId: null,
        localDeviceId: '',
        encryptionEnabled: false,
        lastKnownRemoteVersion: 0,
        lastKnownRemoteChecksum: '',
        lastSyncAt: null,
        lastError: '',
        syncInProgress: false,
        syncEvents: []
      };
    }
    return data;
  }
};

let appData = aplicarMigracionesSchema(JSON.parse(localStorage.getItem(STORAGE_KEY)) || datosDefault);
let idbReady = false;
let idbPromise = null;

normalizarEstadoCargado();

const ORDEN_MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatCOP(val) { return '$' + Math.round(val).toLocaleString('es-CO'); }

function aplicarMigracionesSchema(dataIn) {
  let data = dataIn && typeof dataIn === 'object'
    ? dataIn
    : JSON.parse(JSON.stringify(datosDefault));

  let versionActual = Number.isInteger(data.schemaVersion) ? data.schemaVersion : 0;
  while(versionActual < APP_SCHEMA_VERSION) {
    let versionObjetivo = versionActual + 1;
    let migrador = APP_SCHEMA_MIGRATORS[versionObjetivo];
    if(typeof migrador === 'function') {
      data = migrador(data) || data;
    }
    data.schemaVersion = versionObjetivo;
    versionActual = versionObjetivo;
  }

  return data;
}

function normalizarEstadoCargado() {
  if(appData.lineaTiempoGuardada) { mesesLineaTiempo = appData.lineaTiempoGuardada; }
  if(!Array.isArray(appData.primasList)) appData.primasList = [];
  if(!appData.migraciones || typeof appData.migraciones !== 'object') appData.migraciones = {};
  if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};
  if(!IA_MODES.includes(appData.iaConfig.mode)) appData.iaConfig.mode = 'off';
  if(typeof appData.iaConfig.providerLocalEndpoint !== 'string' || !appData.iaConfig.providerLocalEndpoint.trim()) {
    appData.iaConfig.providerLocalEndpoint = 'http://localhost:11434/api/generate';
  }
  if(typeof appData.iaConfig.providerLocalModel !== 'string' || !appData.iaConfig.providerLocalModel.trim()) {
    appData.iaConfig.providerLocalModel = 'llama3.1:8b';
  }
  if(typeof appData.iaConfig.providerApiEndpoint !== 'string') appData.iaConfig.providerApiEndpoint = '';
  if(typeof appData.iaConfig.providerApiName !== 'string' || !appData.iaConfig.providerApiName.trim()) appData.iaConfig.providerApiName = 'generic';
  if(typeof appData.iaConfig.providerApiModel !== 'string' || !appData.iaConfig.providerApiModel.trim()) appData.iaConfig.providerApiModel = 'gpt-4.1-mini';
  if(typeof appData.iaConfig.providerApiKey !== 'string') appData.iaConfig.providerApiKey = '';
  if(appData.iaConfig.providerApiKey) {
    guardarApiKeySesionIA(appData.iaConfig.providerApiKey);
    appData.iaConfig.providerApiKey = '';
  }
  let timeoutNum = parseInt(appData.iaConfig.timeoutMs, 10);
  let timeoutNormalizado = isNaN(timeoutNum) ? 45000 : Math.min(Math.max(timeoutNum, 10000), 180000);
  // Migra configuraciones legacy de 12s, insuficientes para primer arranque de modelos locales.
  if(timeoutNormalizado === 12000) timeoutNormalizado = 45000;
  appData.iaConfig.timeoutMs = timeoutNormalizado;
  let retriesNum = parseInt(appData.iaConfig.retries, 10);
  appData.iaConfig.retries = isNaN(retriesNum) ? 1 : Math.min(Math.max(retriesNum, 0), 4);
  let apiDailyTokenLimitNum = parseInt(appData.iaConfig.apiDailyTokenLimit, 10);
  appData.iaConfig.apiDailyTokenLimit = Math.max(0, isNaN(apiDailyTokenLimitNum) ? 80000 : apiDailyTokenLimitNum);
  let apiMonthlyTokenLimitNum = parseInt(appData.iaConfig.apiMonthlyTokenLimit, 10);
  appData.iaConfig.apiMonthlyTokenLimit = Math.max(0, isNaN(apiMonthlyTokenLimitNum) ? 1200000 : apiMonthlyTokenLimitNum);
  let apiDailyCopLimitNum = parseInt(appData.iaConfig.apiDailyCopLimit, 10);
  appData.iaConfig.apiDailyCopLimit = Math.max(0, isNaN(apiDailyCopLimitNum) ? 20000 : apiDailyCopLimitNum);
  let apiMonthlyCopLimitNum = parseInt(appData.iaConfig.apiMonthlyCopLimit, 10);
  appData.iaConfig.apiMonthlyCopLimit = Math.max(0, isNaN(apiMonthlyCopLimitNum) ? 200000 : apiMonthlyCopLimitNum);
  let apiEstimatedCopPer1kTokensNum = parseInt(appData.iaConfig.apiEstimatedCopPer1kTokens, 10);
  appData.iaConfig.apiEstimatedCopPer1kTokens = Math.max(1, isNaN(apiEstimatedCopPer1kTokensNum) ? 40 : apiEstimatedCopPer1kTokensNum);
  if(!appData.iaConfig.updatedAt) appData.iaConfig.updatedAt = null;

  if(!appData.iaUsage || typeof appData.iaUsage !== 'object') appData.iaUsage = {};
  if(typeof appData.iaUsage.dayKey !== 'string') appData.iaUsage.dayKey = null;
  if(typeof appData.iaUsage.monthKey !== 'string') appData.iaUsage.monthKey = null;
  appData.iaUsage.dailyRequests = Math.max(0, parseInt(appData.iaUsage.dailyRequests, 10) || 0);
  appData.iaUsage.monthlyRequests = Math.max(0, parseInt(appData.iaUsage.monthlyRequests, 10) || 0);
  appData.iaUsage.dailyTokens = Math.max(0, parseInt(appData.iaUsage.dailyTokens, 10) || 0);
  appData.iaUsage.monthlyTokens = Math.max(0, parseInt(appData.iaUsage.monthlyTokens, 10) || 0);
  appData.iaUsage.dailyCostCop = Math.max(0, Math.round(parseMontoInput(appData.iaUsage.dailyCostCop)) || 0);
  appData.iaUsage.monthlyCostCop = Math.max(0, Math.round(parseMontoInput(appData.iaUsage.monthlyCostCop)) || 0);
  if(typeof appData.iaUsage.lastRequestAt !== 'string') appData.iaUsage.lastRequestAt = null;

  if(!appData.iaHistory || typeof appData.iaHistory !== 'object') {
    appData.iaHistory = { version: 1, lastEventAt: null, events: [] };
  }
  if(typeof appData.iaHistory.version !== 'number' || appData.iaHistory.version < 1) appData.iaHistory.version = 1;
  if(typeof appData.iaHistory.lastEventAt !== 'string') appData.iaHistory.lastEventAt = null;
  if(!Array.isArray(appData.iaHistory.events)) appData.iaHistory.events = [];

  if(Array.isArray(appData.compromisos)) {
    appData.compromisos.forEach((comp) => {
      if(!comp || typeof comp !== 'object') return;
      if(comp.diaPagoReal === null || comp.diaPagoReal === undefined || comp.diaPagoReal === '') {
        comp.diaPagoReal = null;
        return;
      }
      let dpr = parseInt(comp.diaPagoReal, 10);
      comp.diaPagoReal = (!isNaN(dpr) && dpr >= 1 && dpr <= 31) ? dpr : null;
    });
  }

  if(!appData.googleAuth || typeof appData.googleAuth !== 'object') {
    appData.googleAuth = {
      provider: 'google',
      clientId: '',
      scope: GOOGLE_OAUTH_DEFAULT_SCOPE,
      session: null,
      lastError: ''
    };
  }
  if(typeof appData.googleAuth.provider !== 'string' || !appData.googleAuth.provider.trim()) appData.googleAuth.provider = 'google';
  if(typeof appData.googleAuth.clientId !== 'string') appData.googleAuth.clientId = '';
  if(typeof appData.googleAuth.scope !== 'string' || !appData.googleAuth.scope.trim()) {
    appData.googleAuth.scope = GOOGLE_OAUTH_DEFAULT_SCOPE;
  }
  if(typeof appData.googleAuth.lastError !== 'string') appData.googleAuth.lastError = '';
  if(!appData.googleAuth.session || typeof appData.googleAuth.session !== 'object') {
    appData.googleAuth.session = null;
  } else if(appData.googleAuth.session.accessToken) {
    // Keep bearer tokens runtime-only; do not persist inside app data.
    delete appData.googleAuth.session.accessToken;
  }

  if(!appData.driveSync || typeof appData.driveSync !== 'object') {
    appData.driveSync = {
      fileId: null,
      localDeviceId: '',
      encryptionEnabled: false,
      lastKnownRemoteVersion: 0,
      lastKnownRemoteChecksum: '',
      lastSyncAt: null,
      lastError: '',
      syncInProgress: false,
      syncEvents: []
    };
  }
  if(typeof appData.driveSync.fileId !== 'string' || !appData.driveSync.fileId.trim()) appData.driveSync.fileId = null;
  if(typeof appData.driveSync.localDeviceId !== 'string') appData.driveSync.localDeviceId = '';
  appData.driveSync.encryptionEnabled = !!appData.driveSync.encryptionEnabled;
  appData.driveSync.lastKnownRemoteVersion = Math.max(0, parseInt(appData.driveSync.lastKnownRemoteVersion, 10) || 0);
  if(typeof appData.driveSync.lastKnownRemoteChecksum !== 'string') appData.driveSync.lastKnownRemoteChecksum = '';
  if(typeof appData.driveSync.lastSyncAt !== 'string') appData.driveSync.lastSyncAt = null;
  if(typeof appData.driveSync.lastError !== 'string') appData.driveSync.lastError = '';
  appData.driveSync.syncInProgress = !!appData.driveSync.syncInProgress;
  if(!Array.isArray(appData.driveSync.syncEvents)) appData.driveSync.syncEvents = [];
  appData.driveSync.syncEvents = appData.driveSync.syncEvents.slice(-DRIVE_SYNC_TRACE_LIMIT);
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
    statusEl.innerText = `Sesión activa${email ? ` · ${email}` : ''}. Expira: ${exp}.`;
  } else if(session && session.accessToken) {
    statusEl.innerText = 'Sesión expirada. Inicia sesión de nuevo o refresca token.';
  } else {
    statusEl.innerText = 'Sesión no iniciada.';
  }

  errorEl.innerText = appData.googleAuth && appData.googleAuth.lastError ? appData.googleAuth.lastError : '';
}

let googleOAuthTokenClient = null;
let googleOAuthTokenClientClientId = '';
let googleOAuthPendingRequest = null;
let googleOAuthAccessTokenRuntime = '';

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
    setErrorGoogleOAuth('Configura el Client ID de Google antes de iniciar sesión.');
    renderGoogleAuthConfig();
    throw new Error('Configura el Client ID de Google antes de iniciar sesión.');
  }

  if(!googleSDKDisponible()) {
    setErrorGoogleOAuth('Google Identity Services no está disponible todavía. Recarga la página e intenta de nuevo.');
    renderGoogleAuthConfig();
    throw new Error('Google Identity Services no está disponible todavía.');
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
    googleOAuthPendingRequest.reject(new Error('Se inició una nueva solicitud OAuth.'));
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
    throw new Error('Web Crypto no está disponible para cifrar el respaldo remoto.');
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
    throw new Error('No hay metadatos de cifrado válidos en el snapshot remoto.');
  }
  if(!(window.crypto && crypto.subtle)) {
    throw new Error('Web Crypto no está disponible para descifrar el respaldo remoto.');
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
    statusEl.innerText = i18nT('config.driveSyncLastOk', {
      date: new Date(state.lastSyncAt).toLocaleString('es-CO')
    }, `Última sincronización exitosa: ${new Date(state.lastSyncAt).toLocaleString('es-CO')}.`);
  } else {
    statusEl.innerText = i18nT('config.driveSyncIdle', {}, 'Aún no hay sincronización con Drive.');
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
  if(!token) throw new Error('No hay sesión OAuth activa para Drive.');

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
    let prompted = prompt('El respaldo remoto está cifrado. Ingresa la passphrase para descifrarlo:');
    passphrase = String(prompted || '').trim();
  }
  if(!passphrase) throw new Error('Se requiere passphrase para descifrar el respaldo remoto.');
  return decryptDriveSyncData(remoteEnvelope, passphrase);
}

function sanitizarSnapshotReplicadoDriveSync(dataObj) {
  let snapshot = clonarJSONSeguro(dataObj);
  if(!snapshot || typeof snapshot !== 'object') return {};
  delete snapshot.driveSync;
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

  if(!isGoogleOAuthSessionActive()) throw new Error('No se pudo obtener una sesión activa de Google.');
  return getGoogleOAuthSession();
}

async function sincronizarDriveConGoogle(options = {}) {
  let dryRun = !!options.dryRun;
  let forcePull = !!options.forcePull;
  let state = getDriveSyncState();
  if(state.syncInProgress) return { ok: false, reason: 'already-running' };

  state.syncInProgress = true;
  state.lastError = '';
  syncDriveEncryptionFlagFromUI();
  appendDriveSyncEvent('sync-start', { dryRun, forcePull, encryptionEnabled: state.encryptionEnabled });
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  renderDriveSyncStatus();

  try {
    await asegurarSesionGoogleParaDrive();
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
      if(!remoteEnvelope) throw new Error('No hay snapshot remoto en Drive para recuperar.');

      let remoteData = await resolveDriveEnvelopeData(remoteEnvelope);
      if(!validarPayloadRespaldo(remoteData)) {
        throw new Error('El snapshot remoto de Drive es inválido o está corrupto.');
      }
      await validarChecksumEnvelopeDriveSync(remoteEnvelope, remoteData);
      remoteChecksum = await generarChecksumSnapshotDriveSync(remoteData);

      if(dryRun) {
        return { ok: true, dryRun: true, action: 'force-pull-ready', remoteVersion };
      }

      appData = aplicarMigracionesSchema(remoteData);
      normalizarEstadoCargado();
      persistirDataPrincipalConFallback();
      persistirAuxiliaresConFallback(new Date().toISOString());
      initApp({ skipDataNormalization: false });

      let refreshedState = getDriveSyncState();
      refreshedState.lastKnownRemoteVersion = remoteVersion;
      refreshedState.lastKnownRemoteChecksum = remoteChecksum;
      refreshedState.lastSyncAt = new Date().toISOString();
      appendDriveSyncEvent('force-pull-applied', {
        remoteVersion,
        remoteChecksum
      });

      return { ok: true, action: 'force-pulled', remoteVersion };
    }

    if(plan.needsPull) {
      let remoteData = await resolveDriveEnvelopeData(remoteEnvelope);
      if(!remoteEnvelope || !validarPayloadRespaldo(remoteData)) {
        throw new Error('Se detectaron cambios remotos, pero el snapshot remoto no es válido.');
      }
      await validarChecksumEnvelopeDriveSync(remoteEnvelope, remoteData);
      remoteChecksum = await generarChecksumSnapshotDriveSync(remoteData);

      if(dryRun) {
        return { ok: true, dryRun: true, action: 'pull-required', remoteVersion };
      }

      let confirmarPull = confirm('Se detectaron cambios remotos más recientes en Drive. Aceptar: usar versión remota. Cancelar: mantener local y sobrescribir remoto.');
      if(!confirmarPull) {
        let confirmarSobrescritura = confirm('Se sobrescribirá la versión remota con tu estado local actual. ¿Deseas continuar?');
        if(!confirmarSobrescritura) {
          throw new Error('Sincronización cancelada para evitar sobrescritura silenciosa.');
        }
        appendDriveSyncEvent('conflict-resolved-local-wins', {
          remoteVersion,
          localChecksum,
          remoteChecksum
        });
      } else {
        appData = aplicarMigracionesSchema(remoteData);
        normalizarEstadoCargado();
        persistirDataPrincipalConFallback();
        persistirAuxiliaresConFallback(new Date().toISOString());
        initApp({ skipDataNormalization: false });
        alert('Se descargó la versión remota de Drive. Vuelve a ejecutar sincronizar para subir cambios locales nuevos.');
        let refreshedState = getDriveSyncState();
        refreshedState.lastKnownRemoteVersion = remoteVersion;
        refreshedState.lastKnownRemoteChecksum = remoteChecksum;
        refreshedState.lastSyncAt = new Date().toISOString();
        appendDriveSyncEvent('conflict-resolved-remote-wins', {
          remoteVersion,
          remoteChecksum
        });
        return { ok: true, action: 'pulled-remote', remoteVersion };
      }
    }

    if(dryRun) {
      return { ok: true, dryRun: true, action: 'push-ready', remoteVersion };
    }

    if(state.fileId) {
      let refreshedRemoteEnvelope = await downloadDriveSyncEnvelope(state.fileId);
      let refreshedRemoteVersion = Math.max(0, parseInt(refreshedRemoteEnvelope && refreshedRemoteEnvelope.version, 10) || 0);
      let refreshedRemoteChecksum = await resolverChecksumComparacionDriveSync(
        refreshedRemoteEnvelope,
        refreshedRemoteEnvelope && refreshedRemoteEnvelope.checksum
      );
      let refreshedPlan = evaluarPlanSyncDrive({
        remoteVersion: refreshedRemoteVersion,
        remoteChecksum: refreshedRemoteChecksum,
        localChecksum,
        lastKnownRemoteVersion: state.lastKnownRemoteVersion
      });

      if(
        refreshedPlan.needsPull
        || refreshedPlan.reason === 'diverged-same-version'
        || refreshedRemoteVersion !== remoteVersion
        || refreshedRemoteChecksum !== remoteChecksum
      ) {
        throw new Error('El snapshot remoto cambió antes de subirse a Drive. Vuelve a sincronizar para revalidar el estado remoto.');
      }
    }

    let uploadEnvelope = await buildDriveSyncEnvelope(remoteVersion);
    let uploadResult = await uploadDriveSyncEnvelope(state.fileId || null, uploadEnvelope);

    state.fileId = uploadResult && uploadResult.id ? uploadResult.id : (state.fileId || null);
    state.lastKnownRemoteVersion = uploadEnvelope.version;
    state.lastKnownRemoteChecksum = uploadEnvelope.checksum;
    state.lastSyncAt = uploadEnvelope.updatedAt;
    state.lastError = '';
    appendDriveSyncEvent('sync-pushed', {
      version: uploadEnvelope.version,
      encryptionEnabled: !!uploadEnvelope.encryption
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
      persistirDataPrincipalConFallback();
      persistirAuxiliaresConFallback(new Date().toISOString());
      renderDriveSyncStatus();

      return sincronizarDriveConGoogle({ ...options, _scopeRetryDone: true });
    }

    let mensaje = err && err.message ? err.message : 'Error desconocido durante sincronización con Drive.';
    setDriveSyncError(mensaje);
    appendDriveSyncEvent('sync-error', { message: mensaje });
    renderDriveSyncStatus();
    throw err;
  } finally {
    let latestState = getDriveSyncState();
    latestState.syncInProgress = false;
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

function parseMontoInput(valor) {
  if(typeof valor === 'number') return isNaN(valor) ? NaN : valor;
  let limpio = String(valor || '')
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  if(!limpio || limpio === '-' || limpio === '.') return NaN;
  let n = Number(limpio);
  return isNaN(n) ? NaN : n;
}

function aplicarFormatoMonedaInputs() {
  document.querySelectorAll('input.money-input').forEach(inp => {
    if(document.activeElement === inp) return;
    let n = parseMontoInput(inp.value);
    inp.value = isNaN(n) ? '' : formatCOP(n);
  });
}

document.addEventListener('focusin', (e) => {
  let inp = e.target;
  if(!(inp instanceof HTMLInputElement) || !inp.classList.contains('money-input')) return;
  let n = parseMontoInput(inp.value);
  inp.value = isNaN(n) ? '' : String(Math.round(n));
});

document.addEventListener('focusout', (e) => {
  let inp = e.target;
  if(!(inp instanceof HTMLInputElement) || !inp.classList.contains('money-input')) return;
  let n = parseMontoInput(inp.value);
  inp.value = isNaN(n) ? '' : formatCOP(n);
});

function validarPayloadRespaldo(payload) {
  return window.FinancialData.validateBackupPayload(payload);
}

async function sha256Hex(texto) {
  return window.FinancialData.sha256Hex(texto);
}

function hashFallbackHex(texto) {
  return window.FinancialData.hashFallbackHex(texto);
}

async function generarChecksumPayload(dataObj) {
  return window.FinancialData.generatePayloadChecksum(dataObj);
}

async function asegurarChecksumPayload(backupPayload) {
  if(!backupPayload || typeof backupPayload !== 'object') return '';
  let checksum = String(backupPayload.checksum || '').trim();
  if(checksum) return checksum;
  checksum = await generarChecksumPayload(backupPayload.data);
  backupPayload.checksum = checksum;
  return checksum;
}

async function validarChecksumBackup(backupObj) {
  return window.FinancialData.validateBackupChecksum(backupObj);
}

function buildBackupPayload() {
  return window.FinancialData.buildBackupPayload();
}

function renderUltimoGuardado() {
  return window.FinancialRender.renderLastSavedIndicator();
}

async function exportarRespaldoJSON() {
  try {
    let payload = buildBackupPayload();
    payload.checksum = await generarChecksumPayload(payload.data);
    let blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    let a = document.createElement('a');
    let url = URL.createObjectURL(blob);
    let fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `respaldo-finanzas-${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(_e) {
    alert('No se pudo exportar el respaldo.');
  }
}

function importarRespaldoArchivo(event) {
  let file = event && event.target && event.target.files ? event.target.files[0] : null;
  if(!file) return;

  let reader = new FileReader();
  reader.onload = async function() {
    try {
      let raw = JSON.parse(String(reader.result || '{}'));

      if(raw && raw.data) {
        if(typeof raw.checksum !== 'string' || !raw.checksum.trim()) {
          alert('El archivo no incluye checksum. Por seguridad, esta importacion se bloqueo.');
          return;
        }
        let checksumOk = await validarChecksumBackup(raw);
        if(!checksumOk) {
          alert('El archivo de respaldo parece alterado o corrupto (checksum invalido).');
          return;
        }
      }

      let candidato = validarPayloadRespaldo(raw) ? raw : raw.data;
      if(!validarPayloadRespaldo(candidato)) {
        let parcial = window.FinancialData && typeof window.FinancialData.sanitizePrimaryData === 'function'
          ? window.FinancialData.sanitizePrimaryData(candidato || raw, { strict: false })
          : null;
        if(!parcial) {
          alert('El archivo no tiene un formato de respaldo válido.');
          return;
        }
        if(window.FinancialData && typeof window.FinancialData.tracePersistenceError === 'function') {
          window.FinancialData.tracePersistenceError('import.partial_recovery', new Error('Respaldo importado parcialmente'), { source: 'file' });
        }
        candidato = parcial;
        alert('El respaldo tenía bloques inválidos. Se recuperó parcialmente la información válida.');
      }
      appData = aplicarMigracionesSchema(candidato);
      if(!appData.migraciones || typeof appData.migraciones !== 'object') appData.migraciones = {};
      mesesLineaTiempo = appData.lineaTiempoGuardada;
      diaSeleccionadoActivo = null;
      semanaSeleccionadaIndex = 0;
      mesActivoGlobal = mesesLineaTiempo.includes('Junio 2026') ? 'Junio 2026' : (mesesLineaTiempo[0] || mesActivoGlobal);
      initApp();
      alert('Respaldo importado correctamente.');
    } catch(_e) {
      alert('No se pudo leer el archivo de respaldo.');
    } finally {
      if(event && event.target) event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function restaurarUltimoRespaldoLocal() {
  try {
    let raw = localStorage.getItem(STORAGE_BACKUP_KEY);
    if(!raw) {
      alert('No hay auto-respaldo local disponible.');
      return;
    }
    let payload = JSON.parse(raw);

    if(payload && payload.data) {
      if(typeof payload.checksum !== 'string' || !payload.checksum.trim()) {
        alert('El auto-respaldo local no tiene checksum y no se puede restaurar con seguridad.');
        return;
      }
      let checksumOk = await validarChecksumBackup(payload);
      if(!checksumOk) {
        alert('El auto-respaldo local no paso validacion de checksum.');
        return;
      }
    }

    let candidato = payload && payload.data ? payload.data : payload;
    if(!validarPayloadRespaldo(candidato)) {
      let parcial = window.FinancialData && typeof window.FinancialData.sanitizePrimaryData === 'function'
        ? window.FinancialData.sanitizePrimaryData(candidato || payload, { strict: false })
        : null;
      if(!parcial) {
        alert('El auto-respaldo local está incompleto.');
        return;
      }
      if(window.FinancialData && typeof window.FinancialData.tracePersistenceError === 'function') {
        window.FinancialData.tracePersistenceError('restore.partial_recovery', new Error('Auto-respaldo restaurado parcialmente'), { source: 'local_backup' });
      }
      candidato = parcial;
      alert('El auto-respaldo tenía bloques inválidos. Se restauró parcialmente la información válida.');
    }
    appData = aplicarMigracionesSchema(candidato);
    if(!appData.migraciones || typeof appData.migraciones !== 'object') appData.migraciones = {};
    mesesLineaTiempo = appData.lineaTiempoGuardada;
    diaSeleccionadoActivo = null;
    semanaSeleccionadaIndex = 0;
    mesActivoGlobal = mesesLineaTiempo.includes('Junio 2026') ? 'Junio 2026' : (mesesLineaTiempo[0] || mesActivoGlobal);
    initApp();
    alert('Se restauró el último auto-respaldo local.');
  } catch(_e) {
    alert('No se pudo restaurar el auto-respaldo local.');
  }
}

function escapeHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCompromisosMesActual() {
  return appData.compromisos.filter(c => c.mesKey === mesActivoGlobal);
}

function getDiaIngreso(ing) {
  let dia = parseInt(ing.diaPago, 10);
  if(!isNaN(dia) && dia >= 1 && dia <= 31) return dia;
  if(ing.periodo === 'biweekly') return 14;
  if(ing.periodo === 'q1') return 7;
  if(ing.periodo === 'q2') return 22;
  return 15;
}

function normalizarIngresosConDia() {
  appData.ingresosList.forEach(i => {
    i.diaPago = getDiaIngreso(i);
    if(!esMesKeyValido(i.mesInicio)) {
      i.mesInicio = mesesLineaTiempo[0] || mesActivoGlobal;
    }
    if(i.mesFin === '' || i.mesFin === null || i.mesFin === undefined) {
      i.mesFin = null;
    }
    if(i.mesFinIndefinido === undefined) {
      i.mesFinIndefinido = !esMesKeyValido(i.mesFin);
    }
    if(i.mesFinIndefinido) {
      i.mesFin = null;
    } else if(!esMesKeyValido(i.mesFin)) {
      i.mesFin = i.mesInicio;
    }
    if(i.mesFin && mesKeyToIndex(i.mesFin) < mesKeyToIndex(i.mesInicio)) {
      i.mesFin = i.mesInicio;
    }
    if(i.periodo === 'biweekly' && !i.anchorDate) {
      let baseMes = i.mesInicio || mesesLineaTiempo[0] || mesActivoGlobal;
      let { mes, anio } = parseMesKey(baseMes);
      let mesIdx = ORDEN_MESES.indexOf(mes);
      let day = Math.min(i.diaPago, new Date(anio, mesIdx + 1, 0).getDate());
      i.anchorDate = siguienteViernes(new Date(anio, mesIdx, day)).toISOString().slice(0, 10);
    }
  });
}

function esMesKeyValido(mesKey) {
  return window.FinancialRules.isValidMesKey(mesKey);
}

function obtenerMesInicioIngreso(ing) {
  return window.FinancialRules.getIncomeStartMonth(ing);
}

function obtenerMesFinIngreso(ing) {
  return window.FinancialRules.getIncomeEndMonth(ing);
}

function ingresoActivoEnMes(ing, mesKey) {
  return window.FinancialRules.isIncomeActiveInMonth(ing, mesKey);
}

function parseMesKey(mesKey) {
  return window.FinancialRules.parseMesKeySafe(mesKey);
}

function mesKeyToIndex(mesKey) {
  return window.FinancialRules.mesKeyToNumericIndex(mesKey);
}

function indexToMesKey(indexMes) {
  return window.FinancialRules.numericIndexToMesKey(indexMes);
}

function sumarMesesMesKey(mesKey, cantidad) {
  return window.FinancialRules.addMonthsToMesKey(mesKey, cantidad);
}

function asegurarLineaTiempoHastaMes(mesKeyObjetivo) {
  return window.FinancialRules.ensureTimelineUntilMonth(mesKeyObjetivo);
}

function obtenerMaxIdNumericoCompromisos() {
  return appData.compromisos.reduce((mx, c) => {
    let n = typeof c.id === 'number' ? c.id : parseInt(c.id, 10);
    return !isNaN(n) ? Math.max(mx, n) : mx;
  }, 0);
}

function aplicarCorreccionMesBaseSiAplica() {
  if(!appData.migraciones || typeof appData.migraciones !== 'object') appData.migraciones = {};
  if(appData.migraciones.correccionMesBaseJunio2026) return;

  function desplazarMesKey(mesKey) {
    if(!esMesKeyValido(mesKey)) return mesKey;
    return sumarMesesMesKey(mesKey, 1);
  }

  if(Array.isArray(mesesLineaTiempo)) {
    mesesLineaTiempo = mesesLineaTiempo.map(desplazarMesKey);
  }

  if(Array.isArray(appData.lineaTiempoGuardada)) {
    appData.lineaTiempoGuardada = appData.lineaTiempoGuardada.map(desplazarMesKey);
  }

  if(Array.isArray(appData.compromisos)) {
    appData.compromisos.forEach(c => {
      c.mesKey = desplazarMesKey(c.mesKey);
    });
  }

  if(Array.isArray(appData.primasList)) {
    appData.primasList.forEach(p => {
      p.mesKey = desplazarMesKey(p.mesKey);
    });
  }

  if(Array.isArray(appData.ingresosList)) {
    appData.ingresosList.forEach(i => {
      if(esMesKeyValido(i.mesInicio)) i.mesInicio = desplazarMesKey(i.mesInicio);
      if(esMesKeyValido(i.mesFin)) i.mesFin = desplazarMesKey(i.mesFin);
    });
  }

  if(esMesKeyValido(mesActivoGlobal)) {
    mesActivoGlobal = desplazarMesKey(mesActivoGlobal);
  }

  appData.migraciones.correccionMesBaseJunio2026 = true;
}

function normalizarRecurrenciasCompromisos() {
  if(!Array.isArray(appData.compromisos)) return;

  let manuales = appData.compromisos.filter(c => !c.autoGenerado);
  let generadosPrevios = appData.compromisos.filter(c => c.autoGenerado);
  let prevByKey = new Map(generadosPrevios.map(c => [`${c.recurringKey}|${c.mesKey}`, c]));

  manuales.forEach(c => {
    if((c.tipo === 'fijo' || c.tipo === 'credito') && !c.recurringKey) {
      c.recurringKey = `rec-${c.id}`;
    }
  });

  let siguienteId = obtenerMaxIdNumericoCompromisos() + 1;
  let nuevos = [];

  function existeManual(recurringKey, mesKey) {
    return manuales.some(m => m.recurringKey === recurringKey && m.mesKey === mesKey);
  }

  function pushGenerado(seed, mesKey, faltantesCredito = null) {
    if(!seed.recurringKey) return;
    if(existeManual(seed.recurringKey, mesKey)) return;

    let k = `${seed.recurringKey}|${mesKey}`;
    let previo = prevByKey.get(k);
    let nuevo = {
      ...seed,
      id: previo ? previo.id : siguienteId++,
      mesKey,
      pagado: previo ? !!previo.pagado : false,
      autoGenerado: true
    };

    if(nuevo.tipo !== 'credito') {
      delete nuevo.faltantes;
      delete nuevo.totales;
    } else {
      nuevo.faltantes = faltantesCredito;
      nuevo.totales = seed.totales;
    }

    nuevos.push(nuevo);
  }

  manuales.forEach(seed => {
    if(seed.tipo === 'credito') {
      let faltantesBase = Math.max(1, parseInt(seed.faltantes, 10) || 1);
      let totalesBase = Math.max(faltantesBase, parseInt(seed.totales, 10) || faltantesBase);
      seed.faltantes = faltantesBase;
      seed.totales = totalesBase;

      let mesesPorGenerar = Math.max(0, faltantesBase - 1);
      if(mesesPorGenerar > 0) {
        let ultimoMesCredito = sumarMesesMesKey(seed.mesKey, mesesPorGenerar);
        asegurarLineaTiempoHastaMes(ultimoMesCredito);
      }

      for(let paso = 1; paso <= mesesPorGenerar; paso++) {
        let faltantesMes = faltantesBase - paso;
        if(faltantesMes < 1) break;
        pushGenerado(seed, sumarMesesMesKey(seed.mesKey, paso), faltantesMes);
      }
    }

    if(seed.tipo === 'fijo') {
      let { anio } = parseMesKey(seed.mesKey);
      let mesFinAnio = `Diciembre ${anio}`;
      asegurarLineaTiempoHastaMes(mesFinAnio);

      let idxInicio = mesKeyToIndex(seed.mesKey);
      let idxFin = mesKeyToIndex(mesFinAnio);
      for(let idx = idxInicio + 1; idx <= idxFin; idx++) {
        pushGenerado(seed, indexToMesKey(idx));
      }
    }
  });

  appData.compromisos = [...manuales, ...nuevos];
  appData.lineaTiempoGuardada = mesesLineaTiempo;
}

function mesKeyAnterior(mesKey) {
  return window.FinancialRules.previousMesKey(mesKey);
}

function ultimoDiaHabilMes(anio, mesIdx) {
  return window.FinancialRules.lastBusinessDayOfMonth(anio, mesIdx);
}

function siguienteViernes(fecha) {
  return window.FinancialRules.nextFriday(fecha);
}

function normalizarDiaPagoDeMes(diaBase, anio, mesIdx, diasMes) {
  return window.FinancialRules.normalizeIncomeDayOfMonth(diaBase, anio, mesIdx, diasMes);
}

function obtenerDiasPagoIngresoEnMes(ing, mesKey) {
  return window.FinancialRules.getIncomePaymentDaysInMonth(ing, mesKey);
}

function obtenerDetalleDiasPagoMes(mesKey) {
  return window.FinancialRules.getMonthlyPaymentDayDetails(mesKey);
}

function obtenerEventosIngresoDelMes(mesKey) {
  return window.FinancialRules.getIncomeEventsForMonth(mesKey);
}

function calcularBalanceSemanal(compromisosMes, semana) {
  return window.FinancialRules.calculateWeeklyBalance(compromisosMes, semana);
}

function obtenerSemanasDelMesActivo() {
  return window.FinancialRules.getWeeksForActiveMonth();
}

function cambiarMesDeVisualizacion(nuevoMes) {
  deudasExpandState = new Set();
  ingresosExpandState = new Set();
  primasExpandState = new Set();
  return window.FinancialRender.changeDisplayedMonth(nuevoMes);
}

function extenderAnioLineaTiempo() {
  let partes = mesesLineaTiempo[mesesLineaTiempo.length - 1].split(" ");
  let proximoAnio = parseInt(partes[1]) + 1;
  ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].forEach(m => {
    mesesLineaTiempo.push(`${m} ${proximoAnio}`);
  });
  appData.lineaTiempoGuardada = mesesLineaTiempo;
  initApp();
  alert(`Línea de tiempo expandida hasta ${proximoAnio}`);
}

function actualizarSelectoresDeMes() {
  return window.FinancialRender.updateMonthSelectors();
}

function sw(id, btn) {
  return window.FinancialRender.switchScreen(id, btn);
}

function getModoIA() {
  if(!appData || !appData.iaConfig || !IA_MODES.includes(appData.iaConfig.mode)) return 'off';
  return appData.iaConfig.mode;
}

function textoModoIA(modo) {
  if(modo === 'local') return 'Modo LOCAL activo. Las consultas se envian a IA Local configurado abajo.';
  if(modo === 'api') return 'Modo API activo. Se habilitan llamadas a gateway/proveedor externo (TKT-012).';
  return 'Modo OFF activo. Toda llamada IA queda bloqueada.';
}

function normalizarEndpointOllama(endpointRaw) {
  let endpoint = String(endpointRaw || '').trim() || 'http://localhost:11434/api/generate';
  if(endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
  if(!endpoint.endsWith('/api/generate')) {
    endpoint = `${endpoint}/api/generate`;
  }
  return endpoint;
}

function getConfigIALocal() {
  let cfg = appData.iaConfig || {};
  return {
    endpoint: normalizarEndpointOllama(cfg.providerLocalEndpoint),
    model: String(cfg.providerLocalModel || 'llama3.1:8b').trim(),
    timeoutMs: Math.min(Math.max(parseInt(cfg.timeoutMs, 10) || 45000, 10000), 180000),
    retries: Math.min(Math.max(parseInt(cfg.retries, 10) || 1, 0), 4)
  };
}

function normalizarEndpointIAGateway(endpointRaw) {
  return String(endpointRaw || '').trim();
}

function leerApiKeySesionIA() {
  return String(iaApiKeyRuntime || '').trim();
}

function guardarApiKeySesionIA(apiKeyRaw) {
  iaApiKeyRuntime = String(apiKeyRaw || '').trim();
}

function getConfigIAApi() {
  let cfg = appData.iaConfig || {};
  return {
    endpoint: normalizarEndpointIAGateway(cfg.providerApiEndpoint),
    provider: String(cfg.providerApiName || 'generic').trim() || 'generic',
    model: String(cfg.providerApiModel || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini',
    apiKey: leerApiKeySesionIA() || String(cfg.providerApiKey || '').trim(),
    timeoutMs: Math.min(Math.max(parseInt(cfg.timeoutMs, 10) || 45000, 10000), 180000),
    retries: Math.min(Math.max(parseInt(cfg.retries, 10) || 1, 0), 4),
    limits: {
      dailyTokenLimit: Math.max(0, parseInt(cfg.apiDailyTokenLimit, 10) || 80000),
      monthlyTokenLimit: Math.max(0, parseInt(cfg.apiMonthlyTokenLimit, 10) || 1200000),
      dailyCopLimit: Math.max(0, parseInt(cfg.apiDailyCopLimit, 10) || 20000),
      monthlyCopLimit: Math.max(0, parseInt(cfg.apiMonthlyCopLimit, 10) || 200000),
      estimatedCopPer1kTokens: Math.max(1, parseInt(cfg.apiEstimatedCopPer1kTokens, 10) || 40)
    }
  };
}

function claveDiaActual() {
  let now = new Date();
  let y = now.getFullYear();
  let m = String(now.getMonth() + 1).padStart(2, '0');
  let d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function claveMesActual() {
  let now = new Date();
  let y = now.getFullYear();
  let m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function asegurarVentanasConsumoIA() {
  if(!appData.iaUsage || typeof appData.iaUsage !== 'object') appData.iaUsage = {};
  let dayKey = claveDiaActual();
  let monthKey = claveMesActual();
  if(appData.iaUsage.dayKey !== dayKey) {
    appData.iaUsage.dayKey = dayKey;
    appData.iaUsage.dailyRequests = 0;
    appData.iaUsage.dailyTokens = 0;
    appData.iaUsage.dailyCostCop = 0;
  }
  if(appData.iaUsage.monthKey !== monthKey) {
    appData.iaUsage.monthKey = monthKey;
    appData.iaUsage.monthlyRequests = 0;
    appData.iaUsage.monthlyTokens = 0;
    appData.iaUsage.monthlyCostCop = 0;
  }
}

function estimarTokensDesdeTexto(texto) {
  let cleaned = String(texto || '').trim();
  if(!cleaned) return 0;
  let words = cleaned.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
}

function validarLimitesIAAntesDeConsumir(cfgApi) {
  asegurarVentanasConsumoIA();
  let usage = appData.iaUsage || {};
  if(usage.dailyTokens >= cfgApi.limits.dailyTokenLimit) {
    throw new Error(`Límite diario de tokens IA alcanzado (${usage.dailyTokens}/${cfgApi.limits.dailyTokenLimit}).`);
  }
  if(usage.monthlyTokens >= cfgApi.limits.monthlyTokenLimit) {
    throw new Error(`Límite mensual de tokens IA alcanzado (${usage.monthlyTokens}/${cfgApi.limits.monthlyTokenLimit}).`);
  }
  if(usage.dailyCostCop >= cfgApi.limits.dailyCopLimit) {
    throw new Error(`Límite diario de costo IA alcanzado (${formatCOP(usage.dailyCostCop)}/${formatCOP(cfgApi.limits.dailyCopLimit)}).`);
  }
  if(usage.monthlyCostCop >= cfgApi.limits.monthlyCopLimit) {
    throw new Error(`Límite mensual de costo IA alcanzado (${formatCOP(usage.monthlyCostCop)}/${formatCOP(cfgApi.limits.monthlyCopLimit)}).`);
  }
}

function registrarConsumoIAApi(consumo, cfgApi) {
  asegurarVentanasConsumoIA();
  let tokens = Math.max(0, parseInt(consumo.tokens, 10) || 0);
  let costCop = Math.max(0, Math.round(parseMontoInput(consumo.costCop)) || 0);

  appData.iaUsage.dailyRequests = (parseInt(appData.iaUsage.dailyRequests, 10) || 0) + 1;
  appData.iaUsage.monthlyRequests = (parseInt(appData.iaUsage.monthlyRequests, 10) || 0) + 1;
  appData.iaUsage.dailyTokens = (parseInt(appData.iaUsage.dailyTokens, 10) || 0) + tokens;
  appData.iaUsage.monthlyTokens = (parseInt(appData.iaUsage.monthlyTokens, 10) || 0) + tokens;
  appData.iaUsage.dailyCostCop = (Math.round(parseMontoInput(appData.iaUsage.dailyCostCop)) || 0) + costCop;
  appData.iaUsage.monthlyCostCop = (Math.round(parseMontoInput(appData.iaUsage.monthlyCostCop)) || 0) + costCop;
  appData.iaUsage.lastRequestAt = new Date().toISOString();
  appData.iaUsage.lastProvider = cfgApi.provider;
  appData.iaUsage.lastModel = cfgApi.model;

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(appData.iaUsage.lastRequestAt);
}

function renderPanelConsumoIA() {
  let root = document.getElementById('ia-usage-panel');
  if(!root) return;
  let cfgApi = getConfigIAApi();
  asegurarVentanasConsumoIA();
  let usage = appData.iaUsage || {};
  root.innerHTML = `
    <div style="font-size:12px;color:var(--color-text-secondary);">Requests hoy/mes: <strong>${usage.dailyRequests || 0}</strong> / <strong>${usage.monthlyRequests || 0}</strong></div>
    <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">Tokens hoy/mes: <strong>${usage.dailyTokens || 0}</strong> / <strong>${usage.monthlyTokens || 0}</strong></div>
    <div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">Costo hoy/mes: <strong>${formatCOP(usage.dailyCostCop || 0)}</strong> / <strong>${formatCOP(usage.monthlyCostCop || 0)}</strong></div>
    <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:4px;">Topes: tokens ${cfgApi.limits.dailyTokenLimit}/${cfgApi.limits.monthlyTokenLimit} · costo ${formatCOP(cfgApi.limits.dailyCopLimit)}/${formatCOP(cfgApi.limits.monthlyCopLimit)}</div>
  `;
}

function renderConfigIA() {
  let sel = document.getElementById('ia-mode-selector');
  let help = document.getElementById('ia-mode-help');
  let endpoint = document.getElementById('ia-local-endpoint');
  let model = document.getElementById('ia-local-model');
  let timeout = document.getElementById('ia-local-timeout');
  let retries = document.getElementById('ia-local-retries');
  let apiEndpoint = document.getElementById('ia-api-endpoint');
  let apiProvider = document.getElementById('ia-api-provider');
  let apiModel = document.getElementById('ia-api-model');
  let apiKey = document.getElementById('ia-api-key');
  let apiDailyTokens = document.getElementById('ia-api-daily-tokens');
  let apiMonthlyTokens = document.getElementById('ia-api-monthly-tokens');
  let apiDailyCop = document.getElementById('ia-api-daily-cop');
  let apiMonthlyCop = document.getElementById('ia-api-monthly-cop');
  let apiCost1k = document.getElementById('ia-api-cost-1k');
  if(!sel || !help) return;
  let modo = getModoIA();
  let cfg = getConfigIALocal();
  let cfgApi = getConfigIAApi();
  sel.value = modo;
  help.innerText = textoModoIA(modo);
  if(endpoint) endpoint.value = cfg.endpoint;
  if(model) model.value = cfg.model;
  if(timeout) timeout.value = String(cfg.timeoutMs);
  if(retries) retries.value = String(cfg.retries);
  if(apiEndpoint) apiEndpoint.value = cfgApi.endpoint;
  if(apiProvider) apiProvider.value = cfgApi.provider;
  if(apiModel) apiModel.value = cfgApi.model;
  if(apiKey) apiKey.value = '';
  if(apiDailyTokens) apiDailyTokens.value = String(cfgApi.limits.dailyTokenLimit);
  if(apiMonthlyTokens) apiMonthlyTokens.value = String(cfgApi.limits.monthlyTokenLimit);
  if(apiDailyCop) apiDailyCop.value = String(cfgApi.limits.dailyCopLimit);
  if(apiMonthlyCop) apiMonthlyCop.value = String(cfgApi.limits.monthlyCopLimit);
  if(apiCost1k) apiCost1k.value = String(cfgApi.limits.estimatedCopPer1kTokens);
  renderGoogleAuthConfig();
  renderDriveSyncStatus();
  renderPanelConsumoIA();
}

function guardarConfigGoogleAuth() {
  return window.FinancialActions.saveGoogleAuthConfig();
}

async function iniciarLoginGoogle() {
  return window.FinancialActions.loginGoogleAuth();
}

async function cerrarSesionGoogleAuth() {
  return window.FinancialActions.logoutGoogleAuth();
}

async function sincronizarDriveAhora() {
  return window.FinancialActions.syncDriveNow();
}

async function recuperarDesdeDriveAhora() {
  return window.FinancialActions.restoreFromDriveNow();
}

function setModoIA(modoNuevo) {
  return window.FinancialActions.setAIMode(modoNuevo);
}

function guardarConfigIALocal() {
  return window.FinancialActions.saveLocalAIConfig();
}

function guardarConfigIAApi() {
  return window.FinancialActions.saveApiAIConfig();
}

async function consultarIALocal(prompt) {
  if(window.FinancialIA && typeof window.FinancialIA.queryLocalAI === 'function') {
    return window.FinancialIA.queryLocalAI(prompt);
  }
  throw new Error('Motor IA no disponible. Recarga la app para inicializar app.ia.js.');
}

function parsearRespuestaGatewayIA(data) {
  if(window.FinancialIA && typeof window.FinancialIA.parseAIGatewayResponse === 'function') {
    return window.FinancialIA.parseAIGatewayResponse(data);
  }
  return { message: '', usage: {} };
}

async function consultarIAApiGateway(prompt) {
  if(window.FinancialIA && typeof window.FinancialIA.queryApiAI === 'function') {
    return window.FinancialIA.queryApiAI(prompt);
  }
  throw new Error('Motor IA no disponible. Recarga la app para inicializar app.ia.js.');
}

async function ejecutarConsultaIA(prompt) {
  if(window.FinancialIA && typeof window.FinancialIA.executeAIQuery === 'function') {
    return window.FinancialIA.executeAIQuery(prompt);
  }
  throw new Error('Motor IA no disponible. Recarga la app para inicializar app.ia.js.');
}

async function probarIAConfigurada() {
  return window.FinancialActions.testConfiguredAI();
}

function instalarAppPWA() {
  return window.FinancialActions.installPWAApp();
}

function showQ(q) {
  window.FinancialRender.showQuincenaTab(q);
  renderIAPanelQuincena();
}

function renderMenuSemanas() {
  return window.FinancialRender.renderWeeklyMenu();
}

function renderSemanaActiva(compromisosMes) {
  return window.FinancialRender.renderActiveWeek(compromisosMes);
}

function toggleCuotasInput(val) {
  return window.FinancialActions.toggleInstallmentFields(val);
}

function setModoAltaDeuda(modo) {
  return window.FinancialActions.setDebtEntryMode(modo);
}

function onTipoGastoAltaChange(val) {
  if(val === 'credito') setModoAltaDeuda('avanzado');
  toggleCuotasInput(val);
  actualizarPreviewNuevaDeuda();
}

function obtenerSemanaParaDia(dia) {
  let semanas = obtenerSemanasDelMesActivo();
  return semanas.find((s, idx) => {
    if(dia === -1) return idx === 0;
    return s.dias.includes(dia);
  });
}

function actualizarPreviewNuevaDeuda() {
  return window.FinancialActions.updateNewDebtPreview();
}

function toggleCheckPago(id) {
  return window.FinancialActions.togglePaidCheck(id);
}

function toggleExpandDeuda(id) {
  let key = String(id);
  if(deudasExpandState.has(key)) {
    deudasExpandState.delete(key);
  } else {
    deudasExpandState = new Set([key]);
  }
  renderDeudasModulo(getCompromisosMesActual());
}

function toggleExpandIngreso(id) {
  let key = String(id);
  if(ingresosExpandState.has(key)) {
    ingresosExpandState.delete(key);
  } else {
    ingresosExpandState = new Set([key]);
  }
  renderConfigIngresos();
}

function toggleExpandPrima(id) {
  let key = String(id);
  if(primasExpandState.has(key)) {
    primasExpandState.delete(key);
  } else {
    primasExpandState = new Set([key]);
  }
  renderConfigPrimas();
}

function aplicarEstadoCardAlta(tipo) {
  let esIngreso = tipo === 'ingreso';
  let expanded = esIngreso ? addIngresoCardExpanded : addPrimaCardExpanded;
  let panel = document.getElementById(esIngreso ? 'panel-add-ingreso' : 'panel-add-prima');
  let btn = document.getElementById(esIngreso ? 'btn-toggle-add-ingreso' : 'btn-toggle-add-prima');
  if(!panel || !btn) return;

  panel.style.display = expanded ? 'block' : 'none';
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  let chevron = btn.querySelector('.deuda-chevron');
  if(chevron) chevron.textContent = expanded ? '▾' : '▸';
}

function toggleExpandAddCard(tipo) {
  if(tipo === 'ingreso') {
    addIngresoCardExpanded = !addIngresoCardExpanded;
    if(addIngresoCardExpanded) addPrimaCardExpanded = false;
  } else if(tipo === 'prima') {
    addPrimaCardExpanded = !addPrimaCardExpanded;
    if(addPrimaCardExpanded) addIngresoCardExpanded = false;
  }
  aplicarEstadoCardAlta('ingreso');
  aplicarEstadoCardAlta('prima');
}

function cambiarFiltroDeuda(tipo) {
  filtroDeudaActivo = tipo;
  ['todas','fijas','variables','creditos','pendientes'].forEach(f => {
    document.getElementById('f-' + f).classList.toggle('on', f === tipo);
  });
  renderDeudasModulo(getCompromisosMesActual());
}

function aplicarFiltroFechaDeudas() {
  return window.FinancialActions.applyDebtDateFilter();
}

function limpiarFiltroFechaDeudas(soloEstado = false) {
  return window.FinancialActions.clearDebtDateFilter(soloEstado);
}

let compromisosMesGlobalCache = []; // Cache para simplificar refrescos de UI

function initApp(options = {}) {
  const opts = {
    skipPersist: false,
    skipDataNormalization: false,
    skipLocaleInit: false,
    ...options
  };

  const i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      const translated = window.FinancialI18n.t(key, vars);
      if(translated === key || translated == null || translated === '') {
        return fallback;
      }
      return translated;
    }
    return fallback;
  };

  if(!opts.skipLocaleInit && window.FinancialI18n && typeof window.FinancialI18n.initializeLocale === 'function') {
    window.FinancialI18n.initializeLocale();
  }

  if(!opts.skipDataNormalization) {
    aplicarCorreccionMesBaseSiAplica();
    normalizarRecurrenciasCompromisos();
    normalizarIngresosConDia();
    appData.schemaVersion = APP_SCHEMA_VERSION;
  }

  if(!opts.skipPersist) {
    let marcaGuardado = new Date().toISOString();
    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(marcaGuardado);
  }

  let dashboardState = (window.FinancialRender && typeof window.FinancialRender.composeDashboardRender === 'function')
    ? window.FinancialRender.composeDashboardRender(i18nT)
    : null;
  let compromisosMesActual = dashboardState && Array.isArray(dashboardState.compromisosMesActual)
    ? dashboardState.compromisosMesActual
    : getCompromisosMesActual();

  if(window.FinancialI18n && typeof window.FinancialI18n.applyStaticTranslations === 'function') {
    window.FinancialI18n.applyStaticTranslations();
    window.FinancialI18n.setupLanguageSwitcher();
  }
  
  // Mantener la vista diaria actualizada si hay un día seleccionado
  if(diaSeleccionadoActivo !== null) {
    renderVistaDiaria(compromisosMesActual);
  } else {
    ocultarVistaDiariaDOM();
  }

  setModoAltaDeuda(modoAltaDeuda);
  toggleCuotasInput(document.getElementById('add-tipo-gasto').value);
  actualizarPreviewNuevaDeuda();
}

function renderSobrante(balanceMes) {
  let cont = document.getElementById('card-sobrante-resumen');
  if(!cont) return;

  let sobrante = Math.max(0, balanceMes);
  let ahorro = Math.round(sobrante * 0.5);
  let inversion = Math.round(sobrante * 0.3);
  let calamidad = Math.max(0, sobrante - ahorro - inversion);

  let estado = balanceMes >= 0
    ? `<div class="ss" style="margin-top:2px;">Disponible para plan futuro (no impacta aún el flujo).</div>`
    : `<div class="ss" style="margin-top:2px;color:#E24B4A;">Este mes no hay sobrante. Primero cubrimos déficit.</div>`;

  cont.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;">
      <div>
        <div class="sl">Sobrante disponible</div>
        <div class="sv" style="font-size:24px;color:${sobrante > 0 ? '#1D9E75' : 'var(--color-text-secondary)'}">${formatCOP(sobrante)}</div>
        ${estado}
      </div>
      <div class="ss" style="text-align:right;">Mes inicia en $0</div>
    </div>
    <div class="row">
      <div class="rn">Ahorro (futuro)</div>
      <div class="ra pos">${formatCOP(ahorro)}</div>
    </div>
    <div class="row">
      <div class="rn">Inversión (futuro)</div>
      <div class="ra pos">${formatCOP(inversion)}</div>
    </div>
    <div class="row">
      <div class="rn">Calamidad (fondo)</div>
      <div class="ra pos">${formatCOP(calamidad)}</div>
    </div>
  `;
}

function renderIngresosResumen() {
  let container = document.getElementById('lista-ingresos-resumen');
  container.innerHTML = '';

  let eventosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);

  appData.ingresosList
    .filter(i => ingresoActivoEnMes(i, mesActivoGlobal))
    .forEach(i => {
    let nombreSeguro = escapeHTML(i.nombre);
    let diaIngreso = getDiaIngreso(i);
    let desde = obtenerMesInicioIngreso(i);
    let hasta = obtenerMesFinIngreso(i);
    let vigencia = hasta ? `Vigencia: ${desde} -> ${hasta}` : `Vigencia: ${desde} -> indefinido`;
    let eventosFuente = eventosMes.filter(e => e.fuenteTipo === 'ingreso' && e.fuenteId === i.id);
    let totalFuenteMes = eventosFuente.reduce((acc, e) => acc + e.valor, 0);
    let pagosNormales = eventosFuente.filter(e => e.origen === 'normal').length;
    let pagosArrastre = eventosFuente.filter(e => e.origen === 'arrastre').length;
    let totalQ1Fuente = eventosFuente.filter(e => e.dia >= 1 && e.dia <= 14).reduce((acc, e) => acc + e.valor, 0);
    let totalQ2Fuente = eventosFuente.filter(e => e.dia >= 15).reduce((acc, e) => acc + e.valor, 0);
    let impactoMes = `Este mes: ${pagosNormales} normal(es) + ${pagosArrastre} arrastre(s)`;
    let impactoQuincenas = `Q1: ${formatCOP(totalQ1Fuente)} · Q2: ${formatCOP(totalQ2Fuente)}`;
    let impacto = i.periodo === 'biweekly'
      ? `Cada 14 días (ancla día ${diaIngreso})`
      : (diaIngreso >= 29 ? 'Impacta mes siguiente (arrastre día 1)' : `Pago día ${diaIngreso}`);
    let tag = i.periodo === 'q1'
      ? 'Quincena 1'
      : (i.periodo === 'q2'
        ? 'Quincena 2'
        : (i.periodo === 'biweekly' ? 'Quincenal real (14 días)' : 'Ambas Quincenas (50/50)'));
    container.innerHTML += `
      <div class="row">
        <div><div class="rn">${nombreSeguro}</div><div class="rm">${tag} · ${impacto} · ${impactoMes} · ${impactoQuincenas} · ${vigencia}</div></div>
        <div class="ra pos">${formatCOP(totalFuenteMes)}</div>
      </div>
    `;
  });

  appData.primasList
    .filter(p => eventosMes.some(e => e.fuenteTipo === 'prima' && e.fuenteId === p.id))
    .forEach(p => {
      let nombreSeguro = escapeHTML(p.nombre);
      let eventosPrima = eventosMes.filter(e => e.fuenteTipo === 'prima' && e.fuenteId === p.id);
      let totalPrimaMes = eventosPrima.reduce((acc, e) => acc + e.valor, 0);
      let pagosNormales = eventosPrima.filter(e => e.origen === 'prima').length;
      let pagosArrastre = eventosPrima.filter(e => e.origen === 'prima-arrastre').length;
      let totalQ1Prima = eventosPrima.filter(e => e.dia >= 1 && e.dia <= 14).reduce((acc, e) => acc + e.valor, 0);
      let totalQ2Prima = eventosPrima.filter(e => e.dia >= 15).reduce((acc, e) => acc + e.valor, 0);
      let dia = parseInt(p.diaPago, 10);
      let impacto = dia >= 29 ? `Pago día ${dia} · arrastre mes siguiente` : `Pago día ${dia}`;
      let impactoMes = `Este mes: ${pagosNormales} normal(es) + ${pagosArrastre} arrastre(s)`;
      let impactoQuincenas = `Q1: ${formatCOP(totalQ1Prima)} · Q2: ${formatCOP(totalQ2Prima)}`;
      container.innerHTML += `
        <div class="row">
          <div><div class="rn">${nombreSeguro}</div><div class="rm">Prima no recurrente · ${impacto} · ${impactoMes} · ${impactoQuincenas}</div></div>
          <div class="ra pos">${formatCOP(totalPrimaMes)}</div>
        </div>
      `;
    });
}

function agregarIngresoDinamico() {
  return window.FinancialActions.addDynamicIncome();
}

function eliminarIngreso(id) {
  return window.FinancialActions.removeIncome(id);
}

function renderConfigIngresos() {
  let container = document.getElementById('lista-config-ingresos');
  container.innerHTML = '';

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  const { anio: anioActivo, mes: mesNombreActivo } = parseMesKey(mesActivoGlobal);
  const mesIdxActivo = ORDEN_MESES.indexOf(mesNombreActivo);
  const diasMesActivo = new Date(anioActivo, mesIdxActivo + 1, 0).getDate();

  ingresosExpandState = new Set(
    [...ingresosExpandState].filter((id) => appData.ingresosList.some((i) => String(i.id) === id))
  );

  appData.ingresosList.forEach(i => {
    let nombreSeguro = escapeHTML(i.nombre);
    let desde = obtenerMesInicioIngreso(i);
    let hasta = obtenerMesFinIngreso(i);
    let ingresoExpandido = ingresosExpandState.has(String(i.id));
    let diasReales = obtenerDiasPagoIngresoEnMes(i, mesActivoGlobal);
    let tieneArrastre = diasReales.some((d) => d >= 29);
    let txtDay = i18nT('config.day', {}, 'Día');
    let txtImpactNextMonth = i18nT('income.impactNextMonthDay1', {}, 'día 1 del mes siguiente');
    let txtNoImpactThisMonth = i18nT('income.noImpactThisMonth', {}, 'sin impacto en este mes');
    let txtCarryoverBadge = i18nT('income.carryoverBadge', {}, 'Arrastre 29-31 -> día 1 del mes siguiente');
    let txtDirectImpactBadge = i18nT('income.directImpactBadge', {}, 'Impacto directo en el mismo mes');
    let txtSegment = i18nT('income.segmentAssignment', {}, 'Asignación de Tramo:');
    let txtPayDay = i18nT('income.payDay', {}, 'Día pago');
    let txtValidFrom = i18nT('config.validFrom', {}, 'Vigente desde');
    let txtValidTo = i18nT('config.validTo', {}, 'Vigente hasta');
    let txtRealPayDate = i18nT('income.realPayDateLabel', {}, 'Fecha real de pago:');
    let txtFlowImpactDate = i18nT('income.flowImpactDateLabel', {}, 'Fecha de impacto en flujo:');
    let txtExpand = i18nT('income.expandDetail', {}, 'Expandir detalle');
    let txtCollapse = i18nT('income.collapseDetail', {}, 'Contraer detalle');
    let txtIndefinite = i18nT('income.indefinite', {}, 'Indefinido');
    let txtDistQ1 = i18nT('config.dist.q1', {}, 'Entra en Quincena 1');
    let txtDistQ2 = i18nT('config.dist.q2', {}, 'Entra en Quincena 2');
    let txtDistBiweekly = i18nT('config.dist.biweekly', {}, 'Pago cada 14 días (quincenal real)');
    let txtDistSplit = i18nT('config.dist.all', {}, 'Ambas quincenas (50/50)');
    let txtBiweeklyShort = i18nT('income.biweeklyShort', {}, 'Quincenal real');
    let fechaRealTxt = diasReales.length
      ? diasReales.map((d) => `${txtDay} ${d}`).join(', ')
      : `${txtDay} ${normalizarDiaPagoDeMes(getDiaIngreso(i), anioActivo, mesIdxActivo, diasMesActivo)}`;
    let fechaImpactoTxt = diasReales.length
      ? diasReales.map((d) => (d >= 29 ? txtImpactNextMonth : `${txtDay} ${d}`)).join(', ')
      : txtNoImpactThisMonth;
    let arrastreTxt = tieneArrastre
      ? `<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#FCE7C6;color:#8A4B00;font-size:10px;">${txtCarryoverBadge}</span>`
      : `<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#E6F4EA;color:#1F6B42;font-size:10px;">${txtDirectImpactBadge}</span>`;
    let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}" ${desde === m ? 'selected' : ''}>${m}</option>`).join('');
    let opcionesHasta = `<option value="__indefinido__" ${!hasta ? 'selected' : ''}>${txtIndefinite}</option>` + mesesLineaTiempo.map(m => `<option value="${m}" ${hasta === m ? 'selected' : ''}>${m}</option>`).join('');
    let card = document.createElement('div');
    card.className = 'card ingreso-card';
    card.style.padding = '12px';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      ${ingresoExpandido ? `
      <div class="ingreso-toggle ingreso-toggle-expanded">
        <div style="flex:1;min-width:0;">
          <div class="ingreso-compact-top">
            <input type="text" value="${nombreSeguro}" class="input-inline ingreso-name" onchange="modificarIngresoPropiedad(${i.id}, 'nombre', this.value)">
            <input type="text" inputmode="numeric" value="${formatCOP(i.valor)}" class="input-inline ingreso-value money-input" onchange="modificarIngresoPropiedad(${i.id}, 'valor', this.value)">
          </div>
          <div class="ingreso-compact-meta">
            <span>${i.periodo === 'biweekly' ? txtBiweeklyShort : (i.periodo === 'q1' ? 'Q1' : (i.periodo === 'q2' ? 'Q2' : 'Q1+Q2'))}</span>
            <span>${txtDay} ${getDiaIngreso(i)}</span>
          </div>
        </div>
        <button class="deuda-chevron-btn" onclick="toggleExpandIngreso(${i.id})" aria-expanded="true" title="${txtCollapse}"><span class="deuda-chevron" aria-hidden="true">▾</span></button>
      </div>
      ` : `
      <button class="ingreso-toggle" onclick="toggleExpandIngreso(${i.id})" aria-expanded="false" title="${txtExpand}">
        <div style="flex:1;min-width:0;">
          <div class="ingreso-compact-top">
            <div class="ingreso-compact-name">${nombreSeguro}</div>
            <div class="ingreso-compact-value">${formatCOP(i.valor)}</div>
          </div>
          <div class="ingreso-compact-meta">
            <span>${i.periodo === 'biweekly' ? txtBiweeklyShort : (i.periodo === 'q1' ? 'Q1' : (i.periodo === 'q2' ? 'Q2' : 'Q1+Q2'))}</span>
            <span>${txtDay} ${getDiaIngreso(i)}</span>
          </div>
        </div>
        <span class="deuda-chevron" aria-hidden="true">▸</span>
      </button>
      `}

      ${ingresoExpandido ? `
      <div class="ingreso-details">
        <div style="display:flex; gap:8px; align-items:end;">
          <div style="flex:1;">
          <label class="sl" style="display:block; margin-bottom:2px">${txtSegment}</label>
          <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'periodo', this.value)">
            <option value="q1" ${i.periodo === 'q1' ? 'selected' : ''}>${txtDistQ1}</option>
            <option value="q2" ${i.periodo === 'q2' ? 'selected' : ''}>${txtDistQ2}</option>
            <option value="biweekly" ${i.periodo === 'biweekly' ? 'selected' : ''}>${txtDistBiweekly}</option>
            <option value="todo" ${i.periodo === 'todo' ? 'selected' : ''}>${txtDistSplit}</option>
          </select>
          </div>
          <div style="width:92px;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtPayDay}</label>
            <input type="number" min="1" max="31" class="input-app" style="margin:0; padding:4px; font-size:12px;" value="${getDiaIngreso(i)}" onchange="modificarIngresoPropiedad(${i.id}, 'diaPago', this.value)">
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:end; margin-top:8px;">
          <div style="flex:1;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtValidFrom}</label>
            <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesInicio', this.value)">${opcionesDesde}</select>
          </div>
          <div style="flex:1;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtValidTo}</label>
            <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesFin', this.value)">${opcionesHasta}</select>
          </div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--color-text-secondary);line-height:1.4;">
          <div><strong>${txtRealPayDate}</strong> ${fechaRealTxt}</div>
          <div><strong>${txtFlowImpactDate}</strong> ${fechaImpactoTxt}</div>
          ${arrastreTxt}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-del btn-del-icon-only" onclick="eliminarIngreso(${i.id})" title="Eliminar ingreso" aria-label="Eliminar ingreso"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
        </div>
      </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function renderSelectoresVigenciaIngreso() {
  let selDesde = document.getElementById('new-ing-desde');
  let selHasta = document.getElementById('new-ing-hasta');
  if(!selDesde || !selHasta) return;

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  let opcionesHasta = `<option value="__indefinido__">${i18nT('income.indefinite', {}, 'Indefinido')}</option>` + mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  selDesde.innerHTML = opcionesDesde;
  selHasta.innerHTML = opcionesHasta;

  if([...selDesde.options].some(o => o.value === mesActivoGlobal)) {
    selDesde.value = mesActivoGlobal;
  }
  selHasta.value = '__indefinido__';
}

function agregarPrimaNoRecurrente() {
  return window.FinancialActions.addOneOffBonus();
}

function eliminarPrima(id) {
  return window.FinancialActions.removeBonus(id);
}

function modificarPrimaPropiedad(id, campo, nuevoValor) {
  let prima = appData.primasList.find(p => p.id === id);
  if(!prima) return;

  if(campo === 'nombre') prima.nombre = nuevoValor.trim();
  if(campo === 'valor') prima.valor = parseMontoInput(nuevoValor) || 0;
  if(campo === 'diaPago') {
    let d = parseInt(nuevoValor, 10);
    if(!isNaN(d) && d >= 1 && d <= 31) prima.diaPago = d;
  }
  if(campo === 'mesKey') prima.mesKey = nuevoValor;
  initApp();
}

function renderConfigPrimas() {
  let container = document.getElementById('lista-config-primas');
  if(!container) return;

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  container.innerHTML = '';
  if(appData.primasList.length === 0) {
    container.innerHTML = `<div class="card" style="padding:12px;color:var(--color-text-tertiary);font-size:12px;">${i18nT('income.noBonusesYet', {}, 'No hay primas registradas aún.')}</div>`;
    return;
  }

  primasExpandState = new Set(
    [...primasExpandState].filter((id) => appData.primasList.some((p) => String(p.id) === id))
  );

  appData.primasList
    .slice()
    .sort((a, b) => mesKeyToIndex(a.mesKey) - mesKeyToIndex(b.mesKey))
    .forEach(p => {
      let nombreSeguro = escapeHTML(p.nombre);
      let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${p.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
      let primaExpandida = primasExpandState.has(String(p.id));
      let txtDay = i18nT('config.day', {}, 'Día');
      let txtBonus = i18nT('income.bonusLabel', {}, 'Prima');
      let txtPayDay = i18nT('income.payDay', {}, 'Día pago');
      let txtMonth = i18nT('income.monthLabel', {}, 'Mes');
      let txtExpand = i18nT('income.expandDetail', {}, 'Expandir detalle');
      let txtCollapse = i18nT('income.collapseDetail', {}, 'Contraer detalle');
      let card = document.createElement('div');
      card.className = 'card prima-card';
      card.style.padding = '12px';
      card.style.marginBottom = '8px';
      card.innerHTML = `
        ${primaExpandida ? `
        <div class="ingreso-toggle ingreso-toggle-expanded">
          <div style="flex:1;min-width:0;">
            <div class="ingreso-compact-top">
              <input type="text" value="${nombreSeguro}" class="input-inline ingreso-name" onchange="modificarPrimaPropiedad(${p.id}, 'nombre', this.value)">
              <input type="text" inputmode="numeric" value="${formatCOP(p.valor)}" class="input-inline ingreso-value money-input" onchange="modificarPrimaPropiedad(${p.id}, 'valor', this.value)">
            </div>
            <div class="ingreso-compact-meta">
              <span>${txtBonus}</span>
              <span>${txtDay} ${p.diaPago}</span>
            </div>
          </div>
          <button class="deuda-chevron-btn" onclick="toggleExpandPrima(${p.id})" aria-expanded="true" title="${txtCollapse}"><span class="deuda-chevron" aria-hidden="true">▾</span></button>
        </div>
        ` : `
        <button class="ingreso-toggle" onclick="toggleExpandPrima(${p.id})" aria-expanded="false" title="${txtExpand}">
          <div style="flex:1;min-width:0;">
            <div class="ingreso-compact-top">
              <div class="ingreso-compact-name">${nombreSeguro}</div>
              <div class="ingreso-compact-value">${formatCOP(p.valor)}</div>
            </div>
            <div class="ingreso-compact-meta">
              <span>${txtBonus}</span>
              <span>${txtDay} ${p.diaPago}</span>
            </div>
          </div>
          <span class="deuda-chevron" aria-hidden="true">▸</span>
        </button>
        `}

        ${primaExpandida ? `
        <div class="ingreso-details">
          <div style="display:flex; gap:8px; align-items:end;">
            <div style="width:88px;">
              <label class="sl" style="display:block; margin-bottom:2px;">${txtPayDay}</label>
              <input type="number" min="1" max="31" class="input-app" style="margin:0;padding:4px;font-size:12px;" value="${p.diaPago}" onchange="modificarPrimaPropiedad(${p.id}, 'diaPago', this.value)">
            </div>
            <div style="flex:1;">
              <label class="sl" style="display:block; margin-bottom:2px;">${txtMonth}</label>
              <select class="input-app" style="margin:0;padding:4px;font-size:12px;" onchange="modificarPrimaPropiedad(${p.id}, 'mesKey', this.value)">${mesOptions}</select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn-del btn-del-icon-only" onclick="eliminarPrima(${p.id})" title="Eliminar prima" aria-label="Eliminar prima"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
          </div>
        </div>
        ` : ''}
      `;
      container.appendChild(card);
    });
}

function modificarIngresoPropiedad(id, campo, nuevoValor) {
  let ing = appData.ingresosList.find(i => i.id === id);
  if(ing) {
    if(campo === 'valor') ing.valor = parseMontoInput(nuevoValor) || 0;
    if(campo === 'nombre') ing.nombre = nuevoValor.trim();
    if(campo === 'periodo') ing.periodo = nuevoValor;
    if(campo === 'diaPago') {
      let d = parseInt(nuevoValor, 10);
      if(!isNaN(d) && d >= 1 && d <= 31) ing.diaPago = d;
    }
    if(campo === 'mesInicio' && esMesKeyValido(nuevoValor)) {
      ing.mesInicio = nuevoValor;
      let fin = obtenerMesFinIngreso(ing);
      if(fin && mesKeyToIndex(fin) < mesKeyToIndex(ing.mesInicio)) {
        ing.mesFin = ing.mesInicio;
        ing.mesFinIndefinido = false;
      }
    }
    if(campo === 'mesFin') {
      if(nuevoValor === '__indefinido__') {
        ing.mesFin = null;
        ing.mesFinIndefinido = true;
      } else if(esMesKeyValido(nuevoValor)) {
        if(mesKeyToIndex(nuevoValor) < mesKeyToIndex(obtenerMesInicioIngreso(ing))) {
          ing.mesFin = obtenerMesInicioIngreso(ing);
        } else {
          ing.mesFin = nuevoValor;
        }
        ing.mesFinIndefinido = false;
      }
    }
    initApp();
  }
}

function eliminarCompromiso(id) {
  return window.FinancialActions.removeCompromiso(id);
}

function modificarCompromisoPropiedad(id, campo, nuevoValor) {
  let comp = appData.compromisos.find(c => c.id === id);
  if(comp) {
    if(comp.autoGenerado) {
      // If user edits an auto-generated row, keep that month as a manual override.
      comp.autoGenerado = false;
    }
    if(campo === 'nombre') comp.nombre = nuevoValor.trim();
    if(campo === 'valor') comp.valor = parseMontoInput(nuevoValor) || 0;
    if(campo === 'dia') comp.dia = parseInt(nuevoValor);
    if(campo === 'diaPagoReal') {
      let txt = String(nuevoValor || '').trim();
      if(!txt) {
        comp.diaPagoReal = null;
      } else {
        let dpr = parseInt(txt, 10);
        comp.diaPagoReal = (!isNaN(dpr) && dpr >= 1 && dpr <= 31) ? dpr : null;
      }
    }
    if(campo === 'tipo') comp.tipo = nuevoValor;
    if(campo === 'mesKey') comp.mesKey = nuevoValor;
    if(campo === 'faltantes') comp.faltantes = Math.max(0, parseInt(nuevoValor, 10) || 0);
    if(campo === 'totales') comp.totales = Math.max(1, parseInt(nuevoValor, 10) || 1);
    if(comp.tipo !== 'credito') {
      delete comp.faltantes;
      delete comp.totales;
    }
    if(comp.tipo === 'credito') {
      if(!comp.faltantes) comp.faltantes = 1;
      if(!comp.totales) comp.totales = Math.max(1, comp.faltantes);
      if(comp.faltantes > comp.totales) comp.totales = comp.faltantes;
    }
    initApp();
  }
}

function renderDeudasModulo(compromisosMes) {
  let container = document.getElementById('lista-deudas-modulo');
  let fechaInfo = document.getElementById('deudas-fecha-info');
  if(!container) return;
  container.innerHTML = '';
  
  let deudasFiltradas = (compromisosMes || []).filter(c => {
    if (filtroDeudaActivo === 'todas') return true;
    if (filtroDeudaActivo === 'fijas') return c.tipo === 'fijo';
    if (filtroDeudaActivo === 'variables') return c.tipo === 'variable';
    if (filtroDeudaActivo === 'creditos') return c.tipo === 'credito';
    if (filtroDeudaActivo === 'pendientes') return !c.pagado;
    return true;
  }).filter(c => {
    let diaNormalizado = parseInt(c.dia, 10) === -1 ? 1 : parseInt(c.dia, 10);
    if(filtroDiaDesde !== null && diaNormalizado < filtroDiaDesde) return false;
    if(filtroDiaHasta !== null && diaNormalizado > filtroDiaHasta) return false;
    return true;
  });

  // Prevent stale IDs from accumulating when debts are removed or month changes.
  deudasExpandState = new Set(
    [...deudasExpandState].filter((id) => deudasFiltradas.some((c) => String(c.id) === id))
  );

  if(fechaInfo) {
    if(filtroDiaDesde === null && filtroDiaHasta === null) {
      fechaInfo.innerText = 'Mostrando todos los días del mes.';
    } else {
      let desdeTxt = filtroDiaDesde === null ? '1' : filtroDiaDesde;
      let hastaTxt = filtroDiaHasta === null ? '31' : filtroDiaHasta;
      fechaInfo.innerText = `Rango activo: día ${desdeTxt} a día ${hastaTxt}.`;
    }
  }

  if(deudasFiltradas.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:20px; color:var(--color-text-tertiary); font-size:12px;">Sin registros.</div>`;
    return;
  }

  let totalListado = deudasFiltradas.reduce((acc, c) => acc + c.valor, 0);
  let totalPendListado = deudasFiltradas.reduce((acc, c) => acc + (c.pagado ? 0 : c.valor), 0);
  let nPend = deudasFiltradas.filter(c => !c.pagado).length;
  container.innerHTML += `
    <div class="deuda-resumen">
      <div class="k"><div class="t">Registros</div><div class="v">${deudasFiltradas.length}</div></div>
      <div class="k"><div class="t">Pendientes</div><div class="v">${nPend}</div></div>
      <div class="k"><div class="t">Monto Pendiente</div><div class="v" style="color:#BA7517">${formatCOP(totalPendListado)}</div></div>
    </div>
  `;

  let alertasVencimiento = construirAlertasVencimientoDeudas(compromisosMes || []);
  if(alertasVencimiento && (alertasVencimiento.vencidos.length > 0 || alertasVencimiento.proximos.length > 0)) {
    let resumenVencidos = alertasVencimiento.vencidos.length > 0
      ? `${alertasVencimiento.vencidos.length} vencido(s)`
      : 'Sin vencidos';
    let resumenProximos = alertasVencimiento.proximos.length > 0
      ? `${alertasVencimiento.proximos.length} próximo(s) a vencer en <= ${alertasVencimiento.umbralDias} días`
      : 'Sin vencimientos próximos';

    let muestraProximos = alertasVencimiento.proximos
      .slice(0, 3)
      .map((c) => `${escapeHTML(c.nombre)} (día ${c.dia})`)
      .join(' · ');

    container.innerHTML += `
      <div class="card" style="border-left:4px solid #BA7517;">
        <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Aviso de vencimientos</div>
        <div class="rm">${resumenVencidos} · ${resumenProximos}</div>
        ${muestraProximos ? `<div class="rm" style="margin-top:4px;">Próximos: ${muestraProximos}</div>` : ''}
      </div>
    `;
  }

  deudasFiltradas.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    let tipoLabel = c.tipo === 'fijo' ? 'Fijo' : (c.tipo === 'credito' ? 'Crédito' : 'Variable');
    let tipoPillClass = c.tipo === 'fijo' ? 'pill-fijo' : (c.tipo === 'credito' ? 'pill-credito' : 'pill-variable');
    let diaNormalizado = parseInt(c.dia, 10) === -1 ? 1 : parseInt(c.dia, 10);
    let diaPagoReal = parseInt(c.diaPagoReal, 10);
    let diaPagoRealValido = !isNaN(diaPagoReal) && diaPagoReal >= 1 && diaPagoReal <= 31;
    let sem = obtenerSemanaParaDia(parseInt(c.dia, 10));
    let semTxt = sem ? sem.nombre.replace('Tramo Semanal ', 'S') : 'S/N';
    let card = document.createElement('div');
    card.className = `card deuda-card tipo-${c.tipo}`;
    if(c.pagado) card.style.opacity = '0.65';
    let pctBarra = c.tipo === 'credito' ? (((c.totales||12)-(c.faltantes||6))/(c.totales||12))*100 : 100;
    let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${c.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
    let colorBarra = c.pagado ? '#1D9E75' : '#E24B4A';
    let estadoCompactoIcon = c.pagado ? '●' : '○';
    let estadoCompactoTxt = c.pagado ? 'Pagado' : 'Pendiente';
    let deudaExpandida = deudasExpandState.has(String(c.id));
    let extraCredito = '';
    if(c.tipo === 'credito') {
      extraCredito = `
        <div class="deuda-sub">
          <div class="deuda-grid">
            <div>
              <label class="sl">Cuotas Restan</label>
              <input type="number" min="0" value="${c.faltantes || 0}" class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'faltantes', this.value)">
            </div>
            <div>
              <label class="sl">Cuotas Totales</label>
              <input type="number" min="1" value="${c.totales || 1}" class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'totales', this.value)">
            </div>
          </div>
          <div class="rm" style="margin-top:5px;">Progreso crédito: ${Math.round(Math.max(0, Math.min(100, pctBarra)))}%</div>
        </div>
      `;
    }

    card.innerHTML = `
      ${deudaExpandida ? `
      <div class="deuda-toggle deuda-toggle-expanded">
        <div style="flex:1;min-width:0;">
          <div class="deuda-compact-top">
            <input type="text" value="${nombreSeguro}" class="input-inline deuda-name" onchange="modificarCompromisoPropiedad(${c.id}, 'nombre', this.value)">
            <input type="text" inputmode="numeric" value="${formatCOP(c.valor)}" class="input-inline deuda-valor money-input" onchange="modificarCompromisoPropiedad(${c.id}, 'valor', this.value)">
          </div>
          <div class="deuda-compact-meta">
            <span class="deuda-tipo-pill ${tipoPillClass}">${tipoLabel}</span>
            <span>${semTxt}</span>
            <span class="deuda-compact-status ${c.pagado ? 'paid' : 'pending'}" title="${estadoCompactoTxt}">${estadoCompactoIcon}</span>
          </div>
        </div>
        <button class="deuda-chevron-btn" onclick="toggleExpandDeuda(${c.id})" aria-expanded="true" title="Contraer detalle">
          <span class="deuda-chevron" aria-hidden="true">▾</span>
        </button>
      </div>
      ` : `
      <button class="deuda-toggle" onclick="toggleExpandDeuda(${c.id})" aria-expanded="false" title="Expandir detalle">
        <div style="flex:1;min-width:0;">
          <div class="deuda-compact-top">
            <div class="deuda-compact-name">${nombreSeguro}</div>
            <div class="deuda-compact-value">${formatCOP(c.valor)}</div>
          </div>
          <div class="deuda-compact-meta">
            <span class="deuda-tipo-pill ${tipoPillClass}">${tipoLabel}</span>
            <span>${semTxt}</span>
            <span class="deuda-compact-status ${c.pagado ? 'paid' : 'pending'}" title="${estadoCompactoTxt}">${estadoCompactoIcon}</span>
          </div>
        </div>
        <span class="deuda-chevron" aria-hidden="true">▸</span>
      </button>
      `}

      ${deudaExpandida ? `
      <div class="deuda-details">
        <div class="deuda-meta">
          <div>
            <label class="sl">Tipo</label>
            <select class="input-app" style="margin:4px 0 0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'tipo', this.value)">
              <option value="fijo" ${c.tipo === 'fijo' ? 'selected' : ''}>Fijo</option>
              <option value="variable" ${c.tipo === 'variable' ? 'selected' : ''}>Variable</option>
              <option value="credito" ${c.tipo === 'credito' ? 'selected' : ''}>Crédito</option>
            </select>
          </div>
          <div>
            <label class="sl">Mes</label>
            <select class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'mesKey', this.value)">${mesOptions}</select>
          </div>
        </div>

        <div class="deuda-grid">
          <div>
            <label class="sl">Día</label>
            <input type="number" value="${c.dia}" min="-1" max="31" class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'dia', this.value)">
          </div>
          <div>
            <label class="sl">Pago real (opcional)</label>
            <input type="number" value="${diaPagoRealValido ? diaPagoReal : ''}" min="1" max="31" placeholder="Auto" class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'diaPagoReal', this.value)">
          </div>
          <div>
            <label class="sl">Estado</label>
            <div class="deuda-mini" style="height:31px;border:1px solid var(--color-border-secondary);border-radius:6px;padding:0 8px;">
              <input type="checkbox" ${c.pagado ? 'checked':''} onclick="toggleCheckPago(${c.id})"> ¿Pagado?
            </div>
          </div>
        </div>

        ${extraCredito}
        <div class="rm" style="margin-top:6px;">Fecha tentativa: día ${diaNormalizado} · ${semTxt}</div>
        <div class="rm" style="margin-top:4px;">Fecha real de pago: ${diaPagoRealValido ? `día ${diaPagoReal}` : 'sin definir (usa tentativa)'}</div>
        <div class="deuda-bar" style="margin-top:6px;"><div class="deuda-fill" style="width:${pctBarra}%;background:${colorBarra}"></div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-del btn-del-icon-only" onclick="eliminarCompromiso(${c.id})" title="Eliminar compromiso" aria-label="Eliminar compromiso"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
        </div>
      </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function obtenerMesKeyActualSistema() {
  let now = new Date();
  return `${ORDEN_MESES[now.getMonth()]} ${now.getFullYear()}`;
}

function construirAlertasVencimientoDeudas(compromisosMes, umbralDias = 3) {
  if(!Array.isArray(compromisosMes)) return null;
  if(mesActivoGlobal !== obtenerMesKeyActualSistema()) return null;

  let hoy = new Date().getDate();
  let pendientes = compromisosMes
    .filter((c) => !c.pagado)
    .map((c) => ({ ...c, dia: parseInt(c.dia, 10) }))
    .filter((c) => !isNaN(c.dia) && c.dia >= 1 && c.dia <= 31)
    .sort((a, b) => a.dia - b.dia);

  return {
    hoy,
    umbralDias,
    vencidos: pendientes.filter((c) => c.dia < hoy),
    proximos: pendientes.filter((c) => c.dia >= hoy && c.dia <= hoy + umbralDias)
  };
}

function renderQuincenas(compromisosMes) {
  let preCont = document.getElementById('lista-pre-quincena');
  let q1Cont = document.getElementById('lista-q1-quincena');
  let q2Cont = document.getElementById('lista-q2-quincena');

  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let resumen = calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes);

  let q1CompsConOrigen = [
    ...resumen.preComps.map((c) => ({ ...c, __origenPreMes: true })),
    ...resumen.q1Comps.map((c) => ({ ...c, __origenPreMes: false }))
  ];

  renderBloquePreMesIntegrado(preCont, resumen.preComps);
  buildQuincenaHtml(q1Cont, q1CompsConOrigen, "Tramo de Cobros 1 (Días 1-14)", resumen.tramos[0].ingresos);
  buildQuincenaHtml(q2Cont, resumen.q2Comps, "Tramo de Cobros 2 (Días 15-31)", resumen.tramos[1].ingresos);
}

function calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes) {
  let eventos = Array.isArray(eventosIngresosMes) ? eventosIngresosMes : [];
  let comps = Array.isArray(compromisosMes) ? compromisosMes : [];

  let preComps = comps.filter(c => parseInt(c.dia, 10) === -1);
  let q1Comps = comps.filter(c => {
    let d = parseInt(c.dia, 10);
    return d >= 1 && d <= 14;
  });
  let q2Comps = comps.filter(c => parseInt(c.dia, 10) >= 15);

  let ingQ1 = eventos
    .filter(e => e.dia >= 1 && e.dia <= 14)
    .reduce((acc, e) => acc + e.valor, 0);
  let ingQ2 = eventos
    .filter(e => e.dia >= 15)
    .reduce((acc, e) => acc + e.valor, 0);

  let gastosPre = preComps.reduce((acc, c) => acc + c.valor, 0);
  let gastosQ1Nativos = q1Comps.reduce((acc, c) => acc + c.valor, 0);
  let gastosQ1 = gastosPre + gastosQ1Nativos;
  let gastosQ2 = q2Comps.reduce((acc, c) => acc + c.valor, 0);

  let saldoInicialQ1 = 0;
  let netoQ1 = ingQ1 - gastosQ1;
  let saldoCierreQ1 = saldoInicialQ1 + netoQ1;

  let saldoInicialQ2 = saldoCierreQ1;
  let netoQ2 = ingQ2 - gastosQ2;
  let saldoCierreQ2 = saldoInicialQ2 + netoQ2;

  return {
    preComps,
    q1Comps,
    q2Comps,
    tramos: [
      {
        id: 'q1',
        nombre: 'Q1',
        saldoInicial: saldoInicialQ1,
        ingresos: ingQ1,
        gastos: gastosQ1,
        gastosPreMes: gastosPre,
        gastosNativos: gastosQ1Nativos,
        neto: netoQ1,
        saldoCierre: saldoCierreQ1
      },
      {
        id: 'q2',
        nombre: 'Q2',
        saldoInicial: saldoInicialQ2,
        ingresos: ingQ2,
        gastos: gastosQ2,
        gastosPreMes: 0,
        gastosNativos: gastosQ2,
        neto: netoQ2,
        saldoCierre: saldoCierreQ2
      }
    ]
  };
}

function renderBloquePreMesIntegrado(container, preComps) {
  if(!container) return;
  let total = preComps.reduce((acc, c) => acc + c.valor, 0);
  if(preComps.length === 0) {
    container.innerHTML = `<div style="font-size:12px;color:var(--color-text-tertiary);">No hay cargos Pre-Mes este periodo.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:13px;">Pre-Mes integrado en Q1</strong>
      <span style="font-size:11px;color:var(--color-text-tertiary);">${preComps.length} item(s) · ${formatCOP(total)}</span>
    </div>
    <div class="rm" style="font-size:11px;color:var(--color-text-secondary);">Estos cargos ahora impactan dentro del bloque de gastos de Q1 y se marcan con badge de origen en el listado de Q1.</div>
  `;
}

function buildQuincenaHtml(container, list, titulo, fondoDisponible = null) {
  let suma = list.reduce((acc, c) => acc + c.valor, 0);
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <strong style="font-size:13px">${titulo}</strong>
    <span style="font-size:11px;color:var(--color-text-tertiary)">Gastos: ${formatCOP(suma)}</span>
  </div>`;

  if(fondoDisponible !== null) {
    html += `<div style="font-size:11px; margin-bottom:8px; color:${fondoDisponible >= suma ? '#1D9E75' : '#A32D2D'}">
      Fondos asignados a este tramo: <strong>${formatCOP(fondoDisponible)}</strong>
    </div>`;
    if(fondoDisponible < suma) {
      html += `<div class="alert" style="background:#FAEEDA;border-color:#FAC775;padding:6px 10px;margin-bottom:8px; font-size:11px; color:#854F0B">¡Atención! Los fondos no alcanzan para cubrir este tramo.</div>`;
    }
  }

  list.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    let origenBadge = c.__origenPreMes
      ? '<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#F4E9FF;color:#55308D;font-size:10px;">Viene de Pre-Mes</span>'
      : '';
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div><div>${nombreSeguro}</div>${origenBadge}</div>
        </div>
        <div class="ra neg">${formatCOP(c.valor)}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderBalanceQuincena(compromisosMes) {
  let cont = document.getElementById('balance-quincena-bloque');
  if(!cont) return;

  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let resumen = calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes);
  let tramos = resumen.tramos;
  let state = iaPanelState && iaPanelState.rebalanceQuincena
    ? iaPanelState.rebalanceQuincena
    : { loading: false, error: false, result: '' };

  let rowsHtml = tramos.map((t) => {
    let colorNeto = t.neto >= 0 ? '#1D9E75' : '#E24B4A';
    let extraQ1 = t.id === 'q1'
      ? `<div class="rm" style="font-size:10px;">Incluye Pre-Mes: ${formatCOP(t.gastosPreMes)} · Nativo Q1: ${formatCOP(t.gastosNativos)}</div>`
      : '';
    return `
      <div style="border:1px solid var(--color-border-secondary);border-radius:8px;padding:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:12px;">${t.nombre}</strong>
          <span style="font-size:11px;color:var(--color-text-tertiary);">Cierre: ${formatCOP(t.saldoCierre)}</span>
        </div>
        <div class="row"><div class="rn">Saldo inicial</div><div class="ra">${formatCOP(t.saldoInicial)}</div></div>
        <div class="row"><div class="rn">Ingresos</div><div class="ra pos">${formatCOP(t.ingresos)}</div></div>
        <div class="row"><div class="rn">Gastos</div><div class="ra neg">${formatCOP(t.gastos)}</div></div>
        ${extraQ1}
        <div class="row"><div class="rn">Neto</div><div class="ra" style="color:${colorNeto};font-weight:600;">${formatCOP(t.neto)}</div></div>
      </div>
    `;
  }).join('');

  let resultBox = state.result
    ? `<div class="rm" style="margin-top:8px;color:${state.error ? '#A32D2D' : 'var(--color-text-secondary)'};">${escapeHTML(state.result)}</div>`
    : '';
  let accionesBox = typeof renderAccionesRebalanceoIA === 'function'
    ? renderAccionesRebalanceoIA('quincena')
    : '';
  let hayDeficit = tramos.some((t) => t.saldoCierre < 0);
  let ctaRebalanceo = `<button class="btn-action btn-ia" data-action="rebalance-quincena-from-balance" ${state.loading ? 'disabled' : ''} style="width:100%;margin-top:4px;">
      ${state.loading ? 'Analizando rebalanceo...' : '<img src="./assets/icons/ai-badge.svg" class="btn-ia-icon" alt=""> Rebalancear entre tramos'}
    </button>`;
  let notaSinDeficit = hayDeficit
    ? ''
    : '<div class="rm" style="margin-top:8px;">Sin deficit en quincena. Puedes usar rebalanceo preventivo.</div>';

  cont.innerHTML = `
    ${rowsHtml}
    ${ctaRebalanceo}
    ${notaSinDeficit}
    ${resultBox}
    ${accionesBox}
  `;
}

function ejecutarRebalanceoQuincenaDesdeBalance() {
  if(typeof analizarRebalanceoQuincenaIA !== 'function') {
    alert('No se pudo iniciar el rebalanceo quincenal.');
    return;
  }

  let run = analizarRebalanceoQuincenaIA();
  if(run && typeof run.finally === 'function') {
    run.finally(() => {
      renderBalanceQuincena(getCompromisosMesActual());
    });
    return;
  }

  renderBalanceQuincena(getCompromisosMesActual());
}

// CORRECCIÓN Y ACTUALIZACIÓN: LÓGICA DEL CALENDARIO E INTERACCIÓN DE CLICK
function renderCalendario(compromisosMes) {
  let grid = document.getElementById('grid-calendario');
  grid.innerHTML = '';
  ['L','M','X','J','V','S','D'].forEach(d => { let h = document.createElement('div'); h.className = 'cal-day-h'; h.innerText = d; grid.appendChild(h); });

  let partes = mesActivoGlobal.split(" ");
  const mesesIndices = {"Enero":0,"Febrero":1,"Marzo":2,"Abril":3,"Mayo":4,"Junio":5,"Julio":6,"Agosto":7,"Septiembre":8,"Octubre":9,"Noviembre":10,"Diciembre":11};
  let mesIdx = mesesIndices[partes[0]];
  let anio = parseInt(partes[1]);
  let totalDias = new Date(anio, mesIdx + 1, 0).getDate();
  let offset = new Date(anio, mesIdx, 1).getDay();
  offset = offset === 0 ? 6 : offset - 1;

  for(let i=0; i<offset; i++) grid.appendChild(document.createElement('div'));

  let mapaDias = {};
  let mapaPagosRealesCompromisos = {};
  compromisosMes.forEach(c => {
    let d = parseInt(c.dia); 
    if (d === -1) d = 1; // Muestra los cargos fijos "pre-mes" en el día 1 para visualización
    if (!mapaDias[d]) mapaDias[d] = [];
    mapaDias[d].push(c);

    let diaReal = parseInt(c.diaPagoReal, 10);
    if(!isNaN(diaReal) && diaReal >= 1 && diaReal <= 31) {
      if(!mapaPagosRealesCompromisos[diaReal]) mapaPagosRealesCompromisos[diaReal] = [];
      mapaPagosRealesCompromisos[diaReal].push(c);
    }
  });

  let detallePago = obtenerDetalleDiasPagoMes(mesActivoGlobal);

  for(let dia=1; dia<=totalDias; dia++) {
    let item = document.createElement('div'); 
    item.className = 'cal-day';
    if(diaSeleccionadoActivo === dia) item.classList.add('active-day');

    let numDia = document.createElement('span'); 
    numDia.innerText = dia; 
    item.appendChild(numDia);

      if(detallePago[dia]) {
        let esReal = detallePago[dia].real;
        let esArrastre = detallePago[dia].arrastre;
        let payMark = document.createElement('div');
        payMark.className = 'cal-pay-mark';
        payMark.innerText = '$';
        if(esReal && esArrastre) {
          payMark.title = 'Día de pago real + impacto de arrastre del mes anterior';
        } else if(esReal) {
          payMark.title = 'Día de pago real de ingreso';
        } else {
          payMark.title = 'Día con impacto de arrastre del mes anterior';
        }
        item.appendChild(payMark);
      }

      if(mapaPagosRealesCompromisos[dia] && mapaPagosRealesCompromisos[dia].length > 0) {
        let realMark = document.createElement('div');
        realMark.className = 'cal-pay-mark';
        realMark.style.right = '20px';
        realMark.style.background = '#136F63';
        realMark.innerText = 'R';
        realMark.title = 'Compromisos con fecha real de pago';
        item.appendChild(realMark);
      }

    // Si el día tiene compromisos financieros asignados
    if(mapaDias[dia] && mapaDias[dia].length > 0) {
      let todosPagados = mapaDias[dia].every(c => c.pagado);
      let dot = document.createElement('div'); 
      // Lógica solicitada: Rojo si hay deuda, verde si todo el día pasó a pagado
      dot.className = `cal-dot ${todosPagados ? 'all-paid' : 'pending'}`;
      item.appendChild(dot);
    }

    // Evento Click para desplegar o cerrar la vista diaria
    item.onclick = function() {
      if(diaSeleccionadoActivo === dia) {
        diaSeleccionadoActivo = null; // Si hace click en el mismo día activo, se cierra
      } else {
        diaSeleccionadoActivo = dia;
      }
      initApp();
    };

    grid.appendChild(item);
  }
}

function obtenerPagosRealesDiferidosDelDia(mesKey, diaObjetivo) {
  let pagos = [];
  let { mes, anio } = parseMesKey(mesKey);
  let mesIdx = ORDEN_MESES.indexOf(mes);
  let diasMes = new Date(anio, mesIdx + 1, 0).getDate();

  appData.ingresosList.forEach(i => {
    if(!ingresoActivoEnMes(i, mesKey)) return;
    let diasReales = obtenerDiasPagoIngresoEnMes(i, mesKey);
    diasReales.forEach((d, idx) => {
      if(d === diaObjetivo && d > 28) {
        pagos.push({
          id: `real-diferido-${i.id}-${mesKey}-${idx}`,
          nombre: i.nombre,
          valor: i.valor,
          tipo: 'ingreso'
        });
      }
    });
  });

  appData.primasList
    .filter(p => p.mesKey === mesKey)
    .forEach(p => {
      let dia = normalizarDiaPagoDeMes(parseInt(p.diaPago, 10) || 1, anio, mesIdx, diasMes);
      if(dia === diaObjetivo && dia > 28) {
        pagos.push({
          id: `real-diferido-prima-${p.id}-${mesKey}`,
          nombre: p.nombre,
          valor: p.valor,
          tipo: 'prima'
        });
      }
    });

  return pagos;
}

function obtenerCompromisosConPagoRealDelDia(mesKey, diaObjetivo) {
  return appData.compromisos
    .filter((c) => c.mesKey === mesKey)
    .filter((c) => {
      let diaReal = parseInt(c.diaPagoReal, 10);
      return !isNaN(diaReal) && diaReal === diaObjetivo;
    });
}

// NUEVO: SISTEMA DE DESPLIEGUE DE LA VISTA DIARIA
function renderVistaDiaria(compromisosMes) {
  let secTitulo = document.getElementById('sec-vista-diaria');
  let cardContenedor = document.getElementById('card-vista-diaria');

  // Filtrar compromisos correspondientes al día seleccionado
  let deEsteDia = compromisosMes.filter(c => {
    let d = parseInt(c.dia);
    if(d === -1 && diaSeleccionadoActivo === 1) return true; // Incluye fijos pre-mes en el día 1
    return d === diaSeleccionadoActivo;
  });

  // Filtrar ingresos que entran este día (incluye primas y arrastres)
  let ingresosDia = obtenerEventosIngresoDelMes(mesActivoGlobal)
    .filter(e => e.dia === diaSeleccionadoActivo);
  let pagosRealesDiferidosDia = obtenerPagosRealesDiferidosDelDia(mesActivoGlobal, diaSeleccionadoActivo);
  let compromisosPagoRealDia = obtenerCompromisosConPagoRealDelDia(mesActivoGlobal, diaSeleccionadoActivo)
    .filter((c) => {
      let diaTentativo = parseInt(c.dia, 10);
      if(diaTentativo === -1) diaTentativo = 1;
      return diaTentativo !== diaSeleccionadoActivo;
    });

  secTitulo.innerText = `Detalle del Día ${diaSeleccionadoActivo} de ${mesActivoGlobal}`;
  secTitulo.style.display = 'flex';
  cardContenedor.style.display = 'block';

  if(deEsteDia.length === 0 && ingresosDia.length === 0 && pagosRealesDiferidosDia.length === 0 && compromisosPagoRealDia.length === 0) {
    cardContenedor.innerHTML = `
      <div style="font-size:12px; color:var(--color-text-tertiary); text-align:center; padding: 10px 0;">
        ¡Día libre! No tienes ingresos ni obligaciones programadas para esta fecha. 🎉
      </div>
    `;
    return;
  }

  let totalDiaSum = deEsteDia.reduce((acc, c) => acc + c.valor, 0);
  let totalIngresoDia = ingresosDia.reduce((acc, e) => acc + e.valor, 0);
  let totalPagoRealDiferidoDia = pagosRealesDiferidosDia.reduce((acc, e) => acc + e.valor, 0);

  let html = `
    <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--color-text-secondary); margin-bottom:10px; border-bottom:1px dashed var(--color-border-secondary); padding-bottom:6px;">
      <span>Ingresos: <strong class="pos">${formatCOP(totalIngresoDia)}</strong></span>
      <span>Pagos: <strong class="neg">${formatCOP(totalDiaSum)}</strong></span>
    </div>
  `;

  if(totalPagoRealDiferidoDia > 0) {
    html += `
      <div style="font-size:11px; color:var(--color-text-tertiary); margin-bottom:8px;">
        Pago real hoy (se refleja en flujo el día 1 del mes siguiente):
        <strong class="pos">${formatCOP(totalPagoRealDiferidoDia)}</strong>
      </div>
    `;
  }

  if(compromisosPagoRealDia.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin-bottom:8px;">Compromisos con pago real hoy (fecha tentativa distinta):</div>`;
    compromisosPagoRealDia.forEach((c) => {
      let nombreSeguro = escapeHTML(c.nombre);
      let diaTentativo = parseInt(c.dia, 10);
      if(diaTentativo === -1) diaTentativo = 1;
      html += `
        <div class="row">
          <div class="rn"><i class="ti ti-calendar-event"></i> ${nombreSeguro}</div>
          <div class="ra neg">${formatCOP(c.valor)} <span class="rm">(impacta día ${diaTentativo})</span></div>
        </div>
      `;
    });
  }

  if(ingresosDia.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin-bottom:6px;">Pagos recibidos este día:</div>`;
    ingresosDia.forEach(i => {
      let nombreSeguro = escapeHTML(i.nombre);
      let subtipo = i.origen === 'arrastre' || i.origen === 'prima-arrastre'
        ? 'arrastre'
        : (i.origen === 'prima' ? 'prima' : 'ingreso');
      html += `
        <div class="row">
          <div class="rn"><i class="ti ti-arrow-down-right"></i> ${nombreSeguro}</div>
          <div class="ra pos">${formatCOP(i.valor)} <span class="rm">(${subtipo})</span></div>
        </div>
      `;
    });
  }

  if(pagosRealesDiferidosDia.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin:8px 0 6px;">Pagos reales de hoy (diferidos):</div>`;
    pagosRealesDiferidosDia.forEach(i => {
      let nombreSeguro = escapeHTML(i.nombre);
      html += `
        <div class="row">
          <div class="rn"><i class="ti ti-calendar-dollar"></i> ${nombreSeguro}</div>
          <div class="ra pos">${formatCOP(i.valor)} <span class="rm">(${i.tipo})</span></div>
        </div>
      `;
    });
  }

  if(deEsteDia.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin:8px 0 6px;">Obligaciones a pagar este día:</div>`;
  }

  deEsteDia.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    let diaReal = parseInt(c.diaPagoReal, 10);
    let diaRealTxt = (!isNaN(diaReal) && diaReal >= 1 && diaReal <= 31)
      ? `Pago real: día ${diaReal}`
      : 'Pago real: usa fecha tentativa';
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div>
            <div style="font-size:13px; font-weight:500;">${nombreSeguro}</div>
            <div class="rm" style="text-transform: capitalize;">${c.tipo} · ${diaRealTxt}</div>
          </div>
        </div>
        <div class="ra ${c.pagado ? 'pos' : 'neg'}" style="font-size:13px;">${formatCOP(c.valor)}</div>
      </div>
    `;
  });

  cardContenedor.innerHTML = html;
}

function ocultarVistaDiariaDOM() {
  let secTitulo = document.getElementById('sec-vista-diaria');
  let cardContenedor = document.getElementById('card-vista-diaria');
  if(secTitulo) secTitulo.style.display = 'none';
  if(cardContenedor) cardContenedor.style.display = 'none';
}

function procesarNuevoGasto() {
  return window.FinancialActions.processNewExpense();
}

function resetAFactory() {
  if(confirm("¿Resetear?")) { appData = JSON.parse(JSON.stringify(datosDefault)); initApp(); }
}

function registrarServiceWorker() {
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    // Fail silently; app should continue working without offline cache.
  });
}

function registrarEventosHtmlEstaticos() {
  if(htmlActionHandlersBound) return;
  htmlActionHandlersBound = true;

  document.addEventListener('click', (event) => {
    let el = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
    if(!el) return;

    let action = el.getAttribute('data-action');
    let value = el.getAttribute('data-value');

    if(action === 'switch-screen') {
      sw(value, el);
      return;
    }
    if(action === 'show-quincena') {
      showQ(value);
      return;
    }
    if(action === 'rebalance-quincena-from-balance') {
      ejecutarRebalanceoQuincenaDesdeBalance();
      return;
    }
    if(action === 'filter-debt') {
      cambiarFiltroDeuda(value);
      return;
    }
    if(action === 'clear-debt-date-filter') {
      limpiarFiltroFechaDeudas();
      return;
    }
    if(action === 'set-debt-entry-mode') {
      setModoAltaDeuda(value);
      return;
    }
    if(action === 'save-new-expense') {
      procesarNuevoGasto();
      return;
    }
    if(action === 'add-income') {
      agregarIngresoDinamico();
      return;
    }
    if(action === 'add-bonus') {
      agregarPrimaNoRecurrente();
      return;
    }
    if(action === 'install-pwa') {
      instalarAppPWA();
      return;
    }
    if(action === 'export-backup') {
      exportarRespaldoJSON();
      return;
    }
    if(action === 'open-import-backup') {
      let input = document.getElementById('import-backup-file');
      if(input) input.click();
      return;
    }
    if(action === 'restore-backup') {
      restaurarUltimoRespaldoLocal();
      return;
    }
    if(action === 'test-ai-mode') {
      probarIAConfigurada();
      return;
    }
    if(action === 'sync-drive-now') {
      sincronizarDriveAhora();
      return;
    }
    if(action === 'restore-drive-now') {
      recuperarDesdeDriveAhora();
      return;
    }
    if(action === 'extend-timeline-year') {
      extenderAnioLineaTiempo();
      return;
    }
    if(action === 'reset-factory') {
      resetAFactory();
    }
  });

  document.addEventListener('change', (event) => {
    let el = event.target;
    if(!el || !el.getAttribute) return;

    let action = el.getAttribute('data-action');
    if(!action) return;

    if(action === 'change-month') {
      cambiarMesDeVisualizacion(el.value);
      return;
    }
    if(action === 'set-locale') {
      setAppLocale(el.value);
      initApp({ skipPersist: true, skipDataNormalization: true, skipLocaleInit: true });
      return;
    }
    if(action === 'debt-type-change') {
      onTipoGastoAltaChange(el.value);
      return;
    }
    if(action === 'apply-debt-date-filter') {
      aplicarFiltroFechaDeudas();
      return;
    }
    if(action === 'update-debt-preview') {
      actualizarPreviewNuevaDeuda();
      return;
    }
    if(action === 'import-backup-file') {
      importarRespaldoArchivo(event);
      return;
    }
    if(action === 'set-ai-mode') {
      setModoIA(el.value);
      return;
    }
    if(action === 'save-local-ai-config') {
      guardarConfigIALocal();
      return;
    }
    if(action === 'save-api-ai-config') {
      guardarConfigIAApi();
      return;
    }
    if(action === 'save-google-auth-config') {
      guardarConfigGoogleAuth();
    }
  });

  document.addEventListener('input', (event) => {
    let el = event.target;
    if(!el || !el.getAttribute) return;
    let action = el.getAttribute('data-action');
    if(action === 'update-debt-preview') {
      actualizarPreviewNuevaDeuda();
    }
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  let btn = document.getElementById('btn-install-app');
  if(btn) btn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  let btn = document.getElementById('btn-install-app');
  if(btn) btn.style.display = 'none';
});

window.onload = function() {
  registrarEventosHtmlEstaticos();

  if(window.FinancialI18n && typeof window.FinancialI18n.initializeLocale === 'function') {
    window.FinancialI18n.initializeLocale();
  }

  hidratarDataDesdeIndexedDB().finally(async () => {
    await procesarCallbackGoogleOAuthSiAplica();
    initApp();
    registrarServiceWorker();
  });
};
