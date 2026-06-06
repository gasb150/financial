// AI actionable changes and rebalance actions extracted from app.ia.js.

function refreshTramosAndWeekView() {
  renderSemanaActiva(getCompromisosMesActual());
  refreshIAPanels('tramos');
}

async function pedirEstrategiaDeudasIA() {
  let items = getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo !== 'credito' && /deuda|prestamo|pr[e\u00e9]stamo|vank|vecin/i.test(String(c.nombre || '')))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  if(items.length === 0) {
    iaPanelState.deudas = { loading: false, error: '', result: 'No se encontraron deudas personales para analizar en este mes.' };
    refreshIAPanels('resumen-deudas');
    return;
  }

  iaPanelState.deudas = { loading: true, error: '', result: '' };
  refreshIAPanels('resumen-deudas');

  try {
    let prompt = construirPromptEstrategiaDeudas(items);
    let out = await ejecutarConsultaIA(prompt);
    iaPanelState.deudas = { loading: false, error: '', result: out.message || 'Sin respuesta.' };
  } catch(err) {
    iaPanelState.deudas = { loading: false, error: '1', result: err && err.message ? err.message : 'No se pudo generar estrategia.' };
  }

  refreshIAPanels('resumen-deudas');
}

async function analizarReduccionGastosIA(scope) {
  let items = [];
  let stateKey = 'gastosMes';

  if(scope === 'quincena') {
    items = obtenerGastosVariablesQuincena();
    stateKey = 'gastosQuincena';
  } else if(scope === 'semana') {
    items = obtenerGastosVariablesSemana();
    stateKey = 'gastosSemana';
  } else {
    items = obtenerGastosVariablesPendientesMes();
    stateKey = 'gastosMes';
  }

  items = items.slice(0, 10);

  if(items.length === 0) {
    iaPanelState[stateKey] = { loading: false, error: '', result: 'No hay gastos pendientes para analizar en este bloque.' };
    refreshIAPanels();
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  refreshIAPanels();

  try {
    let prompt = construirPromptRecorteVariables(items);
    let out = await ejecutarConsultaIA(prompt);
    iaPanelState[stateKey] = { loading: false, error: '', result: out.message || 'Sin respuesta.' };
  } catch(err) {
    iaPanelState[stateKey] = { loading: false, error: '1', result: err && err.message ? err.message : 'No se pudo analizar recortes.' };
  }

  refreshIAPanels();
}

async function analizarReduccionGastosMesIA() {
  return analizarReduccionGastosIA('mes');
}

async function analizarReduccionGastosQuincenaIA() {
  return analizarReduccionGastosIA('quincena');
}

async function analizarReduccionGastosSemanaIA() {
  return analizarReduccionGastosIA('semana');
}

async function analizarRecortesItemMesIA() {
  let stateKey = 'recortesItemsMes';
  let items = obtenerGastosVariablesPendientesMes().slice(0, 12);

  if(items.length === 0) {
    iaPanelState[stateKey] = { loading: false, error: '', result: 'No hay gastos variables pendientes para sugerir recortes.', items: [] };
    refreshIAPanels('resumen');
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: '', result: '', items: [] };
  refreshIAPanels('resumen');

  try {
    let prompt = construirPromptRecortesItemAccionables(items);
    let out = await ejecutarConsultaIA(prompt);
    let parsed = extraerJSONDeTextoIA(out.message);
    let sugerencias = normalizarSugerenciasRecorteDesdeIA(parsed, items);
    if(!sugerencias.length) {
      sugerencias = generarSugerenciasFallbackRecorte(items);
    }

    let ahorroTotal = sugerencias.reduce((acc, s) => acc + (s.ahorroEstimado || 0), 0);
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: `Sugerencias listas. Ahorro total proyectado: ${formatCOP(ahorroTotal)}.`,
      items: sugerencias
    };
  } catch(err) {
    let fallback = generarSugerenciasFallbackRecorte(items);
    let msgError = err && err.message ? err.message : 'No se pudo generar recortes con IA.';
    iaPanelState[stateKey] = {
      loading: false,
      error: '1',
      result: `${msgError}\nSe muestran sugerencias fallback para no bloquear flujo.`,
      items: fallback
    };
  }

  refreshIAPanels('resumen');
}

function aplicarSugerenciaRecorteMesIA(index) {
  let stateKey = 'recortesItemsMes';
  let estado = getEstadoRecortesItemsMes();
  let sugerencias = Array.isArray(estado.items) ? estado.items : [];
  let sug = sugerencias[index];
  if(!sug || sug.applied) return;

  let comp = appData.compromisos.find(c => c.id === sug.itemId && c.mesKey === mesActivoGlobal);
  if(!comp) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se encontro el item ${sug.nombre} en el mes activo.`;
    refreshIAPanels('resumen');
    return;
  }

  let accion = normalizarAccionIAUnificada(sug, {
    source: 'recorte',
    allowedItemIds: getCompromisosMesActual().map(c => c.id)
  });
  if(!accion) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = 'Sugerencia invalida: no cumple contrato de accion IA.';
    refreshIAPanels('resumen');
    return;
  }

  let preview = construirPreviewAccionIA(accion, getCompromisosMesActual());
  let confirmar = confirm(construirTextoConfirmacionAccionIA(accion, comp.nombre, preview));
  if(!confirmar) return;

  let ahorroReal = 0;
  let cambio = '';
  let idxComp = appData.compromisos.findIndex(c => c.id === sug.itemId && c.mesKey === mesActivoGlobal);
  if(idxComp < 0) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se encontro el item ${sug.nombre} en el mes activo.`;
    refreshIAPanels('resumen');
    return;
  }

  let prevComp = { ...appData.compromisos[idxComp] };

  try {
    if(accion.accion === 'reducir') {
      let actual = Math.round(appData.compromisos[idxComp].valor);
      let nuevo = Math.round(accion.nuevoValor || Math.max(1000, Math.round(actual * 0.85)));
      nuevo = Math.max(1, Math.min(nuevo, actual - 1));
      ahorroReal = Math.max(0, actual - nuevo);
      appData.compromisos[idxComp].valor = nuevo;
      cambio = `Reducido ${appData.compromisos[idxComp].nombre} de ${formatCOP(actual)} a ${formatCOP(nuevo)}.`;
    } else if(accion.accion === 'posponer') {
      let diaAntes = parseInt(appData.compromisos[idxComp].dia, 10);
      let nuevoDia = accion.diaSugerido;
      if(nuevoDia === null || isNaN(parseInt(nuevoDia, 10))) nuevoDia = resolverDiaPospuesto(diaAntes);
      appData.compromisos[idxComp].dia = nuevoDia;
      cambio = `Pospuesto ${appData.compromisos[idxComp].nombre} del dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} al dia ${nuevoDia === -1 ? 'pre-mes' : nuevoDia}.`;
    } else {
      let diaAntes = parseInt(appData.compromisos[idxComp].dia, 10);
      let diaDestino = resolverDiaTramoDestinoMes(accion.tramoDestino);
      if(diaDestino === null) {
        diaDestino = diaAntes <= 14 ? 20 : 10;
      }
      appData.compromisos[idxComp].dia = diaDestino;
      cambio = `Movido ${appData.compromisos[idxComp].nombre} del tramo ${obtenerEtiquetaTramoPorDia(diaAntes)} a ${obtenerEtiquetaTramoPorDia(diaDestino)}.`;
    }

    sug.applied = true;
    sug.appliedAt = new Date().toISOString();
    sug.ahorroReal = ahorroReal;

    let evento = registrarEventoHistorialIA({
      source: 'recorte',
      action: accion.accion,
      monthKey: mesActivoGlobal,
      itemName: appData.compromisos[idxComp].nombre,
      reason: sug.motivo || '',
      before: prevComp,
      after: appData.compromisos[idxComp],
      meta: {
        ahorroReal,
        ahorroEstimado: sug.ahorroEstimado || 0,
        riesgo: sug.riesgo,
        prioridad: sug.prioridad
      }
    });
    if(evento) sug.historyEventId = evento.id;

    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());

    sug.undoPayload = {
      prevComp,
      newComp: { ...appData.compromisos[idxComp] },
      mesKey: mesActivoGlobal,
      at: new Date().toISOString()
    };
  } catch(err) {
    appData.compromisos[idxComp] = { ...prevComp };
    sug.applied = false;
    delete sug.appliedAt;
    delete sug.ahorroReal;
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se pudo aplicar la accion de forma segura: ${err && err.message ? err.message : 'error desconocido'}.`;
    refreshIAPanels('resumen');
    return;
  }

  let ahorroAcumulado = sugerencias.reduce((acc, s) => acc + (s.ahorroReal || 0), 0);
  iaPanelState[stateKey].error = '';
  iaPanelState[stateKey].result = `${cambio}\nAhorro real acumulado aplicado: ${formatCOP(ahorroAcumulado)}.`;

  initApp();
}

function obtenerEstadoRebalanceo(scope) {
  let stateKey = scope === 'semana' ? 'rebalanceSemana' : 'rebalanceQuincena';
  if(!iaPanelState[stateKey] || typeof iaPanelState[stateKey] !== 'object') {
    iaPanelState[stateKey] = { loading: false, error: false, result: '', actions: [] };
  }
  if(!Array.isArray(iaPanelState[stateKey].actions)) iaPanelState[stateKey].actions = [];
  return { stateKey, state: iaPanelState[stateKey] };
}

function construirTextoImpactoRebalanceo(scope, accion) {
  if(!accion || !accion.tramoDestino) return 'Impacto estimado no disponible.';
  let simulacion = simularMovimientoEntreTramos(scope, accion.itemId, accion.tramoDestino);
  if(!simulacion) return 'Impacto estimado no disponible.';
  return `${simulacion.origen.codigo}: ${formatCOP(simulacion.origen.antes)} -> ${formatCOP(simulacion.origen.despues)} | ${simulacion.destino.codigo}: ${formatCOP(simulacion.destino.antes)} -> ${formatCOP(simulacion.destino.despues)}`;
}

function renderAccionesRebalanceoIA(scope) {
  let expandState = globalThis.__iaActionablesExpandState;
  if(!(expandState instanceof Set)) {
    expandState = new Set();
    globalThis.__iaActionablesExpandState = expandState;
  }

  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = Array.isArray(state.actions) ? state.actions : [];
  if(!acciones.length) return '';

  let compromisosMes = getCompromisosMesActual();
  return acciones.map((accion, idx) => {
    let rowKey = `rebalance-${scope}-${idx}`;
    let expanded = expandState.has(rowKey);
    let comp = compromisosMes.find(c => c.id === accion.itemId) || null;
    let nombre = comp ? comp.nombre : (accion.nombre || `Item ${accion.itemId}`);
    let impacto = construirTextoImpactoRebalanceo(scope, accion);
    let destinoTxt = accion.tramoDestino ? String(accion.tramoDestino).toUpperCase() : 'N/D';
    let ctaLabel = accion.applied ? 'Deshacer cambio' : 'Aplicar';

    return `
      <div class="ia-row" style="display:block;margin-top:8px;">
        <button class="ia-action-toggle" onclick="toggleExpandIAActionable('${rowKey}')" aria-expanded="${expanded ? 'true' : 'false'}" data-cta-label="${ctaLabel}">
          <span class="nm">${escapeHTML(nombre)}</span>
          <span class="ia-action-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
        </button>
        ${expanded ? `
        <div class="ia-action-body">
          <div class="meta">Accion: mover_tramo · Destino ${escapeHTML(destinoTxt)}</div>
          <div class="meta">${escapeHTML(impacto)}</div>
          <div class="meta" style="margin-top:2px;">${escapeHTML(accion.motivo || 'Sin motivo detallado.')}</div>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;">
            ${accion.applied
              ? `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="deshacerAccionRebalanceoIA('${scope}', ${idx})">Deshacer cambio</button>`
              : `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="aplicarAccionRebalanceoIA('${scope}', ${idx})">Aplicar</button>`
            }
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function aplicarAccionRebalanceoIA(scope, index) {
  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = state.actions;
  let accion = acciones[index];

  if(!accion || accion.applied) return;
  if(accion.accion !== 'mover_tramo') {
    state.error = true;
    state.result = 'La accion de rebalanceo no es valida para aplicar.';
    initApp();
    return;
  }

  let idxComp = appData.compromisos.findIndex(c => c.id === accion.itemId && c.mesKey === mesActivoGlobal);
  if(idxComp < 0) {
    state.error = true;
    state.result = 'No se encontro el item de rebalanceo en el mes activo.';
    initApp();
    return;
  }

  let tramos = obtenerResumenTramos(scope, getCompromisosMesActual());
  let compActual = appData.compromisos[idxComp];
  let tramoOrigen = obtenerTramoCompromiso(scope, compActual, tramos);
  let tramoDestino = accion.tramoDestino;
  if(!tramoDestino) {
    state.error = true;
    state.result = 'La accion no trae tramo destino para aplicar.';
    initApp();
    return;
  }
  if(tramoOrigen === tramoDestino) {
    state.error = true;
    state.result = 'El item ya se encuentra en el tramo destino sugerido.';
    initApp();
    return;
  }

  let nuevoDia = obtenerDiaRepresentativoTramo(scope, tramoDestino, tramos);
  if(nuevoDia === null || nuevoDia === undefined || isNaN(parseInt(nuevoDia, 10))) {
    state.error = true;
    state.result = 'No se pudo resolver un dia valido para el tramo destino.';
    initApp();
    return;
  }

  let preview = construirTextoImpactoRebalanceo(scope, accion);
  let confirmar = confirm(`Mover ${compActual.nombre} de ${String(tramoOrigen || 'N/D').toUpperCase()} a ${String(tramoDestino).toUpperCase()}?\n${preview}`);
  if(!confirmar) return;

  let prevComp = { ...appData.compromisos[idxComp] };
  try {
    appData.compromisos[idxComp].dia = nuevoDia;
    accion.applied = true;
    accion.appliedAt = new Date().toISOString();
    let evento = registrarEventoHistorialIA({
      source: `rebalance-${scope}`,
      action: 'mover_tramo',
      monthKey: mesActivoGlobal,
      itemName: appData.compromisos[idxComp].nombre,
      reason: accion.motivo || '',
      before: prevComp,
      after: appData.compromisos[idxComp],
      meta: {
        scope,
        tramoDestino: accion.tramoDestino
      }
    });
    if(evento) accion.historyEventId = evento.id;
    accion.undoPayload = {
      prevComp,
      newComp: { ...appData.compromisos[idxComp] },
      mesKey: mesActivoGlobal,
      at: new Date().toISOString()
    };

    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());
  } catch(err) {
    appData.compromisos[idxComp] = { ...prevComp };
    accion.applied = false;
    delete accion.appliedAt;
    delete accion.undoPayload;
    state.error = true;
    state.result = `No se pudo aplicar el rebalanceo: ${err && err.message ? err.message : 'error desconocido'}.`;
    initApp();
    return;
  }

  state.error = false;
  state.result = `Rebalanceo aplicado en ${compActual.nombre}.`;
  initApp();
}

function deshacerAccionRebalanceoIA(scope, index) {
  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = state.actions;
  let accion = acciones[index];

  if(!accion || !accion.applied || !accion.undoPayload || !accion.undoPayload.prevComp) {
    state.error = true;
    state.result = 'No hay un cambio de rebalanceo aplicado para deshacer.';
    initApp();
    return;
  }

  let prev = accion.undoPayload.prevComp;
  let idxComp = appData.compromisos.findIndex(c => c.id === prev.id && c.mesKey === prev.mesKey);
  if(idxComp < 0) {
    state.error = true;
    state.result = 'No se pudo deshacer: el item ya no existe en el mes activo.';
    initApp();
    return;
  }

  appData.compromisos[idxComp] = { ...prev };
  if(accion.historyEventId) {
    let evt = obtenerEventoHistorialIA(accion.historyEventId);
    if(evt && !evt.revertedAt) evt.revertedAt = new Date().toISOString();
  }
  accion.applied = false;
  delete accion.appliedAt;
  delete accion.undoPayload;
  delete accion.historyEventId;

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());

  state.error = false;
  state.result = `Cambio deshecho para ${prev.nombre}.`;
  initApp();
}

async function analizarRebalanceoIA(scope) {
  let stateKey = scope === 'semana' ? 'rebalanceSemana' : 'rebalanceQuincena';
  let tramos = obtenerResumenTramos(scope);
  let movibles = obtenerCompromisosMovibles(scope, tramos, getCompromisosMesActual());
  let hayDeficit = tramos.some(t => t.saldoCierre < 0);
  let haySuperavit = tramos.some(t => t.saldoCierre > 0);

  if(!hayDeficit) {
    iaPanelState[stateKey] = { loading: false, error: false, result: '', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  if(!haySuperavit) {
    iaPanelState[stateKey] = { loading: false, error: false, result: 'No hay tramos con capacidad para recibir movimientos.', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  if(!movibles.length) {
    iaPanelState[stateKey] = { loading: false, error: false, result: 'No hay obligaciones variables pendientes para mover entre tramos.', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: false, result: '', actions: [] };
  refreshTramosAndWeekView();

  try {
    let prompt = construirPromptRebalanceoTramos(scope, tramos, movibles);
    let out = await ejecutarConsultaIA(prompt);
    let escenarioBase = construirEscenarioBaseRebalanceo(scope, tramos, movibles);
    let resumenEscenario = formatearEscenarioBase(escenarioBase);
    let accionesRebalanceo = [];
    if(escenarioBase && escenarioBase.item && escenarioBase.destino) {
      let accionRaw = {
        source: 'rebalanceo',
        itemId: escenarioBase.item.id,
        accion: 'mover_tramo',
        ahorroEstimado: 0,
        riesgo: 'medio',
        prioridad: 'alta',
        tramoDestino: escenarioBase.destino.id,
        motivo: 'Accion estructurada desde escenario base de rebalanceo.'
      };
      let validada = normalizarAccionIAUnificada(accionRaw, {
        source: 'rebalanceo',
        allowedItemIds: movibles.map(m => m.id)
      });
      if(validada) {
        validada.tramoDestino = escenarioBase.destino.id;
        validada.scope = scope;
        validada.nombre = escenarioBase.item.nombre;
        accionesRebalanceo.push(validada);
      }
    }

    iaPanelState[stateKey] = {
      loading: false,
      error: false,
      result: `${resumenEscenario}\n\nSugerencias IA:\n${out.message || 'Sin respuesta.'}`,
      actions: accionesRebalanceo
    };
  } catch(err) {
    iaPanelState[stateKey] = {
      loading: false,
      error: true,
      result: err && err.message ? err.message : 'No se pudo generar rebalanceo entre tramos.',
      actions: []
    };
  }

  refreshTramosAndWeekView();
}

async function analizarRebalanceoSemanaIA() {
  return analizarRebalanceoIA('semana');
}

async function analizarRebalanceoQuincenaIA() {
  return analizarRebalanceoIA('quincena');
}
