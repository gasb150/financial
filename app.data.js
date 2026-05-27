// Data and persistence module extracted from app.js for maintainability.

(function initFinancialDataModule(globalScope) {
  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function normalizeIAConfig(raw) {
    let src = raw && typeof raw === 'object' ? raw : {};
    let mode = String(src.mode || 'off').toLowerCase();
    if(!['off', 'local', 'api'].includes(mode)) mode = 'off';

    let timeoutMs = parseInt(src.timeoutMs, 10);
    if(isNaN(timeoutMs)) timeoutMs = 45000;
    timeoutMs = Math.min(Math.max(timeoutMs, 10000), 180000);

    let retries = parseInt(src.retries, 10);
    if(isNaN(retries)) retries = 1;
    retries = Math.min(Math.max(retries, 0), 4);

    return {
      mode,
      providerLocalEndpoint: isNonEmptyString(src.providerLocalEndpoint)
        ? src.providerLocalEndpoint.trim()
        : 'http://localhost:11434/api/generate',
      providerLocalModel: isNonEmptyString(src.providerLocalModel)
        ? src.providerLocalModel.trim()
        : 'llama3.1:8b',
      timeoutMs,
      retries,
      updatedAt: src.updatedAt || null
    };
  }

  function isValidIngreso(item) {
    if(!item || typeof item !== 'object') return false;
    if(!isNonEmptyString(item.nombre)) return false;
    if(!isFiniteNumber(item.valor)) return false;
    return true;
  }

  function isValidCompromiso(item) {
    if(!item || typeof item !== 'object') return false;
    if(!isNonEmptyString(item.nombre)) return false;
    if(!isFiniteNumber(item.valor)) return false;
    let dia = parseInt(item.dia, 10);
    if(isNaN(dia) || dia < -1 || dia > 31) return false;
    if(!isNonEmptyString(item.mesKey)) return false;
    return true;
  }

  function isValidPrima(item) {
    if(!item || typeof item !== 'object') return false;
    if(!isNonEmptyString(item.nombre)) return false;
    if(!isFiniteNumber(item.valor)) return false;
    return true;
  }

  function isValidHistoryEntry(item) {
    if(!item || typeof item !== 'object') return false;
    if(!isNonEmptyString(item.id)) return false;
    if(!isNonEmptyString(item.at)) return false;
    if(!isNonEmptyString(item.source)) return false;
    if(!isNonEmptyString(item.actionType)) return false;
    if(!isNonEmptyString(item.status)) return false;
    return true;
  }

  function isValidPersistenceErrorEntry(item) {
    if(!item || typeof item !== 'object') return false;
    if(!isNonEmptyString(item.id)) return false;
    if(!isNonEmptyString(item.at)) return false;
    if(!isNonEmptyString(item.source)) return false;
    if(!isNonEmptyString(item.message)) return false;
    return true;
  }

  function sanitizePrimaryData(payload) {
    let src = payload && typeof payload === 'object' ? payload : {};
    let base = typeof datosDefault === 'object' && datosDefault
      ? JSON.parse(JSON.stringify(datosDefault))
      : {
          ingresosList: [],
          primasList: [],
          compromisos: [],
          iaHistory: [],
          persistenceErrors: [],
          lineaTiempoGuardada: [],
          iaConfig: {
            mode: 'off',
            providerLocalEndpoint: 'http://localhost:11434/api/generate',
            providerLocalModel: 'llama3.1:8b',
            timeoutMs: 45000,
            retries: 1,
            updatedAt: null
          }
        };

    let sane = {
      ...base,
      ...src,
      ingresosList: Array.isArray(src.ingresosList)
        ? src.ingresosList.filter(isValidIngreso).map((it) => ({ ...it }))
        : [],
      primasList: Array.isArray(src.primasList)
        ? src.primasList.filter(isValidPrima).map((it) => ({ ...it }))
        : [],
      compromisos: Array.isArray(src.compromisos)
        ? src.compromisos.filter(isValidCompromiso).map((it) => ({ ...it }))
        : [],
      lineaTiempoGuardada: Array.isArray(src.lineaTiempoGuardada)
        ? src.lineaTiempoGuardada.filter((it) => isNonEmptyString(it)).map((it) => it.trim())
        : [],
      iaConfig: normalizeIAConfig(src.iaConfig),
      iaHistory: Array.isArray(src.iaHistory)
        ? src.iaHistory.filter(isValidHistoryEntry).map((it) => ({ ...it })).slice(-500)
        : []
      ,
      persistenceErrors: Array.isArray(src.persistenceErrors)
        ? src.persistenceErrors.filter(isValidPersistenceErrorEntry).map((it) => ({ ...it })).slice(-200)
        : []
    };

    if(!sane.lineaTiempoGuardada.length && Array.isArray(base.lineaTiempoGuardada)) {
      sane.lineaTiempoGuardada = [...base.lineaTiempoGuardada];
    }

    if(!sane.migraciones || typeof sane.migraciones !== 'object') sane.migraciones = {};
    if(!Number.isInteger(sane.schemaVersion)) sane.schemaVersion = APP_SCHEMA_VERSION;
    return sane;
  }

  function validatePrimaryData(payload) {
    if(!payload || typeof payload !== 'object') return false;
    if(!Array.isArray(payload.ingresosList)) return false;
    if(!Array.isArray(payload.compromisos)) return false;
    if(!Array.isArray(payload.lineaTiempoGuardada)) return false;
    if(!payload.ingresosList.every(isValidIngreso)) return false;
    if(!payload.compromisos.every(isValidCompromiso)) return false;
    if(!payload.lineaTiempoGuardada.every((it) => isNonEmptyString(it))) return false;
    if(payload.primasList !== undefined) {
      if(!Array.isArray(payload.primasList)) return false;
      if(!payload.primasList.every(isValidPrima)) return false;
    }
    if(payload.iaConfig !== undefined) {
      if(!payload.iaConfig || typeof payload.iaConfig !== 'object') return false;
    }
    if(payload.iaHistory !== undefined) {
      if(!Array.isArray(payload.iaHistory)) return false;
      if(!payload.iaHistory.every(isValidHistoryEntry)) return false;
    }
    if(payload.persistenceErrors !== undefined) {
      if(!Array.isArray(payload.persistenceErrors)) return false;
      if(!payload.persistenceErrors.every(isValidPersistenceErrorEntry)) return false;
    }
    return true;
  }

  function registerPersistenceError(source, err, metadata = {}) {
    if(!appData || typeof appData !== 'object') return;
    if(!Array.isArray(appData.persistenceErrors)) appData.persistenceErrors = [];

    let msg = '';
    if(err && typeof err === 'object' && err.message) msg = String(err.message);
    else msg = String(err || 'unknown persistence error');

    let entry = {
      id: `perr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      at: new Date().toISOString(),
      source: String(source || 'data').toLowerCase(),
      message: msg,
      metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {}
    };

    appData.persistenceErrors.push(entry);
    if(appData.persistenceErrors.length > 200) {
      appData.persistenceErrors = appData.persistenceErrors.slice(-200);
    }
  }

  function clearPersistenceErrors() {
    if(!appData || typeof appData !== 'object') return;
    appData.persistenceErrors = [];
  }

  function openIndexedDB() {
    if(!('indexedDB' in window)) {
      let err = new Error('indexedDB no disponible');
      registerPersistenceError('idb-open', err);
      return Promise.reject(err);
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
      req.onerror = () => {
        let err = req.error || new Error('No se pudo abrir indexedDB');
        registerPersistenceError('idb-open', err);
        reject(err);
      };
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
      req.onerror = () => {
        let err = req.error || new Error('Error lectura indexedDB');
        registerPersistenceError('idb-read', err, { key });
        reject(err);
      };
    });
  }

  async function idbSetRaw(key, value) {
    let db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      let tx = db.transaction(IDB_STORE, 'readwrite');
      let store = tx.objectStore(IDB_STORE);
      let req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        let err = req.error || new Error('Error escritura indexedDB');
        registerPersistenceError('idb-write', err, { key });
        reject(err);
      };
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
          await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
        } else {
          // Recovery path: salvage valid blocks and keep app booting safely.
          let recuperada = aplicarMigracionesSchema(sanitizePrimaryData(migrada));
          if(validatePrimaryData(recuperada)) {
            appData = recuperada;
            await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
          }
        }
      } else {
        await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
      }
      idbReady = true;
    } catch(_e) {
      registerPersistenceError('idb-hydrate', _e);
      idbReady = false;
    }

    normalizarEstadoCargado();
  }

  function persistPrimaryDataWithFallback() {
    let serializada = JSON.stringify(appData);
    if(idbReady) {
      idbSetRaw(STORAGE_KEY, serializada).catch((err) => {
        registerPersistenceError('persist-primary-idb', err);
        localStorage.setItem(STORAGE_KEY, serializada);
      });
    }
    try {
      localStorage.setItem(STORAGE_KEY, serializada);
    } catch(err) {
      registerPersistenceError('persist-primary-localstorage', err);
    }
  }

  async function persistAuxDataWithFallback(marcaGuardadoISO) {
    let payload = buildBackupPayload();
    payload.checksum = await generatePayloadChecksum(payload.data);
    let backup = JSON.stringify(payload);
    try {
      localStorage.setItem(STORAGE_BACKUP_KEY, backup);
      localStorage.setItem(STORAGE_LAST_SAVE_KEY, marcaGuardadoISO);
    } catch(err) {
      registerPersistenceError('persist-aux-localstorage', err);
    }

    if(idbReady) {
      idbSetRaw(STORAGE_BACKUP_KEY, backup).catch((err) => registerPersistenceError('persist-backup-idb', err));
      idbSetRaw(STORAGE_LAST_SAVE_KEY, marcaGuardadoISO).catch((err) => registerPersistenceError('persist-lastsave-idb', err));
    }
  }

  function validateBackupPayload(payload) {
    if(!payload || typeof payload !== 'object') return false;
    return validatePrimaryData(payload);
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
    registerPersistenceError,
    clearPersistenceErrors,
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
