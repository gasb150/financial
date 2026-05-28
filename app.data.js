// Data and persistence module extracted from app.js for maintainability.

(function initFinancialDataModule(globalScope) {
  const PERSISTENCE_TRACE_LIMIT = 25;

  function toSafeInt(value, fallback = 0, min = 0) {
    let n = parseInt(value, 10);
    if(Number.isNaN(n)) n = fallback;
    return Math.max(min, n);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function sanitizeIngresoItem(raw, idx = 0) {
    if(!raw || typeof raw !== 'object') return null;
    let id = Number.isFinite(raw.id) ? raw.id : Date.now() + idx;
    let nombre = String(raw.nombre || '').trim();
    let valor = Number(raw.valor);
    let periodo = String(raw.periodo || 'q2').trim();
    let diaPago = toSafeInt(raw.diaPago, 1, 1);
    let mesInicio = typeof raw.mesInicio === 'string' && raw.mesInicio.trim() ? raw.mesInicio : null;
    let mesFin = typeof raw.mesFin === 'string' && raw.mesFin.trim() ? raw.mesFin : null;
    let mesFinIndefinido = raw.mesFinIndefinido === undefined ? !mesFin : !!raw.mesFinIndefinido;

    if(!nombre || !isFiniteNumber(valor) || valor <= 0) return null;
    if(diaPago < 1 || diaPago > 31) return null;
    if(!mesInicio) return null;

    return {
      id,
      nombre,
      valor: Math.round(valor),
      periodo: periodo || 'q2',
      diaPago,
      mesInicio,
      mesFin,
      mesFinIndefinido
    };
  }

  function sanitizePrimaItem(raw, idx = 0) {
    if(!raw || typeof raw !== 'object') return null;
    let id = Number.isFinite(raw.id) ? raw.id : Date.now() + idx;
    let nombre = String(raw.nombre || '').trim();
    let valor = Number(raw.valor);
    let diaPago = toSafeInt(raw.diaPago, 1, 1);
    let mesKey = typeof raw.mesKey === 'string' && raw.mesKey.trim() ? raw.mesKey : null;
    if(!nombre || !isFiniteNumber(valor) || valor <= 0) return null;
    if(diaPago < 1 || diaPago > 31) return null;
    if(!mesKey) return null;
    return { id, nombre, valor: Math.round(valor), diaPago, mesKey };
  }

  function sanitizeCompromisoItem(raw, idx = 0) {
    if(!raw || typeof raw !== 'object') return null;
    let id = Number.isFinite(raw.id) ? raw.id : Date.now() + idx;
    let nombre = String(raw.nombre || '').trim();
    let valor = Number(raw.valor);
    let dia = Number(raw.dia);
    let tipo = String(raw.tipo || 'variable').toLowerCase();
    let pagado = !!raw.pagado;
    let mesKey = typeof raw.mesKey === 'string' && raw.mesKey.trim() ? raw.mesKey : null;
    if(!nombre || !isFiniteNumber(valor) || valor <= 0) return null;
    if(dia !== -1 && (!Number.isFinite(dia) || dia < 1 || dia > 31)) return null;
    if(!['variable', 'fijo', 'credito'].includes(tipo)) return null;
    if(!mesKey) return null;

    let out = { id, nombre, valor: Math.round(valor), dia: Math.round(dia), pagado, tipo, mesKey };
    if(tipo === 'credito') {
      out.faltantes = toSafeInt(raw.faltantes, 1, 1);
      out.totales = toSafeInt(raw.totales, out.faltantes, 1);
      if(out.faltantes > out.totales) out.faltantes = out.totales;
    }
    return out;
  }

  function sanitizeIAConfig(raw) {
    let cfg = raw && typeof raw === 'object' ? raw : {};
    return {
      mode: ['off', 'local', 'api'].includes(cfg.mode) ? cfg.mode : 'off',
      providerLocalEndpoint: typeof cfg.providerLocalEndpoint === 'string' ? cfg.providerLocalEndpoint : 'http://localhost:11434/api/generate',
      providerLocalModel: typeof cfg.providerLocalModel === 'string' && cfg.providerLocalModel.trim() ? cfg.providerLocalModel : 'llama3.1:8b',
      providerApiEndpoint: typeof cfg.providerApiEndpoint === 'string' ? cfg.providerApiEndpoint : '',
      providerApiName: typeof cfg.providerApiName === 'string' && cfg.providerApiName.trim() ? cfg.providerApiName : 'generic',
      providerApiModel: typeof cfg.providerApiModel === 'string' && cfg.providerApiModel.trim() ? cfg.providerApiModel : 'gpt-4.1-mini',
      providerApiKey: '',
      apiDailyTokenLimit: Math.max(0, toSafeInt(cfg.apiDailyTokenLimit, 80000, 0)),
      apiMonthlyTokenLimit: Math.max(0, toSafeInt(cfg.apiMonthlyTokenLimit, 1200000, 0)),
      apiDailyCopLimit: Math.max(0, toSafeInt(cfg.apiDailyCopLimit, 20000, 0)),
      apiMonthlyCopLimit: Math.max(0, toSafeInt(cfg.apiMonthlyCopLimit, 200000, 0)),
      apiEstimatedCopPer1kTokens: Math.max(1, toSafeInt(cfg.apiEstimatedCopPer1kTokens, 40, 1)),
      timeoutMs: Math.min(Math.max(toSafeInt(cfg.timeoutMs, 45000, 10000), 10000), 180000),
      retries: Math.min(Math.max(toSafeInt(cfg.retries, 1, 0), 0), 4),
      updatedAt: typeof cfg.updatedAt === 'string' ? cfg.updatedAt : null
    };
  }

  function sanitizeIAUsage(raw) {
    let usage = raw && typeof raw === 'object' ? raw : {};
    return {
      dayKey: typeof usage.dayKey === 'string' ? usage.dayKey : null,
      monthKey: typeof usage.monthKey === 'string' ? usage.monthKey : null,
      dailyRequests: Math.max(0, toSafeInt(usage.dailyRequests, 0, 0)),
      monthlyRequests: Math.max(0, toSafeInt(usage.monthlyRequests, 0, 0)),
      dailyTokens: Math.max(0, toSafeInt(usage.dailyTokens, 0, 0)),
      monthlyTokens: Math.max(0, toSafeInt(usage.monthlyTokens, 0, 0)),
      dailyCostCop: Math.max(0, toSafeInt(usage.dailyCostCop, 0, 0)),
      monthlyCostCop: Math.max(0, toSafeInt(usage.monthlyCostCop, 0, 0)),
      lastRequestAt: typeof usage.lastRequestAt === 'string' ? usage.lastRequestAt : null,
      lastProvider: typeof usage.lastProvider === 'string' ? usage.lastProvider : null,
      lastModel: typeof usage.lastModel === 'string' ? usage.lastModel : null
    };
  }

  function sanitizePrimaryData(payload, options = {}) {
    if(!payload || typeof payload !== 'object') return null;
    let strict = options.strict !== false;
    let hasAnyArray =
      Array.isArray(payload.ingresosList)
      || Array.isArray(payload.primasList)
      || Array.isArray(payload.compromisos)
      || Array.isArray(payload.lineaTiempoGuardada);

    if(!hasAnyArray && strict) return null;

    let ingresosList = Array.isArray(payload.ingresosList)
      ? payload.ingresosList.map((it, idx) => sanitizeIngresoItem(it, idx)).filter(Boolean)
      : [];
    let primasList = Array.isArray(payload.primasList)
      ? payload.primasList.map((it, idx) => sanitizePrimaItem(it, idx)).filter(Boolean)
      : [];
    let compromisos = Array.isArray(payload.compromisos)
      ? payload.compromisos.map((it, idx) => sanitizeCompromisoItem(it, idx)).filter(Boolean)
      : [];
    let lineaTiempoGuardada = Array.isArray(payload.lineaTiempoGuardada)
      ? payload.lineaTiempoGuardada.map((x) => String(x || '').trim()).filter(Boolean)
      : [];

    if(strict && (!Array.isArray(payload.ingresosList) || !Array.isArray(payload.compromisos) || !Array.isArray(payload.lineaTiempoGuardada))) {
      return null;
    }
    if(strict && (lineaTiempoGuardada.length === 0)) return null;

    let out = {
      ...payload,
      ingresosList,
      primasList,
      compromisos,
      lineaTiempoGuardada,
      iaConfig: sanitizeIAConfig(payload.iaConfig),
      iaUsage: sanitizeIAUsage(payload.iaUsage)
    };

    if(!out.schemaVersion || !Number.isFinite(out.schemaVersion)) {
      out.schemaVersion = APP_SCHEMA_VERSION;
    }
    if(!out.migraciones || typeof out.migraciones !== 'object') out.migraciones = {};

    return out;
  }

  function validateCoreDataShape(payload) {
    let sanitized = sanitizePrimaryData(payload, { strict: true });
    return !!sanitized;
  }

  function validatePrimaryData(payload) {
    let sanitized = sanitizePrimaryData(payload, { strict: true });
    if(!sanitized) return false;
    let sameIngresos = sanitized.ingresosList.length === payload.ingresosList.length;
    let sameCompromisos = sanitized.compromisos.length === payload.compromisos.length;
    let sameTimeline = sanitized.lineaTiempoGuardada.length === payload.lineaTiempoGuardada.length;
    return sameIngresos && sameCompromisos && sameTimeline;
  }

  function tracePersistenceError(event, error, details = {}) {
    let message = error && error.message ? error.message : String(error || 'unknown');
    let trace = {
      event,
      message,
      details,
      at: new Date().toISOString()
    };
    try {
      if(!appData || typeof appData !== 'object') return;
      if(!Array.isArray(appData.persistenceErrors)) appData.persistenceErrors = [];
      appData.persistenceErrors.push(trace);
      if(appData.persistenceErrors.length > PERSISTENCE_TRACE_LIMIT) {
        appData.persistenceErrors = appData.persistenceErrors.slice(-PERSISTENCE_TRACE_LIMIT);
      }
    } catch(_e) {}
    console.error('[FinancialData]', trace);
  }

  function openIndexedDB() {
    if(!('indexedDB' in window)) {
      return Promise.reject(new Error('indexedDB no disponible'));
    }
    if(idbPromise) return idbPromise;

    idbPromise = new Promise((resolve, reject) => {
      let req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (event) => {
        let db = event.target.result;
        if(!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('No se pudo abrir indexedDB'));
    });

    return idbPromise;
  }

  async function idbGetRaw(key) {
    let db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(IDB_STORE, 'readonly');
      let store = tx.objectStore(IDB_STORE);
      let req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Error lectura indexedDB'));
    });
  }

  async function idbSetRaw(key, value) {
    let db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(IDB_STORE, 'readwrite');
      let store = tx.objectStore(IDB_STORE);
      let req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error || new Error('Error escritura indexedDB'));
    });
  }

  async function hydrateDataFromIndexedDB() {
    try {
      let raw = await idbGetRaw(STORAGE_KEY);
      if(raw) {
        let parsed = JSON.parse(raw);
        let migrada = aplicarMigracionesSchema(parsed);
        if(validatePrimaryData(migrada)) {
          appData = migrada;
        } else {
          let recuperada = sanitizePrimaryData(migrada, { strict: false });
          if(recuperada) {
            appData = recuperada;
            tracePersistenceError('hydrate.partial_recovery', new Error('Payload parcial recuperado'), {
              source: 'indexeddb',
              ingresos: recuperada.ingresosList.length,
              compromisos: recuperada.compromisos.length
            });
          } else {
            tracePersistenceError('hydrate.invalid_payload', new Error('Payload inválido'), { source: 'indexeddb' });
          }
        }
        await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
      } else {
        await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
      }
      idbReady = true;
    } catch(error) {
      idbReady = false;
      tracePersistenceError('hydrate.error', error, { source: 'indexeddb' });
    }

    normalizarEstadoCargado();
  }

  function persistPrimaryDataWithFallback() {
    let serializada = JSON.stringify(appData);
    if(idbReady) {
      idbSetRaw(STORAGE_KEY, serializada).catch((error) => {
        tracePersistenceError('persist.primary.idb', error, { key: STORAGE_KEY });
        localStorage.setItem(STORAGE_KEY, serializada);
      });
    }
    localStorage.setItem(STORAGE_KEY, serializada);
  }

  async function persistAuxDataWithFallback(marcaGuardadoISO) {
    let payload = buildBackupPayload();
    payload.checksum = await generatePayloadChecksum(payload.data);
    let backup = JSON.stringify(payload);
    localStorage.setItem(STORAGE_BACKUP_KEY, backup);
    localStorage.setItem(STORAGE_LAST_SAVE_KEY, marcaGuardadoISO);

    if(idbReady) {
      idbSetRaw(STORAGE_BACKUP_KEY, backup).catch((error) => {
        tracePersistenceError('persist.backup.idb', error, { key: STORAGE_BACKUP_KEY });
      });
      idbSetRaw(STORAGE_LAST_SAVE_KEY, marcaGuardadoISO).catch((error) => {
        tracePersistenceError('persist.last_save.idb', error, { key: STORAGE_LAST_SAVE_KEY });
      });
    }
  }

  function validateBackupPayload(payload) {
    let data = payload && payload.data ? payload.data : payload;
    return validateCoreDataShape(data);
  }

  async function sha256Hex(texto) {
    if(!(window.crypto && window.crypto.subtle)) {
      throw new Error('crypto.subtle no disponible');
    }
    let data = new TextEncoder().encode(texto);
    let hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function hashFallbackHex(texto) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for(let i = 0; i < texto.length; i++) {
      let ch = texto.charCodeAt(i);
      h1 ^= ch;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= (ch + (i & 255));
      h2 = Math.imul(h2, 0x27d4eb2d) >>> 0;
    }
    return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  }

  async function generatePayloadChecksum(dataObj) {
    let canon = JSON.stringify(dataObj);
    if(window.crypto && window.crypto.subtle) {
      return `sha256:${await sha256Hex(canon)}`;
    }
    return `fnv1a:${hashFallbackHex(canon)}`;
  }

  async function validateBackupChecksum(backupObj) {
    if(!backupObj || typeof backupObj !== 'object') return false;
    if(!backupObj.data || typeof backupObj.checksum !== 'string') return false;
    let recibido = backupObj.checksum.trim();
    if(!recibido) return false;
    let canon = JSON.stringify(backupObj.data);

    if(recibido.startsWith('sha256:')) {
      if(!(window.crypto && window.crypto.subtle)) return false;
      let esperado = `sha256:${await sha256Hex(canon)}`;
      return esperado === recibido;
    }

    if(recibido.startsWith('fnv1a:')) {
      let esperado = `fnv1a:${hashFallbackHex(canon)}`;
      return esperado === recibido;
    }

    // Compatibilidad con respaldos legacy que guardaban solo el hash SHA-256 sin prefijo.
    if(window.crypto && window.crypto.subtle) {
      let esperadoLegacy = await sha256Hex(canon);
      return esperadoLegacy === recibido;
    }

    return false;
  }

  function buildBackupPayload() {
    return {
      version: 1,
      dataSchemaVersion: appData.schemaVersion || APP_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      data: appData,
      checksum: ''
    };
  }

  globalScope.FinancialData = {
    validatePrimaryData,
    sanitizePrimaryData,
    tracePersistenceError,
    openIndexedDB,
    idbGetRaw,
    idbSetRaw,
    hydrateDataFromIndexedDB,
    persistPrimaryDataWithFallback,
    persistAuxDataWithFallback,
    validateBackupPayload,
    sha256Hex,
    hashFallbackHex,
    generatePayloadChecksum,
    validateBackupChecksum,
    buildBackupPayload
  };
})(window);
