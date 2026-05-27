// Data and persistence module extracted from app.js for maintainability.

(function initFinancialDataModule(globalScope) {
  function validateCoreDataShape(payload) {
    if(!payload || typeof payload !== 'object') return false;
    if(!Array.isArray(payload.ingresosList)) return false;
    if(!Array.isArray(payload.compromisos)) return false;
    if(!Array.isArray(payload.lineaTiempoGuardada)) return false;
    return true;
  }

  function validatePrimaryData(payload) {
    return validateCoreDataShape(payload);
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
          await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
        }
      } else {
        await idbSetRaw(STORAGE_KEY, JSON.stringify(appData));
      }
      idbReady = true;
    } catch(_e) {
      idbReady = false;
    }

    normalizarEstadoCargado();
  }

  function persistPrimaryDataWithFallback() {
    let serializada = JSON.stringify(appData);
    if(idbReady) {
      idbSetRaw(STORAGE_KEY, serializada).catch(() => {
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
      idbSetRaw(STORAGE_BACKUP_KEY, backup).catch(() => {});
      idbSetRaw(STORAGE_LAST_SAVE_KEY, marcaGuardadoISO).catch(() => {});
    }
  }

  function validateBackupPayload(payload) {
    return validateCoreDataShape(payload);
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
