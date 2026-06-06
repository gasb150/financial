// State defaults, schema migrations, and store synchronization extracted from app.js.

let mesesLineaTiempo = [
  "Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"
];

const ORDEN_MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function obtenerMesKeyActualInicial() {
  if(typeof window !== 'undefined' && window.FinancialTimelineUseCases && typeof window.FinancialTimelineUseCases.getMonthKeyForDate === 'function') {
    return window.FinancialTimelineUseCases.getMonthKeyForDate(new Date(), ORDEN_MESES);
  }
  let now = new Date();
  return `${ORDEN_MESES[now.getMonth()]} ${now.getFullYear()}`;
}

let mesActivoGlobal = obtenerMesKeyActualInicial();
let filtroDeudaActivo = "todas";
let semanaSeleccionadaIndex = 0;
let diaSeleccionadoActivo = null; // Stores the active day selected for the daily view.
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
    lastSyncEmail: '',
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
        lastSyncEmail: '',
        lastError: '',
        syncInProgress: false,
        syncEvents: []
      };
    }
    return data;
  }
};

let appData = aplicarMigracionesSchema(JSON.parse(localStorage.getItem(STORAGE_KEY)) || datosDefault);
let appStore = window.FinancialAppStore && typeof window.FinancialAppStore.createAppStore === 'function'
  ? window.FinancialAppStore.createAppStore()
  : null;
let idbReady = false;
let idbPromise = null;

normalizarEstadoCargado();
syncAppStoreState();
