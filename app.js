window.addEventListener('DOMContentLoaded', () => {
  if(window.FinancialPwaBootstrap && typeof window.FinancialPwaBootstrap.initializePwaBootstrap === 'function') {
    window.FinancialPwaBootstrap.initializePwaBootstrap();
  }
});

// State defaults and loaded data live in app.state.js.

function formatCOP(val) { return '$' + Math.round(val).toLocaleString('es-CO'); }

function syncAppStoreState() {
  if(!appStore || typeof appStore.setState !== 'function') return;
  appStore.setState({
    appData,
    monthsTimeline: mesesLineaTiempo,
    activeMonthKey: mesActivoGlobal,
    selectedDay: diaSeleccionadoActivo,
    activeDebtFilter: filtroDeudaActivo,
    iaPanelState
  });
}

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

function marcarCorreccionMesBaseComoAplicada(dataObj = appData) {
  if(typeof window !== 'undefined' && window.FinancialTimelineUseCases && typeof window.FinancialTimelineUseCases.markBaseMonthCorrectionApplied === 'function') {
    window.FinancialTimelineUseCases.markBaseMonthCorrectionApplied(dataObj);
    return;
  }
  if(!dataObj || typeof dataObj !== 'object') return;
  if(!dataObj.migraciones || typeof dataObj.migraciones !== 'object') dataObj.migraciones = {};
  dataObj.migraciones.correccionMesBaseJunio2026 = true;
}

function asegurarMesesAnioActualEnLineaTiempo() {
  if(typeof window !== 'undefined' && window.FinancialTimelineUseCases && typeof window.FinancialTimelineUseCases.ensureCurrentYearTimelineMonths === 'function') {
    mesesLineaTiempo = window.FinancialTimelineUseCases.ensureCurrentYearTimelineMonths({
      timeline: mesesLineaTiempo,
      currentYear: new Date().getFullYear(),
      monthNames: ORDEN_MESES
    });
    if(appData && typeof appData === 'object') appData.lineaTiempoGuardada = mesesLineaTiempo;
    return;
  }
  let anioActual = new Date().getFullYear();
  let mesesAnioActual = ORDEN_MESES.map((mes) => `${mes} ${anioActual}`);
  let existentes = Array.isArray(mesesLineaTiempo) ? mesesLineaTiempo : [];
  let existentesNormalizados = existentes
    .map((mes) => (typeof mes === 'string' ? mes.trim() : ''))
    .filter(Boolean);
  let union = Array.from(new Set([...mesesAnioActual, ...existentesNormalizados]));

  union.sort((a, b) => {
    let pa = String(a || '').trim().split(/\s+/);
    let pb = String(b || '').trim().split(/\s+/);
    let ia = ORDEN_MESES.indexOf(pa[0]);
    let ib = ORDEN_MESES.indexOf(pb[0]);
    let aa = parseInt(pa[1], 10);
    let ab = parseInt(pb[1], 10);
    let aValida = !isNaN(aa) && ia >= 0;
    let bValida = !isNaN(ab) && ib >= 0;
    if(!aValida || !bValida) return aValida === bValida ? 0 : (aValida ? -1 : 1);
    return (aa - ab) || (ia - ib);
  });

  mesesLineaTiempo = union;
  if(appData && typeof appData === 'object') appData.lineaTiempoGuardada = mesesLineaTiempo;
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
      lastSyncEmail: '',
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
  if(typeof appData.driveSync.lastSyncEmail !== 'string') appData.driveSync.lastSyncEmail = '';
  if(typeof appData.driveSync.lastError !== 'string') appData.driveSync.lastError = '';
  // syncInProgress is a runtime/UI flag. Never restore a persisted true value,
  // because an interrupted tab/reload would leave Drive sync permanently locked.
  appData.driveSync.syncInProgress = false;
  if(!Array.isArray(appData.driveSync.syncEvents)) appData.driveSync.syncEvents = [];
  appData.driveSync.syncEvents = appData.driveSync.syncEvents.slice(-DRIVE_SYNC_TRACE_LIMIT);
}

// Google OAuth and Drive sync logic lives in app.drive.js.

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

// Backup import/export and restore flow lives in app.backup.js.

function escapeHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCompromisosMesActual() {
  syncAppStoreState();
  if(appStore && window.FinancialSelectors && typeof window.FinancialSelectors.getCurrentMonthDebts === 'function') {
    return appStore.select(window.FinancialSelectors.getCurrentMonthDebts, []);
  }
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
    throw new Error(`Daily AI token limit reached (${usage.dailyTokens}/${cfgApi.limits.dailyTokenLimit}).`);
  }
  if(usage.monthlyTokens >= cfgApi.limits.monthlyTokenLimit) {
    throw new Error(`Monthly AI token limit reached (${usage.monthlyTokens}/${cfgApi.limits.monthlyTokenLimit}).`);
  }
  if(usage.dailyCostCop >= cfgApi.limits.dailyCopLimit) {
    throw new Error(`Daily AI cost limit reached (${formatCOP(usage.dailyCostCop)}/${formatCOP(cfgApi.limits.dailyCopLimit)}).`);
  }
  if(usage.monthlyCostCop >= cfgApi.limits.monthlyCopLimit) {
    throw new Error(`Monthly AI cost limit reached (${formatCOP(usage.monthlyCostCop)}/${formatCOP(cfgApi.limits.monthlyCopLimit)}).`);
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
    asegurarMesesAnioActualEnLineaTiempo();
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
  
  // Keep the daily view updated when a day is selected.
  if(diaSeleccionadoActivo !== null) {
    renderVistaDiaria(compromisosMesActual);
  } else {
    ocultarVistaDiariaDOM();
  }

  setModoAltaDeuda(modoAltaDeuda);
  toggleCuotasInput(document.getElementById('add-tipo-gasto').value);
  actualizarPreviewNuevaDeuda();
}
