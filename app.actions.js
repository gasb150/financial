// UI actions and form handlers module extracted from app.js.

(function initFinancialActionsModule(globalScope) {
  function persistAndStampNow() {
    let nowISO = new Date().toISOString();
    if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};
    appData.iaConfig.updatedAt = nowISO;
    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(nowISO);
    return nowISO;
  }

  function commitAppChange(options = {}) {
    initApp();
    if(options.refreshDailyView && diaSeleccionadoActivo !== null && typeof renderVistaDiaria === 'function') {
      renderVistaDiaria(compromisosMesGlobalCache);
    }
  }

  function isValidPositiveValue(valor) {
    return !isNaN(valor) && valor > 0;
  }

  function isValidDayInMonth(dia) {
    return !isNaN(dia) && dia >= 1 && dia <= 31;
  }

  function setAIMode(modoNuevo) {
    let modo = IA_MODES.includes(modoNuevo) ? modoNuevo : 'off';
    if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};
    appData.iaConfig.mode = modo;
    persistAndStampNow();
    renderConfigIA();

    let salida = document.getElementById('ia-test-result');
    if(salida) salida.innerText = `Modo IA guardado: ${modo.toUpperCase()}.`;
  }

  function saveLocalAIConfig() {
    if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};

    let endpointInput = document.getElementById('ia-local-endpoint');
    let modelInput = document.getElementById('ia-local-model');
    let timeoutInput = document.getElementById('ia-local-timeout');
    let retriesInput = document.getElementById('ia-local-retries');

    appData.iaConfig.providerLocalEndpoint = normalizarEndpointOllama(endpointInput ? endpointInput.value : '');
    appData.iaConfig.providerLocalModel = String(modelInput && modelInput.value ? modelInput.value : 'llama3.1:8b').trim() || 'llama3.1:8b';
    appData.iaConfig.timeoutMs = Math.min(Math.max(parseInt(timeoutInput && timeoutInput.value, 10) || 45000, 10000), 180000);
    appData.iaConfig.retries = Math.min(Math.max(parseInt(retriesInput && retriesInput.value, 10) || 1, 0), 4);
    persistAndStampNow();
    renderConfigIA();

    let salida = document.getElementById('ia-test-result');
    if(salida) salida.innerText = 'Configuracion LOCAL guardada.';
  }

  function saveApiAIConfig() {
    if(!appData.iaConfig || typeof appData.iaConfig !== 'object') appData.iaConfig = {};

    let endpointInput = document.getElementById('ia-api-endpoint');
    let providerInput = document.getElementById('ia-api-provider');
    let modelInput = document.getElementById('ia-api-model');
    let keyInput = document.getElementById('ia-api-key');
    let dailyTokensInput = document.getElementById('ia-api-daily-tokens');
    let monthlyTokensInput = document.getElementById('ia-api-monthly-tokens');
    let dailyCopInput = document.getElementById('ia-api-daily-cop');
    let monthlyCopInput = document.getElementById('ia-api-monthly-cop');
    let cost1kInput = document.getElementById('ia-api-cost-1k');

    appData.iaConfig.providerApiEndpoint = normalizarEndpointIAGateway(endpointInput ? endpointInput.value : '');
    appData.iaConfig.providerApiName = String(providerInput && providerInput.value ? providerInput.value : 'generic').trim() || 'generic';
    appData.iaConfig.providerApiModel = String(modelInput && modelInput.value ? modelInput.value : 'gpt-4.1-mini').trim() || 'gpt-4.1-mini';
    appData.iaConfig.providerApiKey = String(keyInput && keyInput.value ? keyInput.value : '').trim();
    appData.iaConfig.apiDailyTokenLimit = Math.max(0, parseInt(dailyTokensInput && dailyTokensInput.value, 10) || 80000);
    appData.iaConfig.apiMonthlyTokenLimit = Math.max(0, parseInt(monthlyTokensInput && monthlyTokensInput.value, 10) || 1200000);
    appData.iaConfig.apiDailyCopLimit = Math.max(0, parseInt(dailyCopInput && dailyCopInput.value, 10) || 20000);
    appData.iaConfig.apiMonthlyCopLimit = Math.max(0, parseInt(monthlyCopInput && monthlyCopInput.value, 10) || 200000);
    appData.iaConfig.apiEstimatedCopPer1kTokens = Math.max(1, parseInt(cost1kInput && cost1kInput.value, 10) || 40);
    persistAndStampNow();
    renderConfigIA();

    let salida = document.getElementById('ia-test-result');
    if(salida) salida.innerText = 'Configuración API guardada.';
  }

  async function testConfiguredAI() {
    let out = document.getElementById('ia-test-result');
    if(!out) return;

    try {
      let res = await ejecutarConsultaIA('Prueba rapida de disponibilidad IA');
      out.innerText = `Resultado (${String(res.mode || '').toUpperCase()}): ${res.message}`;
    } catch(err) {
      out.innerText = `Bloqueado: ${err && err.message ? err.message : 'No disponible'}`;
    }
  }

  function installPWAApp() {
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

  function toggleInstallmentFields(val) {
    let wrap = document.getElementById('wrap-cuotas-add');
    if(wrap) wrap.style.display = val === 'credito' ? 'block' : 'none';
  }

  function setDebtEntryMode(modo) {
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

  function updateNewDebtPreview() {
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

  function togglePaidCheck(id) {
    let comp = appData.compromisos.find(c => c.id === id);
    if(comp) {
      comp.pagado = !comp.pagado;
      commitAppChange({ refreshDailyView: true });
    }
  }

  function applyDebtDateFilter() {
    let desde = parseInt(document.getElementById('f-dia-desde').value, 10);
    let hasta = parseInt(document.getElementById('f-dia-hasta').value, 10);
    filtroDiaDesde = isNaN(desde) ? null : Math.min(Math.max(desde, 1), 31);
    filtroDiaHasta = isNaN(hasta) ? null : Math.min(Math.max(hasta, 1), 31);
    renderDeudasModulo(getCompromisosMesActual());
  }

  function clearDebtDateFilter(soloEstado = false) {
    filtroDiaDesde = null;
    filtroDiaHasta = null;
    let iDesde = document.getElementById('f-dia-desde');
    let iHasta = document.getElementById('f-dia-hasta');
    if(iDesde) iDesde.value = '';
    if(iHasta) iHasta.value = '';
    if(!soloEstado) renderDeudasModulo(getCompromisosMesActual());
  }

  function addDynamicIncome() {
    let nombre = document.getElementById('new-ing-nombre').value.trim();
    let valor = parseMontoInput(document.getElementById('new-ing-valor').value);
    let periodo = document.getElementById('new-ing-periodo').value;
    let diaPago = parseInt(document.getElementById('new-ing-dia').value, 10);
    let mesInicio = document.getElementById('new-ing-desde').value;
    let mesFinRaw = document.getElementById('new-ing-hasta').value;
    let mesFinIndefinido = mesFinRaw === '__indefinido__';
    let mesFin = mesFinIndefinido ? null : mesFinRaw;
    if(!nombre || !isValidPositiveValue(valor)) { alert('Datos inválidos'); return; }
    if(!isValidDayInMonth(diaPago)) { alert('El día de pago del ingreso debe estar entre 1 y 31.'); return; }
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
    commitAppChange();
  }

  function removeIncome(id) {
    if(confirm('¿Remover esta fuente?')) { appData.ingresosList = appData.ingresosList.filter(i => i.id !== id); commitAppChange(); }
  }

  function addOneOffBonus() {
    let nombre = document.getElementById('new-prima-nombre').value.trim();
    let valor = parseMontoInput(document.getElementById('new-prima-valor').value);
    let diaPago = parseInt(document.getElementById('new-prima-dia').value, 10);
    let mesKey = document.getElementById('new-prima-mes').value;

    if(!nombre || !isValidPositiveValue(valor)) {
      alert('Datos inválidos para la prima.');
      return;
    }
    if(!isValidDayInMonth(diaPago)) {
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
    commitAppChange();
  }

  function removeBonus(id) {
    if(confirm('¿Eliminar esta prima?')) {
      appData.primasList = appData.primasList.filter(p => p.id !== id);
      commitAppChange();
    }
  }

  function removeCompromiso(id) {
    if(confirm('¿Eliminar compromiso?')) {
      appData.compromisos = appData.compromisos.filter(c => c.id !== id);
      commitAppChange();
    }
  }

  function processNewExpense() {
    let nombre = document.getElementById('add-nombre').value.trim();
    let valor = parseMontoInput(document.getElementById('add-valor').value);
    let dia = parseInt(document.getElementById('add-dia').value, 10);
    let tipoGasto = document.getElementById('add-tipo-gasto').value;
    let mesDestino = modoAltaDeuda === 'rapido' ? mesActivoGlobal : document.getElementById('add-mes-destino').value;
    let faltantes = parseInt(document.getElementById('add-faltantes').value, 10);
    let totales = parseInt(document.getElementById('add-totales').value, 10);

    if(!nombre || !isValidPositiveValue(valor)) {
      alert('Debes ingresar un nombre y un valor mayor que 0.');
      return;
    }

    if(dia !== -1 && !isValidDayInMonth(dia)) {
      alert('El día debe ser -1 o estar entre 1 y 31.');
      return;
    }

    if(tipoGasto === 'credito') {
      if(isNaN(faltantes) || isNaN(totales) || faltantes <= 0 || totales <= 0 || faltantes > totales) {
        alert('Para créditos, valida cuotas restantes y totales.');
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

    commitAppChange();
  }

  globalScope.FinancialActions = {
    setAIMode,
    saveLocalAIConfig,
    saveApiAIConfig,
    testConfiguredAI,
    installPWAApp,
    toggleInstallmentFields,
    setDebtEntryMode,
    updateNewDebtPreview,
    togglePaidCheck,
    applyDebtDateFilter,
    clearDebtDateFilter,
    addDynamicIncome,
    removeIncome,
    addOneOffBonus,
    removeBonus,
    removeCompromiso,
    processNewExpense
  };
})(window);
