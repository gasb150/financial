let mesesLineaTiempo = [
  "Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"
];

let mesActivoGlobal = "Mayo 2026";
let filtroDeudaActivo = "todas";
let semanaSeleccionadaIndex = 0;
let diaSeleccionadoActivo = null; // Guarda el día activo elegido para la vista diaria
let filtroDiaDesde = null;
let filtroDiaHasta = null;
let modoAltaDeuda = 'rapido';
let deferredInstallPrompt = null;
let iaPanelState = {
  deudas: { loading: false, error: '', result: '' },
  gastosMes: { loading: false, error: '', result: '' },
  gastosQuincena: { loading: false, error: '', result: '' },
  gastosSemana: { loading: false, error: '', result: '' },
  recortesItemsMes: { loading: false, error: '', result: '', items: [] },
  rebalanceQuincena: { loading: false, error: '', result: '', actions: [] },
  rebalanceSemana: { loading: false, error: '', result: '', actions: [] }
};

const datosDefault = {
  ingresosList: [
    { id: 1, nombre: "Salario Demo (Q1)", valor: 3200000, periodo: "q1" },
    { id: 2, nombre: "Salario Demo (Q2)", valor: 3200000, periodo: "q2" },
    { id: 3, nombre: "Renta Demo", valor: 400000, periodo: "q2" }
  ],
  primasList: [],
  compromisos: [
    { id: 1, nombre: "Internet Hogar", valor: 360000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 2, nombre: "Plan Datos", valor: 55000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 3, nombre: "Gas (servicios)", valor: 190000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 4, nombre: "Servicio Energia", valor: 110000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 5, nombre: "Comida", valor: 1200000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 6, nombre: "Alquiler", valor: 1800000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 7, nombre: "Casa", valor: 1250000, dia: 14, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 12, nombre: "Gas Propiedad", valor: 720000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 13, nombre: "Administracion Propiedad", valor: 374000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 14, nombre: "Prestamo Familiar", valor: 1300000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 15, nombre: "Internet M", valor: 106000, dia: 12, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 16, nombre: "Colegio Demo", valor: 339000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 17, nombre: "Gasolina", valor: 600000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 21, nombre: "Acueducto", valor: 700000, dia: 15, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 101, nombre: "Colegio Hija", valor: 678000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 102, nombre: "Extra Colegio", valor: 678000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 103, nombre: "Gastos Varios A", valor: 300000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 104, nombre: "Regalo Evento", valor: 200000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 105, nombre: "Aporte Familiar", valor: 200000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 106, nombre: "Deuda Particular A", valor: 250000, dia: 16, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 107, nombre: "Deuda Particular B", valor: 500000, dia: 16, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 108, nombre: "Cumpleano 1", valor: 150000, dia: 10, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 109, nombre: "Cumpleano 2", valor: 150000, dia: 13, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 110, nombre: "Cumpleano 3", valor: 150000, dia: 20, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 111, nombre: "Ropa Escolar", valor: 150000, dia: 15, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 112, nombre: "Gasto Hija", valor: 74000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 113, nombre: "Gasto Hogar", valor: 500000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 8, nombre: "Tarjeta Credito Banco", valor: 620000, dia: 1, pagado: false, tipo: "credito", faltantes: 12, totales: 24, mesKey: "Mayo 2026" },
    { id: 9, nombre: "Credito Banco 1", valor: 600000, dia: 1, pagado: false, tipo: "credito", faltantes: 6, totales: 12, mesKey: "Mayo 2026" },
    { id: 10, nombre: "Credito Banco 2", valor: 980000, dia: 1, pagado: false, tipo: "credito", faltantes: 24, totales: 48, mesKey: "Mayo 2026" },
    { id: 11, nombre: "Tienda Hogar", valor: 676688, dia: 1, pagado: false, tipo: "credito", faltantes: 4, totales: 6, mesKey: "Mayo 2026" },
    { id: 18, nombre: "Tienda Retail", valor: 220000, dia: 15, pagado: false, tipo: "credito", faltantes: 3, totales: 12, mesKey: "Mayo 2026" },
    { id: 19, nombre: "Credito Vehiculo", valor: 1450000, dia: 5, pagado: false, tipo: "credito", faltantes: 36, totales: 60, mesKey: "Mayo 2026" },
    { id: 20, nombre: "Credito Banco 3", valor: 250000, dia: 5, pagado: false, tipo: "credito", faltantes: 8, totales: 24, mesKey: "Mayo 2026" }
  ],
  lineaTiempoGuardada: ["Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"],
  iaConfig: {
    mode: 'off',
    providerLocalEndpoint: 'http://localhost:11434/api/generate',
    providerLocalModel: 'llama3.1:8b',
    timeoutMs: 45000,
    retries: 1,
    updatedAt: null
  }
};

const STORAGE_KEY = 'finanzas_linea_tiempo_v7';
const STORAGE_BACKUP_KEY = 'finanzas_linea_tiempo_v7_backup';
const STORAGE_LAST_SAVE_KEY = 'finanzas_linea_tiempo_v7_last_save';
const IDB_NAME = 'financial_app_db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv';
const APP_SCHEMA_VERSION = 2;
const IA_MODES = ['off', 'local', 'api'];
const IA_ACTION_SCHEMA_VERSION = 1;
const IA_ACTION_TYPES = ['reducir', 'posponer', 'mover_tramo'];

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
  let timeoutNum = parseInt(appData.iaConfig.timeoutMs, 10);
  let timeoutNormalizado = isNaN(timeoutNum) ? 45000 : Math.min(Math.max(timeoutNum, 10000), 180000);
  // Migra configuraciones legacy de 12s, insuficientes para primer arranque de modelos locales.
  if(timeoutNormalizado === 12000) timeoutNormalizado = 45000;
  appData.iaConfig.timeoutMs = timeoutNormalizado;
  let retriesNum = parseInt(appData.iaConfig.retries, 10);
  appData.iaConfig.retries = isNaN(retriesNum) ? 1 : Math.min(Math.max(retriesNum, 0), 4);
  if(!appData.iaConfig.updatedAt) appData.iaConfig.updatedAt = null;
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
        alert('El archivo no tiene un formato de respaldo válido.');
        return;
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
      alert('El auto-respaldo local está incompleto.');
      return;
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
  if(!mesKey || typeof mesKey !== 'string') return false;
  let [mes, anioStr] = mesKey.split(' ');
  return ORDEN_MESES.includes(mes) && !isNaN(parseInt(anioStr, 10));
}

function obtenerMesInicioIngreso(ing) {
  return esMesKeyValido(ing.mesInicio) ? ing.mesInicio : (mesesLineaTiempo[0] || mesActivoGlobal);
}

function obtenerMesFinIngreso(ing) {
  if(ing.mesFinIndefinido) return null;
  return esMesKeyValido(ing.mesFin) ? ing.mesFin : null;
}

function ingresoActivoEnMes(ing, mesKey) {
  let idxMes = mesKeyToIndex(mesKey);
  let idxInicio = mesKeyToIndex(obtenerMesInicioIngreso(ing));
  if(idxMes < idxInicio) return false;
  let mesFin = obtenerMesFinIngreso(ing);
  if(!mesFin) return true;
  return idxMes <= mesKeyToIndex(mesFin);
}

function parseMesKey(mesKey) {
  let [mes, anioStr] = mesKey.split(' ');
  return { mes, anio: parseInt(anioStr, 10) };
}

function mesKeyToIndex(mesKey) {
  let { mes, anio } = parseMesKey(mesKey);
  return (anio * 12) + ORDEN_MESES.indexOf(mes);
}

function indexToMesKey(indexMes) {
  let anio = Math.floor(indexMes / 12);
  let mesIdx = ((indexMes % 12) + 12) % 12;
  return `${ORDEN_MESES[mesIdx]} ${anio}`;
}

function sumarMesesMesKey(mesKey, cantidad) {
  return indexToMesKey(mesKeyToIndex(mesKey) + cantidad);
}

function asegurarLineaTiempoHastaMes(mesKeyObjetivo) {
  if(!mesesLineaTiempo.length) return;
  let idxObjetivo = mesKeyToIndex(mesKeyObjetivo);
  let idxUltimo = mesKeyToIndex(mesesLineaTiempo[mesesLineaTiempo.length - 1]);

  while(idxUltimo < idxObjetivo) {
    idxUltimo += 1;
    mesesLineaTiempo.push(indexToMesKey(idxUltimo));
  }
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
  let { mes, anio } = parseMesKey(mesKey);
  let idx = ORDEN_MESES.indexOf(mes);
  if(idx <= 0) return `${ORDEN_MESES[11]} ${anio - 1}`;
  return `${ORDEN_MESES[idx - 1]} ${anio}`;
}

function ultimoDiaHabilMes(anio, mesIdx) {
  let d = new Date(anio, mesIdx + 1, 0);
  let dow = d.getDay();
  if(dow === 6) d.setDate(d.getDate() - 1);
  if(dow === 0) d.setDate(d.getDate() - 2);
  return d.getDate();
}

function siguienteViernes(fecha) {
  let d = new Date(fecha);
  let dow = d.getDay();
  let diff = (5 - dow + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function normalizarDiaPagoDeMes(diaBase, anio, mesIdx, diasMes) {
  let dia = Math.min(Math.max(diaBase, 1), diasMes);
  if(dia >= 28) return ultimoDiaHabilMes(anio, mesIdx);
  return dia;
}

function obtenerDiasPagoIngresoEnMes(ing, mesKey) {
  let { mes, anio } = parseMesKey(mesKey);
  let mesIdx = ORDEN_MESES.indexOf(mes);
  let diasMes = new Date(anio, mesIdx + 1, 0).getDate();

  if(ing.periodo !== 'biweekly') {
    let dia = normalizarDiaPagoDeMes(getDiaIngreso(ing), anio, mesIdx, diasMes);
    return [dia];
  }

  if(!ing.anchorDate) {
    return [Math.min(getDiaIngreso(ing), diasMes)];
  }

  let anchor = new Date(`${ing.anchorDate}T00:00:00`);
  anchor = siguienteViernes(anchor);
  let inicioMes = new Date(anio, mesIdx, 1);
  let finMes = new Date(anio, mesIdx, diasMes);
  let dias = [];

  let cursor = new Date(anchor);
  while(cursor < inicioMes) {
    cursor.setDate(cursor.getDate() + 14);
  }
  while(cursor <= finMes) {
    if(cursor >= inicioMes) dias.push(cursor.getDate());
    cursor.setDate(cursor.getDate() + 14);
  }

  return dias;
}

function obtenerDetalleDiasPagoMes(mesKey) {
  let { mes, anio } = parseMesKey(mesKey);
  let mesIdx = ORDEN_MESES.indexOf(mes);
  let diasMes = new Date(anio, mesIdx + 1, 0).getDate();
  let out = {};

  function asegurarDia(dia) {
    if(!out[dia]) out[dia] = { real: false, arrastre: false };
  }

  appData.ingresosList.forEach(i => {
    if(!ingresoActivoEnMes(i, mesKey)) return;
    obtenerDiasPagoIngresoEnMes(i, mesKey).forEach(d => {
      asegurarDia(d);
      out[d].real = true;
    });
  });

  appData.primasList
    .filter(p => p.mesKey === mesKey)
    .forEach(p => {
      let dia = normalizarDiaPagoDeMes(parseInt(p.diaPago, 10) || 1, anio, mesIdx, diasMes);
      asegurarDia(dia);
      out[dia].real = true;
    });

  let mesPrevio = mesKeyAnterior(mesKey);
  let prevData = parseMesKey(mesPrevio);
  let prevMesIdx = ORDEN_MESES.indexOf(prevData.mes);
  let prevDiasMes = new Date(prevData.anio, prevMesIdx + 1, 0).getDate();

  appData.ingresosList.forEach(i => {
    if(!ingresoActivoEnMes(i, mesPrevio)) return;
    let diasPrevios = obtenerDiasPagoIngresoEnMes(i, mesPrevio);
    diasPrevios.forEach(d => {
      if(d >= 29) {
        asegurarDia(1);
        out[1].arrastre = true;
      }
    });
  });

  appData.primasList
    .filter(p => p.mesKey === mesPrevio)
    .forEach(p => {
      let d = normalizarDiaPagoDeMes(parseInt(p.diaPago, 10) || 1, prevData.anio, prevMesIdx, prevDiasMes);
      if(d >= 29) {
        asegurarDia(1);
        out[1].arrastre = true;
      }
    });

  return out;
}

function obtenerEventosIngresoDelMes(mesKey) {
  let eventos = [];
  appData.ingresosList.forEach(i => {
    if(!ingresoActivoEnMes(i, mesKey)) return;
    let dias = obtenerDiasPagoIngresoEnMes(i, mesKey);
    dias.forEach((dia, idx) => {
      if(dia <= 28) {
        eventos.push({
          id: `${i.id}-${mesKey}-${idx}`,
          nombre: i.nombre,
          valor: i.valor,
          dia: dia,
          origen: 'normal',
          fuenteTipo: 'ingreso',
          fuenteId: i.id
        });
      }
    });
  });

  let mesPrevio = mesKeyAnterior(mesKey);
  appData.ingresosList.forEach(i => {
    if(!ingresoActivoEnMes(i, mesPrevio)) return;
    let diasPrevios = obtenerDiasPagoIngresoEnMes(i, mesPrevio);
    diasPrevios.forEach((dia, idx) => {
      if(dia >= 29) {
        eventos.push({
          id: `arrastre-${i.id}-${mesPrevio}-${idx}`,
          nombre: `${i.nombre} (arrastre mes anterior)`,
          valor: i.valor,
          dia: 1,
          origen: 'arrastre',
          fuenteTipo: 'ingreso',
          fuenteId: i.id
        });
      }
    });
  });

  // Primas: ingreso no recurrente con mes/día explícitos.
  appData.primasList.forEach(p => {
    let { mes, anio } = parseMesKey(mesKey);
    let mesIdx = ORDEN_MESES.indexOf(mes);
    let diasMes = new Date(anio, mesIdx + 1, 0).getDate();
    let dia = normalizarDiaPagoDeMes(parseInt(p.diaPago, 10) || 1, anio, mesIdx, diasMes);
    if(p.mesKey === mesKey && dia >= 1 && dia <= 28) {
      eventos.push({
        id: `prima-${p.id}`,
        nombre: p.nombre,
        valor: p.valor,
        dia: dia,
        origen: 'prima',
        fuenteTipo: 'prima',
        fuenteId: p.id
      });
    }
  });

  // Si la prima cae 29-31, se arrastra al día 1 del siguiente mes.
  appData.primasList.forEach(p => {
    let { mes, anio } = parseMesKey(mesPrevio);
    let mesIdx = ORDEN_MESES.indexOf(mes);
    let diasMes = new Date(anio, mesIdx + 1, 0).getDate();
    let dia = normalizarDiaPagoDeMes(parseInt(p.diaPago, 10) || 1, anio, mesIdx, diasMes);
    if(p.mesKey === mesPrevio && dia >= 29 && dia <= 31) {
      eventos.push({
        id: `arrastre-prima-${p.id}`,
        nombre: `${p.nombre} (arrastre mes anterior)`,
        valor: p.valor,
        dia: 1,
        origen: 'prima-arrastre',
        fuenteTipo: 'prima',
        fuenteId: p.id
      });
    }
  });

  return eventos;
}

function calcularBalanceSemanal(compromisosMes, semana) {
  let ingresosEventos = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let ingresosSemana = ingresosEventos
    .filter(e => semana.dias.includes(e.dia))
    .reduce((acc, e) => acc + e.valor, 0);

  let gastosSemana = compromisosMes
    .filter(c => {
      let dVal = parseInt(c.dia, 10);
      if (dVal === -1 && semana.id === 'sem-1') return true;
      return semana.dias.includes(dVal);
    })
    .reduce((acc, c) => acc + c.valor, 0);

  return {
    ingresosSemana,
    gastosSemana,
    balanceSemana: ingresosSemana - gastosSemana,
    ingresosEventos
  };
}

function obtenerSemanasDelMesActivo() {
  let partes = mesActivoGlobal.split(" ");
  let nombreMes = partes[0];
  let anio = parseInt(partes[1]);
  const mesesIndices = {"Enero":0,"Febrero":1,"Marzo":2,"Abril":3,"Mayo":4,"Junio":5,"Julio":6,"Agosto":7,"Septiembre":8,"Octubre":9,"Noviembre":10,"Diciembre":11};
  let mesIdx = mesesIndices[nombreMes];
  let totalDias = new Date(anio, mesIdx + 1, 0).getDate();
  let semanas = [];
  let diasAcumulados = [];
  let numSemanaFicticia = 1;
  
  for(let d=1; d<=totalDias; d++) {
    diasAcumulados.push(d);
    let diaSemanaSistemas = new Date(anio, mesIdx, d).getDay();
    if(diaSemanaSistemas === 0 || d === totalDias) {
      semanas.push({
        id: `sem-${numSemanaFicticia}`,
        nombre: `Tramo Semanal ${numSemanaFicticia}`,
        rango: `${nombreMes.substring(0,3)} ${diasAcumulados[0]} - ${nombreMes.substring(0,3)} ${diasAcumulados[diasAcumulados.length - 1]}`,
        dias: [...diasAcumulados]
      });
      diasAcumulados = [];
      numSemanaFicticia++;
    }
  }
  return semanas;
}

function cambiarMesDeVisualizacion(nuevoMes) {
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

function renderConfigIA() {
  let sel = document.getElementById('ia-mode-selector');
  let help = document.getElementById('ia-mode-help');
  let endpoint = document.getElementById('ia-local-endpoint');
  let model = document.getElementById('ia-local-model');
  let timeout = document.getElementById('ia-local-timeout');
  let retries = document.getElementById('ia-local-retries');
  if(!sel || !help) return;
  let modo = getModoIA();
  let cfg = getConfigIALocal();
  sel.value = modo;
  help.innerText = textoModoIA(modo);
  if(endpoint) endpoint.value = cfg.endpoint;
  if(model) model.value = cfg.model;
  if(timeout) timeout.value = String(cfg.timeoutMs);
  if(retries) retries.value = String(cfg.retries);
}

function setModoIA(modoNuevo) {
  let modo = IA_MODES.includes(modoNuevo) ? modoNuevo : 'off';
  if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};
  appData.iaConfig.mode = modo;
  appData.iaConfig.updatedAt = new Date().toISOString();
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  renderConfigIA();

  let salida = document.getElementById('ia-test-result');
  if(salida) salida.innerText = `Modo IA guardado: ${modo.toUpperCase()}.`;
}

function guardarConfigIALocal() {
  if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};

  let endpointInput = document.getElementById('ia-local-endpoint');
  let modelInput = document.getElementById('ia-local-model');
  let timeoutInput = document.getElementById('ia-local-timeout');
  let retriesInput = document.getElementById('ia-local-retries');

  appData.iaConfig.providerLocalEndpoint = normalizarEndpointOllama(endpointInput ? endpointInput.value : '');
  appData.iaConfig.providerLocalModel = String(modelInput && modelInput.value ? modelInput.value : 'llama3.1:8b').trim() || 'llama3.1:8b';
  appData.iaConfig.timeoutMs = Math.min(Math.max(parseInt(timeoutInput && timeoutInput.value, 10) || 45000, 10000), 180000);
  appData.iaConfig.retries = Math.min(Math.max(parseInt(retriesInput && retriesInput.value, 10) || 1, 0), 4);
  appData.iaConfig.updatedAt = new Date().toISOString();

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());
  renderConfigIA();

  let salida = document.getElementById('ia-test-result');
  if(salida) salida.innerText = 'Configuracion LOCAL guardada.';
}

async function consultarIALocal(prompt) {
  let cfg = getConfigIALocal();
  let intentosTotales = cfg.retries + 1;
  let ultimoError = null;

  for(let intento = 1; intento <= intentosTotales; intento++) {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      let resp = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          stream: false,
          options: { temperature: 0.2 }
        })
      });

      if(!resp.ok) {
        let detalleHttp = '';
        try {
          let body = await resp.json();
          if(body && body.error) detalleHttp = String(body.error);
        } catch(_e) {
          // Si no hay JSON valido, intentamos leer texto plano para diagnostico.
          try {
            detalleHttp = (await resp.text() || '').trim();
          } catch(_e2) {}
        }

        if(resp.status === 404 && /model .* not found/i.test(detalleHttp)) {
          throw new Error(`${detalleHttp}. Ejecuta: ollama pull ${cfg.model}`);
        }

        throw new Error(detalleHttp ? `HTTP ${resp.status} en IA Local: ${detalleHttp}` : `HTTP ${resp.status} en IA Local`);
      }
      let data = await resp.json();
      let txt = String(data && data.response ? data.response : '').trim();
      if(!txt) throw new Error('IA Local no devolvio texto util.');

      clearTimeout(timeoutId);
      return { ok: true, mode: 'local', message: txt };
    } catch(err) {
      clearTimeout(timeoutId);
      ultimoError = err;
      if(intento < intentosTotales) continue;
    }
  }

  let detalle = '';
  if(ultimoError && ultimoError.name === 'AbortError') {
    detalle = `Tiempo de espera agotado en proveedor local (${cfg.timeoutMs} ms).`;
  } else if(ultimoError && ultimoError.name === 'TypeError') {
    detalle = `No se pudo conectar con IA LOCAL en ${cfg.endpoint}. Verifica que el servidor este arriba y accesible.\nSugerencia: si usas IA Local, inicia el servicio y prueba de nuevo.`;
  } else {
    detalle = ultimoError && ultimoError.message
      ? ultimoError.message
      : 'Error desconocido al consultar IA local.';
  }
  throw new Error(detalle);
}

async function ejecutarConsultaIA(prompt) {
  let modo = getModoIA();
  if(modo === 'off') {
    throw new Error('Modo IA en OFF. Activa LOCAL o API para usar funciones IA.');
  }
  if(modo === 'local') {
    return consultarIALocal(prompt);
  }
  return {
    ok: false,
    mode: modo,
    message: 'Gateway/API externa aun no integrada. Se habilitara en TKT-012.',
    prompt
  };
}

async function probarIAConfigurada() {
  let out = document.getElementById('ia-test-result');
  if(!out) return;

  try {
    let res = await ejecutarConsultaIA('Prueba rapida de disponibilidad IA');
    out.innerText = `Resultado (${String(res.mode || '').toUpperCase()}): ${res.message}`;
  } catch(err) {
    out.innerText = `Bloqueado: ${err && err.message ? err.message : 'No disponible'}`;
  }
}

function instalarAppPWA() {
  if(!deferredInstallPrompt) {
    alert('La instalacion directa no esta disponible en este navegador. Usa "Agregar a pantalla de inicio".');
    return;
  }

  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
    let btn = document.getElementById('btn-install-app');
    if(btn) btn.style.display = 'none';
  });
}

function showQ(q) {
  window.FinancialRender.showQuincenaTab(q);
  renderIAPanelQuincena();
}

function toggleCuotasInput(val) {
  let wrap = document.getElementById('wrap-cuotas-add');
  if(wrap) wrap.style.display = val === 'credito' ? 'block' : 'none';
}

function setModoAltaDeuda(modo) {
  modoAltaDeuda = modo;
  let bRapido = document.getElementById('modo-rapido');
  let bAvanzado = document.getElementById('modo-avanzado');
  let bloque = document.getElementById('bloque-avanzado-deuda');

  if(bRapido) bRapido.classList.toggle('on', modo === 'rapido');
  if(bAvanzado) bAvanzado.classList.toggle('on', modo === 'avanzado');
  if(bloque) bloque.style.display = modo === 'avanzado' ? 'block' : 'none';

  if(modo === 'rapido') {
    let mesDestino = document.getElementById('add-mes-destino');
    if(mesDestino) mesDestino.value = mesActivoGlobal;
  }

  actualizarPreviewNuevaDeuda();
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
  let resumen = document.getElementById('pv-resumen');
  let semanaTxt = document.getElementById('pv-semana');
  let quincenaTxt = document.getElementById('pv-quincena');
  let alerta = document.getElementById('add-warn-deuda');
  if(!resumen || !semanaTxt || !quincenaTxt || !alerta) return;

  let nombre = document.getElementById('add-nombre').value.trim();
  let valor = parseMontoInput(document.getElementById('add-valor').value);
  let dia = parseInt(document.getElementById('add-dia').value, 10);

  if(!nombre || isNaN(valor) || valor <= 0 || (dia !== -1 && (isNaN(dia) || dia < 1 || dia > 31))) {
    resumen.innerText = 'Completa nombre, valor y día para simular impacto.';
    semanaTxt.innerText = '';
    quincenaTxt.innerText = '';
    alerta.style.display = 'none';
    alerta.innerText = '';
    return;
  }

  let compromisosMes = getCompromisosMesActual();
  let semana = obtenerSemanaParaDia(dia);
  let quincena = dia === -1 ? 'Pre-Mes' : (dia <= 14 ? 'Quincena 1' : 'Quincena 2');
  let semanaNombre = semana ? `${semana.nombre} (${semana.rango})` : 'Fuera de semana calculada';

  let balanceAntes = 0;
  if(semana) {
    let semStats = calcularBalanceSemanal(compromisosMes, semana);
    balanceAntes = semStats.balanceSemana;
  }
  let balanceDespues = balanceAntes - valor;

  resumen.innerText = `${nombre} por ${formatCOP(valor)} en día ${dia === -1 ? 'pre-mes' : dia}.`;
  semanaTxt.innerText = `Impacta: ${semanaNombre}. Balance semanal estimado: ${formatCOP(balanceAntes)} -> ${formatCOP(balanceDespues)}.`;
  quincenaTxt.innerText = `Impacta tramo: ${quincena}.`;

  let ingresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal).reduce((acc, e) => acc + e.valor, 0);
  let ratio = ingresosMes > 0 ? valor / ingresosMes : 1;

  if(balanceDespues < 0) {
    alerta.style.display = 'block';
    alerta.innerText = 'Alerta: este registro deja la semana en negativo. Considera mover la fecha tentativa o ajustar monto.';
  } else if(ratio >= 0.2) {
    alerta.style.display = 'block';
    alerta.innerText = 'Aviso: este gasto supera 20% del ingreso del mes; revisa su fecha para mejorar flujo.';
  } else {
    alerta.style.display = 'none';
    alerta.innerText = '';
  }
}

function toggleCheckPago(id) {
  let comp = appData.compromisos.find(c => c.id === id);
  if(comp) { 
    comp.pagado = !comp.pagado; 
    initApp(); 
    if(diaSeleccionadoActivo !== null) {
      renderVistaDiaria(compromisosMesGlobalCache); // Refresca la vista diaria si está abierta
    }
  }
}

function cambiarFiltroDeuda(tipo) {
  filtroDeudaActivo = tipo;
  ['todas','fijas','variables','creditos','pendientes'].forEach(f => {
    document.getElementById('f-' + f).classList.toggle('on', f === tipo);
  });
  renderDeudasModulo(getCompromisosMesActual());
}

function aplicarFiltroFechaDeudas() {
  let desde = parseInt(document.getElementById('f-dia-desde').value, 10);
  let hasta = parseInt(document.getElementById('f-dia-hasta').value, 10);
  filtroDiaDesde = isNaN(desde) ? null : Math.min(Math.max(desde, 1), 31);
  filtroDiaHasta = isNaN(hasta) ? null : Math.min(Math.max(hasta, 1), 31);
  renderDeudasModulo(getCompromisosMesActual());
}

function limpiarFiltroFechaDeudas(soloEstado = false) {
  filtroDiaDesde = null;
  filtroDiaHasta = null;
  let iDesde = document.getElementById('f-dia-desde');
  let iHasta = document.getElementById('f-dia-hasta');
  if(iDesde) iDesde.value = '';
  if(iHasta) iHasta.value = '';
  if(!soloEstado) renderDeudasModulo(getCompromisosMesActual());
}

let compromisosMesGlobalCache = []; // Cache para simplificar refrescos de UI

function initApp() {
  if(window.FinancialI18n && typeof window.FinancialI18n.initializeLocale === 'function') {
    window.FinancialI18n.initializeLocale();
  }

  aplicarCorreccionMesBaseSiAplica();
  normalizarRecurrenciasCompromisos();
  normalizarIngresosConDia();
  appData.schemaVersion = APP_SCHEMA_VERSION;
  let marcaGuardado = new Date().toISOString();
  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(marcaGuardado);
  actualizarSelectoresDeMes();
  
  document.getElementById('tit-cal-dinamico').innerText = `Calendario de Flujo - ${mesActivoGlobal}`;
  document.getElementById('tit-semanas-dinamico').innerText = `Línea de Semanas - ${mesActivoGlobal}`;

  let compromisosMesActual = getCompromisosMesActual();
  compromisosMesGlobalCache = compromisosMesActual;

  let eventosIngresoMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let totalIngresos = eventosIngresoMes.reduce((acc, e) => acc + e.valor, 0);
  let totalArrastreIngresos = eventosIngresoMes
    .filter(e => e.origen === 'arrastre' || e.origen === 'prima-arrastre')
    .reduce((acc, e) => acc + e.valor, 0);
  let totalNormalIngresos = totalIngresos - totalArrastreIngresos;
  let totalGastos = compromisosMesActual.reduce((acc, c) => acc + c.valor, 0);
  let totalPendiente = compromisosMesActual.reduce((acc, c) => acc + (c.pagado ? 0 : c.valor), 0);
  let balance = totalIngresos - totalGastos;

  document.getElementById('res-ingresos').innerText = formatCOP(totalIngresos);
  document.getElementById('res-ingresos-detalle').innerText = `Normal: ${formatCOP(totalNormalIngresos)} · Arrastre: ${formatCOP(totalArrastreIngresos)}`;
  document.getElementById('res-gastos').innerText = formatCOP(totalGastos);
  document.getElementById('res-gastos-porc').innerText = `${totalIngresos > 0 ? ((totalGastos / totalIngresos) * 100).toFixed(0) : 100}% del ingreso`;
  
  let balCard = document.getElementById('res-balance');
  balCard.innerText = formatCOP(balance);
  if(balance < 0) {
    balCard.style.color = '#E24B4A';
    document.getElementById('res-balance-text').innerText = "Déficit en este periodo";
    document.getElementById('alerta-deficit').style.display = 'flex';
    document.getElementById('alerta-b-text').innerText = `Gastos: ${formatCOP(totalGastos)} vs Ingresos: ${formatCOP(totalIngresos)}.`;
  } else {
    balCard.style.color = '#1D9E75';
    document.getElementById('res-balance-text').innerText = "Superávit en este periodo";
    document.getElementById('alerta-deficit').style.display = 'none';
  }
  document.getElementById('res-pendiente').innerText = formatCOP(totalPendiente);
  renderSobrante(balance);
  renderIAPanelResumen();

  renderIngresosResumen();
  renderCalendario(compromisosMesActual);
  renderQuincenas(compromisosMesActual);
  renderDeudasModulo(compromisosMesActual);
  renderMenuSemanas();
  renderSemanaActiva(compromisosMesActual);
  renderSelectoresVigenciaIngreso();
  renderConfigIngresos();
  renderConfigPrimas();
  renderConfigIA();
  renderIAPanelSemanal();
  renderIAPanelQuincena();
  renderIAPanelDeudas();
  renderUltimoGuardado();
  aplicarFormatoMonedaInputs();

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
  let nombre = document.getElementById('new-ing-nombre').value.trim();
  let valor = parseMontoInput(document.getElementById('new-ing-valor').value);
  let periodo = document.getElementById('new-ing-periodo').value;
  let diaPago = parseInt(document.getElementById('new-ing-dia').value, 10);
  let mesInicio = document.getElementById('new-ing-desde').value;
  let mesFinRaw = document.getElementById('new-ing-hasta').value;
  let mesFinIndefinido = mesFinRaw === '__indefinido__';
  let mesFin = mesFinIndefinido ? null : mesFinRaw;
  if(!nombre || isNaN(valor) || valor <= 0) { alert("Datos inválidos"); return; }
  if(isNaN(diaPago) || diaPago < 1 || diaPago > 31) { alert("El día de pago del ingreso debe estar entre 1 y 31."); return; }
  if(!esMesKeyValido(mesInicio)) { alert('Selecciona el mes inicial de vigencia.'); return; }
  if(!mesFinIndefinido && !esMesKeyValido(mesFin)) { alert('Selecciona un mes final válido o deja indefinido.'); return; }
  if(!mesFinIndefinido && mesKeyToIndex(mesFin) < mesKeyToIndex(mesInicio)) { alert('La vigencia final no puede ser anterior al inicio.'); return; }
  appData.ingresosList.push({
    id: Date.now(),
    nombre: nombre,
    valor: valor,
    periodo: periodo,
    diaPago: diaPago,
    mesInicio: mesInicio,
    mesFin: mesFin,
    mesFinIndefinido: mesFinIndefinido
  });
  document.getElementById('new-ing-nombre').value = '';
  document.getElementById('new-ing-valor').value = '';
  document.getElementById('new-ing-dia').value = '30';
  document.getElementById('new-ing-desde').value = mesActivoGlobal;
  document.getElementById('new-ing-hasta').value = '__indefinido__';
  initApp();
}

function eliminarIngreso(id) {
  if(confirm("¿Remover esta fuente?")) { appData.ingresosList = appData.ingresosList.filter(i => i.id !== id); initApp(); }
}

function renderConfigIngresos() {
  let container = document.getElementById('lista-config-ingresos');
  container.innerHTML = '';
  appData.ingresosList.forEach(i => {
    let nombreSeguro = escapeHTML(i.nombre);
    let desde = obtenerMesInicioIngreso(i);
    let hasta = obtenerMesFinIngreso(i);
    let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}" ${desde === m ? 'selected' : ''}>${m}</option>`).join('');
    let opcionesHasta = `<option value="__indefinido__" ${!hasta ? 'selected' : ''}>Indefinido</option>` + mesesLineaTiempo.map(m => `<option value="${m}" ${hasta === m ? 'selected' : ''}>${m}</option>`).join('');
    let card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '12px';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px">
        <button class="btn-del" onclick="eliminarIngreso(${i.id})"><i class="ti ti-trash"></i></button>
        <input type="text" value="${nombreSeguro}" class="input-inline" style="flex:1; font-weight:600;" onchange="modificarIngresoPropiedad(${i.id}, 'nombre', this.value)">
        <input type="text" inputmode="numeric" value="${formatCOP(i.valor)}" class="input-inline money-input" style="width:110px; text-align:right; color:#1D9E75; font-weight:600;" onchange="modificarIngresoPropiedad(${i.id}, 'valor', this.value)">
      </div>
      <div style="padding-left:24px; display:flex; gap:8px; align-items:end;">
        <div style="flex:1;">
        <label class="sl" style="display:block; margin-bottom:2px">Asignación de Tramo:</label>
        <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'periodo', this.value)">
          <option value="q1" ${i.periodo === 'q1' ? 'selected' : ''}>Cae en Quincena 1 (Días 1-14)</option>
          <option value="q2" ${i.periodo === 'q2' ? 'selected' : ''}>Cae en Quincena 2 (Días 15-31)</option>
          <option value="biweekly" ${i.periodo === 'biweekly' ? 'selected' : ''}>Quincenal real (cada 14 días)</option>
          <option value="todo" ${i.periodo === 'todo' ? 'selected' : ''}>Dividir en Ambas Quincenas (50/50)</option>
        </select>
        </div>
        <div style="width:92px;">
          <label class="sl" style="display:block; margin-bottom:2px">Día pago</label>
          <input type="number" min="1" max="31" class="input-app" style="margin:0; padding:4px; font-size:12px;" value="${getDiaIngreso(i)}" onchange="modificarIngresoPropiedad(${i.id}, 'diaPago', this.value)">
        </div>
      </div>
      <div style="padding-left:24px; display:flex; gap:8px; align-items:end; margin-top:8px;">
        <div style="flex:1;">
          <label class="sl" style="display:block; margin-bottom:2px">Vigente desde</label>
          <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesInicio', this.value)">${opcionesDesde}</select>
        </div>
        <div style="flex:1;">
          <label class="sl" style="display:block; margin-bottom:2px">Vigente hasta</label>
          <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesFin', this.value)">${opcionesHasta}</select>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSelectoresVigenciaIngreso() {
  let selDesde = document.getElementById('new-ing-desde');
  let selHasta = document.getElementById('new-ing-hasta');
  if(!selDesde || !selHasta) return;

  let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  let opcionesHasta = `<option value="__indefinido__">Indefinido</option>` + mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  selDesde.innerHTML = opcionesDesde;
  selHasta.innerHTML = opcionesHasta;

  if([...selDesde.options].some(o => o.value === mesActivoGlobal)) {
    selDesde.value = mesActivoGlobal;
  }
  selHasta.value = '__indefinido__';
}

function agregarPrimaNoRecurrente() {
  let nombre = document.getElementById('new-prima-nombre').value.trim();
  let valor = parseMontoInput(document.getElementById('new-prima-valor').value);
  let diaPago = parseInt(document.getElementById('new-prima-dia').value, 10);
  let mesKey = document.getElementById('new-prima-mes').value;

  if(!nombre || isNaN(valor) || valor <= 0) {
    alert('Datos inválidos para la prima.');
    return;
  }
  if(isNaN(diaPago) || diaPago < 1 || diaPago > 31) {
    alert('El día de pago de la prima debe estar entre 1 y 31.');
    return;
  }

  appData.primasList.push({
    id: Date.now(),
    nombre,
    valor,
    diaPago,
    mesKey
  });

  document.getElementById('new-prima-nombre').value = '';
  document.getElementById('new-prima-valor').value = '';
  document.getElementById('new-prima-dia').value = '15';
  initApp();
}

function eliminarPrima(id) {
  if(confirm('¿Eliminar esta prima?')) {
    appData.primasList = appData.primasList.filter(p => p.id !== id);
    initApp();
  }
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

  container.innerHTML = '';
  if(appData.primasList.length === 0) {
    container.innerHTML = `<div class="card" style="padding:12px;color:var(--color-text-tertiary);font-size:12px;">No hay primas registradas aún.</div>`;
    return;
  }

  appData.primasList
    .slice()
    .sort((a, b) => mesKeyToIndex(a.mesKey) - mesKeyToIndex(b.mesKey))
    .forEach(p => {
      let nombreSeguro = escapeHTML(p.nombre);
      let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${p.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
      let card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '12px';
      card.style.marginBottom = '8px';
      card.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
          <button class="btn-del" onclick="eliminarPrima(${p.id})"><i class="ti ti-trash"></i></button>
          <input type="text" value="${nombreSeguro}" class="input-inline" style="flex:1;font-weight:600;" onchange="modificarPrimaPropiedad(${p.id}, 'nombre', this.value)">
          <input type="text" inputmode="numeric" value="${formatCOP(p.valor)}" class="input-inline money-input" style="width:110px;text-align:right;color:#1D9E75;font-weight:600;" onchange="modificarPrimaPropiedad(${p.id}, 'valor', this.value)">
        </div>
        <div style="display:flex; gap:8px; align-items:end; padding-left:24px;">
          <div style="width:88px;">
            <label class="sl" style="display:block; margin-bottom:2px;">Día pago</label>
            <input type="number" min="1" max="31" class="input-app" style="margin:0;padding:4px;font-size:12px;" value="${p.diaPago}" onchange="modificarPrimaPropiedad(${p.id}, 'diaPago', this.value)">
          </div>
          <div style="flex:1;">
            <label class="sl" style="display:block; margin-bottom:2px;">Mes</label>
            <select class="input-app" style="margin:0;padding:4px;font-size:12px;" onchange="modificarPrimaPropiedad(${p.id}, 'mesKey', this.value)">${mesOptions}</select>
          </div>
        </div>
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
  if(confirm("¿Eliminar compromiso?")) { 
    appData.compromisos = appData.compromisos.filter(c => c.id !== id); 
    initApp(); 
  }
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

  deudasFiltradas.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    let tipoLabel = c.tipo === 'fijo' ? 'Fijo' : (c.tipo === 'credito' ? 'Crédito' : 'Variable');
    let tipoPillClass = c.tipo === 'fijo' ? 'pill-fijo' : (c.tipo === 'credito' ? 'pill-credito' : 'pill-variable');
    let diaNormalizado = parseInt(c.dia, 10) === -1 ? 1 : parseInt(c.dia, 10);
    let sem = obtenerSemanaParaDia(parseInt(c.dia, 10));
    let semTxt = sem ? sem.nombre.replace('Tramo Semanal ', 'S') : 'S/N';
    let card = document.createElement('div');
    card.className = `card deuda-card tipo-${c.tipo}`;
    if(c.pagado) card.style.opacity = '0.65';
    let pctBarra = c.tipo === 'credito' ? (((c.totales||12)-(c.faltantes||6))/(c.totales||12))*100 : 100;
    let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${c.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
    let colorBarra = c.pagado ? '#1D9E75' : '#E24B4A';
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
      <div class="deuda-head">
        <div style="display:flex; align-items:center; gap:4px;">
          <button class="btn-del" onclick="eliminarCompromiso(${c.id})"><i class="ti ti-trash"></i></button>
        </div>
        <input type="text" value="${nombreSeguro}" class="input-inline deuda-name" onchange="modificarCompromisoPropiedad(${c.id}, 'nombre', this.value)">
        <input type="text" inputmode="numeric" value="${formatCOP(c.valor)}" class="input-inline deuda-valor money-input" onchange="modificarCompromisoPropiedad(${c.id}, 'valor', this.value)">
      </div>

      <div class="deuda-meta">
        <div>
          <div class="deuda-mini"><span class="deuda-tipo-pill ${tipoPillClass}">${tipoLabel}</span><span>${semTxt}</span></div>
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
          <label class="sl">Estado</label>
          <div class="deuda-mini" style="height:31px;border:1px solid var(--color-border-secondary);border-radius:6px;padding:0 8px;">
            <input type="checkbox" ${c.pagado ? 'checked':''} onclick="toggleCheckPago(${c.id})"> ¿Pagado?
          </div>
        </div>
      </div>

      ${extraCredito}
      <div class="rm" style="margin-top:6px;">Fecha tentativa: día ${diaNormalizado} · ${semTxt}</div>
      <div class="deuda-bar" style="margin-top:6px;"><div class="deuda-fill" style="width:${pctBarra}%;background:${colorBarra}"></div></div>
    `;
    container.appendChild(card);
  });
}

function renderQuincenas(compromisosMes) {
  let preCont = document.getElementById('lista-pre-quincena');
  let q1Cont = document.getElementById('lista-q1-quincena');
  let q2Cont = document.getElementById('lista-q2-quincena');

  let preComps = compromisosMes.filter(c => parseInt(c.dia) === -1);
  let q1Comps = compromisosMes.filter(c => parseInt(c.dia) >= 1 && parseInt(c.dia) <= 14);
  let q2Comps = compromisosMes.filter(c => parseInt(c.dia) >= 15);

  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let ingQ1 = eventosIngresosMes
    .filter(e => e.dia >= 1 && e.dia <= 14)
    .reduce((acc, e) => acc + e.valor, 0);
  let ingQ2 = eventosIngresosMes
    .filter(e => e.dia >= 15)
    .reduce((acc, e) => acc + e.valor, 0);

  buildQuincenaHtml(preCont, preComps, "Cargos Fijos / Pre-Mes");
  buildQuincenaHtml(q1Cont, q1Comps, "Tramo de Cobros 1 (Días 1-14)", ingQ1);
  buildQuincenaHtml(q2Cont, q2Comps, "Tramo de Cobros 2 (Días 15-31)", ingQ2);
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
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div><div>${nombreSeguro}</div></div>
        </div>
        <div class="ra neg">${formatCOP(c.valor)}</div>
      </div>
    `;
  });
  container.innerHTML = html;
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
  compromisosMes.forEach(c => {
    let d = parseInt(c.dia); 
    if (d === -1) d = 1; // Muestra los cargos fijos "pre-mes" en el día 1 para visualización
    if (!mapaDias[d]) mapaDias[d] = [];
    mapaDias[d].push(c);
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

  secTitulo.innerText = `Detalle del Día ${diaSeleccionadoActivo} de ${mesActivoGlobal}`;
  secTitulo.style.display = 'flex';
  cardContenedor.style.display = 'block';

  if(deEsteDia.length === 0 && ingresosDia.length === 0 && pagosRealesDiferidosDia.length === 0) {
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
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div>
            <div style="font-size:13px; font-weight:500;">${nombreSeguro}</div>
            <div class="rm" style="text-transform: capitalize;">${c.tipo}</div>
          </div>
        </div>
        <div class="ra ${c.pagado ? 'pos' : 'neg'}" style="font-size:13px;">${formatCOP(c.valor)}</div>
      </div>
    `;
  });

  cardContenedor.innerHTML = html;
}

function ocultarVistaDiariaDOM() {
  document.getElementById('sec-vista-diaria').style.display = 'none';
  document.getElementById('card-vista-diaria').style.display = 'none';
}

function renderMenuSemanas() {
  let contenedorBotones = document.getElementById('nav-semanas-botones');
  if(!contenedorBotones) return;
  contenedorBotones.innerHTML = '';
  obtenerSemanasDelMesActivo().forEach((sem, idx) => {
    let btn = document.createElement('button');
    btn.className = `qb ${idx === semanaSeleccionadaIndex ? 'on' : ''}`;
    btn.innerText = `Tramo ${idx + 1}`;
    btn.onclick = function() { semanaSeleccionadaIndex = idx; initApp(); };
    contenedorBotones.appendChild(btn);
  });
}

function renderSemanaActiva(compromisosMes) {
  let container = document.getElementById('lista-semana-activa');
  if(!container) return;
  let semanas = obtenerSemanasDelMesActivo();
  let configSemana = semanas[semanaSeleccionadaIndex];
  if(!configSemana) return;

  let resumenSemanal = semanas.map(s => ({ ...s, ...calcularBalanceSemanal(compromisosMes, s) }));
  let saldoArrastre = 0;
  let resumenConArrastre = resumenSemanal.map(s => {
    let saldoInicial = saldoArrastre;
    let saldoCierre = saldoInicial + s.balanceSemana;
    saldoArrastre = saldoCierre;
    return {
      ...s,
      saldoInicial,
      saldoCierre
    };
  });
  let datosSemanaActiva = resumenConArrastre[semanaSeleccionadaIndex];

  let deSemana = compromisosMes.filter(c => {
    let dVal = parseInt(c.dia);
    if (dVal === -1 && semanaSeleccionadaIndex === 0) return true;
    return configSemana.dias.includes(dVal);
  });

  let ingresosSemanaActiva = datosSemanaActiva.ingresosEventos.filter(e => configSemana.dias.includes(e.dia));

  let html = `<div style="margin-bottom:8px"><strong>Balance semana a semana</strong></div>`;
  html += `<div class="resumen-semanas">
    <div class="r h"><div>Semana</div><div>Ingresos</div><div>Gastos</div><div>Saldo cierre</div></div>
  `;
  resumenConArrastre.forEach((s, idx) => {
    let claseBal = s.saldoCierre >= 0 ? 'badge-pos' : 'badge-neg';
    html += `<div class="r" style="background:${idx === semanaSeleccionadaIndex ? '#EEEDFE' : 'transparent'}">
      <div>S${idx + 1}</div>
      <div class="badge-pos">${formatCOP(s.ingresosSemana)}</div>
      <div class="badge-neg">${formatCOP(s.gastosSemana)}</div>
      <div class="${claseBal}">${formatCOP(s.saldoCierre)}</div>
    </div>`;
  });
  html += `</div>`;

  let mostrarRebalanceoSemanal = resumenConArrastre.some(s => s.saldoCierre < 0);
  if(mostrarRebalanceoSemanal) {
    let estado = iaPanelState.rebalanceSemana || { loading: false, error: '', result: '' };
    html += `<div style="margin:10px 0 12px; padding:8px 0; border-top:1px dashed var(--color-border-secondary); border-bottom:1px dashed var(--color-border-secondary);">`;
    html += `<button class="btn-action" style="width:100%; padding:8px;" onclick="analizarRebalanceoSemanaIA()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : 'Rebalancear entre tramos ↗'}</button>`;
    if(estado.result) {
      html += `<div class="rm" style="margin-top:8px; white-space:pre-wrap; color:${estado.error ? '#A32D2D' : 'var(--color-text-secondary)'};">${escapeHTML(estado.result)}</div>`;
    }
    html += `</div>`;
  }

  html += `<div style="margin-bottom:8px"><strong>${configSemana.nombre}</strong> (${configSemana.rango})</div>`;
  html += `<div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:8px;">`;
  html += `Arrastre previo: <span class="${datosSemanaActiva.saldoInicial >= 0 ? 'pos' : 'neg'}">${formatCOP(datosSemanaActiva.saldoInicial)}</span> · `;
  html += `Ingresos: <span class="pos">${formatCOP(datosSemanaActiva.ingresosSemana)}</span> · `;
  html += `Gastos: <span class="neg">${formatCOP(datosSemanaActiva.gastosSemana)}</span> · `;
  html += `Neto semana: <span class="${datosSemanaActiva.balanceSemana >= 0 ? 'pos' : 'neg'}">${formatCOP(datosSemanaActiva.balanceSemana)}</span> · `;
  html += `Saldo cierre: <span class="${datosSemanaActiva.saldoCierre >= 0 ? 'pos' : 'neg'}">${formatCOP(datosSemanaActiva.saldoCierre)}</span>`;
  html += `</div>`;

  if(ingresosSemanaActiva.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin-bottom:6px;">Ingresos con fecha exacta:</div>`;
    ingresosSemanaActiva.forEach(i => {
      html += `<div class="row"><div class="rn"><i class="ti ti-arrow-down-right"></i> ${escapeHTML(i.nombre)} (día ${i.dia})</div><div class="ra pos">${formatCOP(i.valor)}</div></div>`;
    });
  }

  if(datosSemanaActiva.ingresosEventos.some(i => i.origen === 'arrastre')) {
    html += `<div class="rm" style="margin:8px 0 10px;">Nota: ingresos de día 29-31 se aplican como arrastre al día 1 del mes actual.</div>`;
  }

  deSemana.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn"><input type="checkbox" ${c.pagado ? 'checked':''} onclick="toggleCheckPago(${c.id})"> ${nombreSeguro}</div>
        <div class="ra neg">${formatCOP(c.valor)}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function procesarNuevoGasto() {
  let nombre = document.getElementById('add-nombre').value.trim();
  let valor = parseMontoInput(document.getElementById('add-valor').value);
  let dia = parseInt(document.getElementById('add-dia').value, 10);
  let tipoGasto = document.getElementById('add-tipo-gasto').value;
  let mesDestino = modoAltaDeuda === 'rapido' ? mesActivoGlobal : document.getElementById('add-mes-destino').value;
  let faltantes = parseInt(document.getElementById('add-faltantes').value, 10);
  let totales = parseInt(document.getElementById('add-totales').value, 10);

  if(!nombre || isNaN(valor) || valor <= 0) {
    alert("Debes ingresar un nombre y un valor mayor que 0.");
    return;
  }

  if(dia !== -1 && (isNaN(dia) || dia < 1 || dia > 31)) {
    alert("El día debe ser -1 o estar entre 1 y 31.");
    return;
  }

  if(tipoGasto === 'credito') {
    if(isNaN(faltantes) || isNaN(totales) || faltantes <= 0 || totales <= 0 || faltantes > totales) {
      alert("Para créditos, valida cuotas restantes y totales.");
      return;
    }
  }

  let nuevoCompromiso = {
    id: Date.now(),
    nombre: nombre,
    valor: valor,
    dia: dia,
    pagado: false,
    tipo: tipoGasto,
    mesKey: mesDestino
  };

  if(tipoGasto === 'credito') {
    nuevoCompromiso.faltantes = faltantes;
    nuevoCompromiso.totales = totales;
  }

  appData.compromisos.push(nuevoCompromiso);

  document.getElementById('add-nombre').value = '';
  document.getElementById('add-valor').value = '';
  document.getElementById('add-dia').value = '1';
  document.getElementById('add-tipo-gasto').value = 'variable';
  document.getElementById('add-faltantes').value = '6';
  document.getElementById('add-totales').value = '12';
  setModoAltaDeuda('rapido');

  initApp();
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
  if(window.FinancialI18n && typeof window.FinancialI18n.initializeLocale === 'function') {
    window.FinancialI18n.initializeLocale();
  }

  hidratarDataDesdeIndexedDB().finally(() => {
    initApp();
    registrarServiceWorker();
  });
};
