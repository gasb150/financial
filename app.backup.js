// Backup import/export and restore flow extracted from app.js.

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

function resolverPayloadImportadoRespaldo(raw) {
  if(typeof window !== 'undefined' && window.FinancialData && typeof window.FinancialData.resolveImportedBackupPayload === 'function') {
    return window.FinancialData.resolveImportedBackupPayload(raw);
  }
  if(raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'data')) {
    return raw.data;
  }
  return raw;
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

      let candidato = resolverPayloadImportadoRespaldo(raw);
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
      marcarCorreccionMesBaseComoAplicada(appData);
      asegurarMesesAnioActualEnLineaTiempo();
      mesActivoGlobal = mesesLineaTiempo.includes(mesActivoGlobal) ? mesActivoGlobal : (mesesLineaTiempo[0] || mesActivoGlobal);
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

    let candidato = resolverPayloadImportadoRespaldo(payload);
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
    marcarCorreccionMesBaseComoAplicada(appData);
    asegurarMesesAnioActualEnLineaTiempo();
    mesActivoGlobal = mesesLineaTiempo.includes(mesActivoGlobal) ? mesActivoGlobal : (mesesLineaTiempo[0] || mesActivoGlobal);
    initApp();
    alert('Se restauró el último auto-respaldo local.');
  } catch(_e) {
    alert('No se pudo restaurar el auto-respaldo local.');
  }
}
