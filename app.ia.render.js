// AI panel rendering and scenario helpers extracted from app.ia.js.

function renderSugerenciasRecorteAccionables(stateKey) {
  let expandState = globalThis.__iaActionablesExpandState;
  if(!(expandState instanceof Set)) {
    expandState = new Set();
    globalThis.__iaActionablesExpandState = expandState;
  }

  let estado = iaPanelState[stateKey];
  let items = Array.isArray(estado.items) ? estado.items : [];
  if(!items.length) return '<div class="ia-row"><div class="meta">No item-by-item suggestions yet.</div></div>';

  return items.map((s, idx) => {
    let rowKey = `recorte-${stateKey}-${idx}`;
    let expanded = expandState.has(rowKey);
    let preview = construirPreviewAccionIA(s, getCompromisosMesActual());
    let ahorroTxt = s.ahorroEstimado > 0 ? `Estimated savings: ${formatCOP(s.ahorroEstimado)}` : 'Estimated savings: cash-flow impact';
    let metaAccion = '';
    if(s.accion === 'reducir' && s.nuevoValor) metaAccion = `New amount: ${formatCOP(s.nuevoValor)}`;
    if(s.accion === 'posponer' && s.diaSugerido !== null) metaAccion = `Move to day ${s.diaSugerido === -1 ? 'pre-month' : s.diaSugerido}`;
    if(s.accion === 'mover_tramo' && s.tramoDestino) metaAccion = `Move to ${String(s.tramoDestino).toUpperCase()}`;
    return `
      <div class="ia-row" style="display:block;">
        <button class="ia-action-toggle" onclick="toggleExpandIAActionable('${rowKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
          <span class="nm">${escapeHTML(s.nombre)}</span>
          <span class="ia-action-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
        </button>
        ${expanded ? `
        <div class="ia-action-body">
          <div class="meta">${etiquetaAccionRecorte(s.accion)} · Risk ${escapeHTML(s.riesgo)} · Priority ${escapeHTML(s.prioridad)}</div>
          <div class="meta">${escapeHTML(metaAccion)} · ${ahorroTxt}</div>
          <div class="meta">${escapeHTML(construirTextoPreviewAccionIA(preview))}</div>
          <div class="meta" style="margin-top:2px;">${escapeHTML(s.motivo || '')}</div>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;">
            ${s.applied
              ? `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="deshacerCambioSugerenciaRecorteMesIA(${idx})">Undo change</button>`
              : `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="aplicarSugerenciaRecorteMesIA(${idx})">Apply</button>`
            }
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function buildIACardRecortesItemsMes(items, stateKey, actionFnName) {
  let cardExpandState = globalThis.__iaCardsExpandState;
  if(!(cardExpandState instanceof Set)) {
    cardExpandState = new Set();
    globalThis.__iaCardsExpandState = cardExpandState;
  }
  let cardKey = `ia-card-${stateKey}`;
  let expanded = cardExpandState.has(cardKey);

  let estado = iaPanelState[stateKey];
  let sugerencias = Array.isArray(estado.items) ? estado.items : [];
  let ahorroTotal = sugerencias.reduce((acc, s) => acc + (s.ahorroEstimado || 0), 0);
  let aplicadas = sugerencias.filter(s => s.applied).length;
  let totalPendientes = items.reduce((acc, it) => acc + it.valor, 0);
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <button class="ia-card-toggle" onclick="toggleExpandIACard('${cardKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="ttl">Item-by-item cuts</span>
        <span class="ia-card-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
      </button>
      ${expanded ? `
      <div class="ia-card-body">
      <div class="ia-row">
        <div>
          <div class="nm">Monthly pending variable items</div>
          <div class="meta">${items.length} items · projected savings ${formatCOP(ahorroTotal)}</div>
        </div>
        <div class="vl">${formatCOP(totalPendientes)}</div>
      </div>
      ${renderSugerenciasRecorteAccionables(stateKey)}
      <div class="meta" style="margin-top:8px;">Applied: ${aplicadas}/${sugerencias.length}</div>
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analyzing...' : 'Generate actionable cuts ↗'}</button>
      ${resultado}
      </div>
      ` : ''}
    </div>
  `;
}

function renderFilasHistorialIA() {
  let history = asegurarHistorialIA();
  let items = history.events
    .slice()
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 8);

  if(!items.length) {
    return '<div class="ia-row"><div class="meta">No applied AI events yet.</div></div>';
  }

  return items.map((evt) => {
    let fecha = evt.appliedAt ? new Date(evt.appliedAt).toLocaleString('es-CO') : 'N/D';
    let estado = evt.revertedAt ? 'Reverted' : 'Active';
    let beforeTxt = evt.before ? `${formatCOP(evt.before.valor)} · day ${evt.before.dia === -1 ? 'pre-month' : evt.before.dia}` : 'N/D';
    let afterTxt = evt.after ? `${formatCOP(evt.after.valor)} · day ${evt.after.dia === -1 ? 'pre-month' : evt.after.dia}` : 'N/D';
    return `
      <div class="ia-row" style="display:block;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div>
            <div class="nm">${escapeHTML(evt.itemName || `Item ${evt.itemId}`)}</div>
            <div class="meta">${escapeHTML(String(evt.source || 'ia'))} · ${escapeHTML(String(evt.action || 'accion'))} · ${escapeHTML(estado)}</div>
            <div class="meta">${escapeHTML(fecha)} · ${escapeHTML(beforeTxt)} → ${escapeHTML(afterTxt)}</div>
          </div>
          ${evt.revertedAt
            ? '<span class="meta">OK</span>'
            : `<button class="ia-cta" style="width:auto;min-width:110px;padding:7px 10px;margin-top:0;" onclick="revertirEventoHistorialIA('${evt.id}')">Revert</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function buildIACardHistorialIA() {
  let cardExpandState = globalThis.__iaCardsExpandState;
  if(!(cardExpandState instanceof Set)) {
    cardExpandState = new Set();
    globalThis.__iaCardsExpandState = cardExpandState;
  }
  let cardKey = 'ia-card-historial';
  let expanded = cardExpandState.has(cardKey);

  let history = asegurarHistorialIA();
  let activos = history.events.filter((evt) => !evt.revertedAt).length;
  let total = history.events.length;

  return `
    <div class="ia-card">
      <button class="ia-card-toggle" onclick="toggleExpandIACard('${cardKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="ttl">Applied AI history</span>
        <span class="ia-card-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
      </button>
      ${expanded ? `
      <div class="ia-card-body">
      <div class="ia-row">
        <div>
          <div class="nm">Recorded events</div>
          <div class="meta">Active ${activos} · Total ${total}</div>
        </div>
      </div>
      ${renderFilasHistorialIA()}
      <button class="ia-cta" onclick="revertirUltimosEventosIA(3)" ${activos === 0 ? 'disabled' : ''}>Revert last 3 ↩</button>
      </div>
      ` : ''}
    </div>
  `;
}

function obtenerResumenTramosSemanales(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let semanas = obtenerSemanasDelMesActivo();
  let saldoArrastre = 0;

  return semanas.map((semana) => {
    let stats = calcularBalanceSemanal(base, semana);
    let saldoInicial = saldoArrastre;
    let saldoCierre = saldoInicial + stats.balanceSemana;
    saldoArrastre = saldoCierre;
    return {
      id: semana.id,
      codigo: semana.id.replace('sem-', 'S'),
      nombre: semana.nombre,
      rango: semana.rango,
      dias: [...semana.dias],
      ingresos: stats.ingresosSemana,
      gastos: stats.gastosSemana,
      saldoInicial,
      saldoCierre
    };
  });
}

function obtenerResumenTramosQuincena(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);

  let ingQ1 = eventosIngresosMes
    .filter(e => e.dia >= 1 && e.dia <= 14)
    .reduce((acc, e) => acc + e.valor, 0);
  let ingQ2 = eventosIngresosMes
    .filter(e => e.dia >= 15)
    .reduce((acc, e) => acc + e.valor, 0);

  let tramos = [
    {
      id: 'pre',
      codigo: 'PRE',
      nombre: 'Pre-Mes',
      dias: [-1],
      ingresos: 0,
      gastos: base.filter(c => parseInt(c.dia, 10) === -1).reduce((acc, c) => acc + c.valor, 0)
    },
    {
      id: 'q1',
      codigo: 'Q1',
      nombre: 'Quincena 1',
      dias: Array.from({ length: 14 }, (_, i) => i + 1),
      ingresos: ingQ1,
      gastos: base.filter(c => {
        let d = parseInt(c.dia, 10);
        return d >= 1 && d <= 14;
      }).reduce((acc, c) => acc + c.valor, 0)
    },
    {
      id: 'q2',
      codigo: 'Q2',
      nombre: 'Quincena 2',
      dias: Array.from({ length: 17 }, (_, i) => i + 15),
      ingresos: ingQ2,
      gastos: base.filter(c => parseInt(c.dia, 10) >= 15).reduce((acc, c) => acc + c.valor, 0)
    }
  ];

  let saldoArrastre = 0;
  return tramos.map((t) => {
    let saldoInicial = saldoArrastre;
    let saldoCierre = saldoInicial + t.ingresos - t.gastos;
    saldoArrastre = saldoCierre;
    return { ...t, saldoInicial, saldoCierre };
  });
}

function obtenerResumenTramos(scope, compromisosMes) {
  if(scope === 'semana') return obtenerResumenTramosSemanales(compromisosMes);
  return obtenerResumenTramosQuincena(compromisosMes);
}

function obtenerTramoCompromiso(scope, comp, tramos) {
  let dia = parseInt(comp.dia, 10);
  let listaTramos = Array.isArray(tramos) && tramos.length ? tramos : obtenerResumenTramos(scope);

  if(scope === 'semana') {
    if(dia === -1) return listaTramos[0] ? listaTramos[0].id : null;
    let tramo = listaTramos.find(t => Array.isArray(t.dias) && t.dias.includes(dia));
    return tramo ? tramo.id : null;
  }

  if(dia === -1) return 'pre';
  if(dia >= 1 && dia <= 14) return 'q1';
  return 'q2';
}

function obtenerDiaRepresentativoTramo(scope, tramoId, tramos) {
  if(scope === 'quincena') {
    if(tramoId === 'pre') return -1;
    if(tramoId === 'q1') return 10;
    return 20;
  }

  let listaTramos = Array.isArray(tramos) && tramos.length ? tramos : obtenerResumenTramosSemanales(getCompromisosMesActual());
  let tramo = listaTramos.find(t => t.id === tramoId);
  if(!tramo || !Array.isArray(tramo.dias) || !tramo.dias.length) return 1;
  return tramo.dias[0];
}

function obtenerCompromisosMovibles(scope, tramos, compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  return base
    .filter(c => !c.pagado && c.tipo === 'variable')
    .map(c => {
      let tramoId = obtenerTramoCompromiso(scope, c, tramos);
      return {
        id: c.id,
        nombre: c.nombre,
        valor: c.valor,
        dia: c.dia,
        tipo: c.tipo,
        tramoId
      };
    })
    .filter(c => !!c.tramoId)
    .sort((a, b) => b.valor - a.valor);
}

function construirPromptRebalanceoTramos(scope, tramos, movibles) {
  let nombreScope = scope === 'semana' ? 'tramos semanales' : 'tramos de quincena';
  let resumen = tramos.map(t => {
    return `${t.codigo} | ingresos ${formatCOP(t.ingresos)} | gastos ${formatCOP(t.gastos)} | saldo cierre ${formatCOP(t.saldoCierre)}`;
  }).join('\n');
  let moviblesTxt = movibles.length
    ? movibles.slice(0, 15).map((m, idx) => `${idx + 1}. ${m.nombre} - ${formatCOP(m.valor)} - tramo actual ${String(m.tramoId).toUpperCase()} - dia ${m.dia === -1 ? 'pre-mes' : m.dia}`).join('\n')
    : 'Sin compromisos variables movibles en este mes.';

  return [
    'Actua como estratega financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Objetivo: rebalancear ${nombreScope} moviendo obligaciones no criticas desde tramos deficitarios a tramos con capacidad.`,
    'Restricciones obligatorias:',
    '- No mover gastos tipo fijo ni credito.',
    '- No cambiar el monto; solo mover fecha/tramo.',
    '- Priorizar mover el menor numero de items para aliviar deficit.',
    'Resumen de tramos (antes):',
    resumen,
    'Compromisos movibles:',
    moviblesTxt,
    'Devuelve maximo 3 sugerencias en este formato exacto:',
    '- Accion: mover "NOMBRE" de TRAMO_ORIGEN a TRAMO_DESTINO (dia sugerido X)',
    '  Impacto: TRAMO_ORIGEN $antes -> $despues | TRAMO_DESTINO $antes -> $despues',
    '  Motivo: texto corto',
    'Si no hay movimiento viable, explica por que y sugiere recorte alterno.'
  ].join('\n');
}

function simularMovimientoEntreTramos(scope, compromisoId, tramoDestinoId) {
  let base = getCompromisosMesActual();
  let tramosAntes = obtenerResumenTramos(scope, base);
  let compOriginal = base.find(c => c.id === compromisoId);
  if(!compOriginal) return null;

  let tramoOrigenId = obtenerTramoCompromiso(scope, compOriginal, tramosAntes);
  if(!tramoOrigenId || tramoOrigenId === tramoDestinoId) return null;

  let nuevoDia = obtenerDiaRepresentativoTramo(scope, tramoDestinoId, tramosAntes);
  let simulados = base.map(c => c.id === compromisoId ? { ...c, dia: nuevoDia } : { ...c });
  let tramosDespues = obtenerResumenTramos(scope, simulados);

  let origenAntes = tramosAntes.find(t => t.id === tramoOrigenId);
  let destinoAntes = tramosAntes.find(t => t.id === tramoDestinoId);
  let origenDespues = tramosDespues.find(t => t.id === tramoOrigenId);
  let destinoDespues = tramosDespues.find(t => t.id === tramoDestinoId);

  if(!origenAntes || !destinoAntes || !origenDespues || !destinoDespues) return null;

  return {
    scope,
    item: { id: compOriginal.id, nombre: compOriginal.nombre, valor: compOriginal.valor },
    origen: {
      id: tramoOrigenId,
      codigo: origenAntes.codigo,
      antes: origenAntes.saldoCierre,
      despues: origenDespues.saldoCierre
    },
    destino: {
      id: tramoDestinoId,
      codigo: destinoAntes.codigo,
      antes: destinoAntes.saldoCierre,
      despues: destinoDespues.saldoCierre
    },
    tramosAntes,
    tramosDespues
  };
}

function construirEscenarioBaseRebalanceo(scope, tramos, movibles) {
  let deficitarios = tramos
    .filter(t => t.saldoCierre < 0)
    .sort((a, b) => a.saldoCierre - b.saldoCierre);
  let conCapacidad = tramos
    .filter(t => t.saldoCierre > 0)
    .sort((a, b) => b.saldoCierre - a.saldoCierre);

  for(let i = 0; i < deficitarios.length; i++) {
    let origen = deficitarios[i];
    let candidatosOrigen = movibles.filter(m => m.tramoId === origen.id);
    if(!candidatosOrigen.length) continue;

    for(let j = 0; j < candidatosOrigen.length; j++) {
      let item = candidatosOrigen[j];
      let destino = conCapacidad.find(t => t.id !== origen.id && t.saldoCierre >= Math.round(item.valor * 0.6));
      if(!destino) continue;
      let simulacion = simularMovimientoEntreTramos(scope, item.id, destino.id);
      if(simulacion) return simulacion;
    }
  }

  return null;
}

function renderResumenTramosParaCard(tramos) {
  if(!tramos.length) return `<div class="ia-row"><div class="meta">No hay tramos disponibles para este mes.</div></div>`;
  return tramos.map(t => `
    <div class="ia-row">
      <div>
        <div class="nm">${escapeHTML(t.codigo)} · ${escapeHTML(t.nombre)}</div>
        <div class="meta">Ingresos ${formatCOP(t.ingresos)} · Gastos ${formatCOP(t.gastos)}</div>
      </div>
      <div class="vl" style="color:${t.saldoCierre >= 0 ? '#81e6b8' : '#ff9a9a'}">${formatCOP(t.saldoCierre)}</div>
    </div>
  `).join('');
}

function formatearEscenarioBase(simulacion) {
  if(!simulacion) return 'Escenario base automatico: no se encontro movimiento claro entre tramos con el contexto actual.';
  return [
    `Escenario base automatico: mover "${simulacion.item.nombre}" (${formatCOP(simulacion.item.valor)}) de ${simulacion.origen.codigo} a ${simulacion.destino.codigo}.`,
    `Impacto esperado: ${simulacion.origen.codigo} ${formatCOP(simulacion.origen.antes)} -> ${formatCOP(simulacion.origen.despues)} | ${simulacion.destino.codigo} ${formatCOP(simulacion.destino.antes)} -> ${formatCOP(simulacion.destino.despues)}.`
  ].join('\n');
}

function existeDeficitEnScope(scope, compromisosMes) {
  let tramos = obtenerResumenTramos(scope, compromisosMes);
  return tramos.some(t => t.saldoCierre < 0);
}

function buildIACardRebalanceo(titulo, tramos, stateKey, actionFnName) {
  let estado = iaPanelState[stateKey];
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <div class="ttl">${titulo}</div>
      ${renderResumenTramosParaCard(tramos)}
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : 'Rebalancear entre tramos ↗'}</button>
      ${resultado}
    </div>
  `;
}

function obtenerGastosVariablesPendientesMes() {
  return getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo === 'variable')
    .sort((a, b) => b.valor - a.valor);
}

function obtenerDiaReferenciaMesActivo() {
  let ahora = new Date();
  let { mes, anio } = parseMesKey(mesActivoGlobal);
  let mesIdx = ORDEN_MESES.indexOf(mes);
  let totalDias = new Date(anio, mesIdx + 1, 0).getDate();
  let mismoMes = ahora.getFullYear() === anio && ahora.getMonth() === mesIdx;
  if(mismoMes) return Math.min(Math.max(ahora.getDate(), 1), totalDias);
  return 1;
}

function obtenerGastosVariablesQuincena() {
  let todos = obtenerGastosVariablesPendientesMes();

  let qActiva = 'q1';
  let btnPre = document.getElementById('q-pre');
  let btnQ1 = document.getElementById('q-q1');
  let btnQ2 = document.getElementById('q-q2');
  if(btnPre && btnPre.classList.contains('on')) qActiva = 'pre';
  if(btnQ1 && btnQ1.classList.contains('on')) qActiva = 'q1';
  if(btnQ2 && btnQ2.classList.contains('on')) qActiva = 'q2';

  return todos.filter(c => {
    let dia = parseInt(c.dia, 10);
    if(dia === -1) dia = 1;
    if(qActiva === 'pre') return parseInt(c.dia, 10) === -1;
    if(qActiva === 'q1') return dia >= 1 && dia <= 14;
    return dia >= 15;
  });
}

function obtenerGastosVariablesSemana() {
  let todos = obtenerGastosVariablesPendientesMes();
  let semanas = obtenerSemanasDelMesActivo();
  if(!semanas.length) return [];
  let idx = Math.min(Math.max(semanaSeleccionadaIndex, 0), semanas.length - 1);
  let semanaActiva = semanas[idx] || semanas[0];
  return todos.filter(c => {
    let dia = parseInt(c.dia, 10);
    if(dia === -1) dia = 1;
    return semanaActiva.dias.includes(dia);
  });
}

function renderItemsIACard(items, emptyText) {
  if(!items.length) return `<div class="ia-row"><div class="meta">${escapeHTML(emptyText)}</div></div>`;
  return items.slice(0, 8).map(it => `
    <div class="ia-row">
      <div>
        <div class="nm">${escapeHTML(it.nombre)}</div>
        <div class="meta">Dia ${it.dia === -1 ? 'pre-mes' : it.dia}</div>
      </div>
      <div class="vl">${formatCOP(it.valor)}</div>
    </div>
  `).join('');
}

function buildIACardGastos(titulo, items, stateKey, actionFnName) {
  let cardExpandState = globalThis.__iaCardsExpandState;
  if(!(cardExpandState instanceof Set)) {
    cardExpandState = new Set();
    globalThis.__iaCardsExpandState = cardExpandState;
  }
  let cardKey = `ia-card-${stateKey}`;
  let expanded = cardExpandState.has(cardKey);

  let estado = iaPanelState[stateKey];
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';
  return `
    <div class="ia-card">
      <button class="ia-card-toggle" onclick="toggleExpandIACard('${cardKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="ttl">${titulo}</span>
        <span class="ia-card-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
      </button>
      ${expanded ? `
      <div class="ia-card-body">
      ${renderItemsIACard(items, `No pending expenses for ${titulo.toLowerCase()}.`)}
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analyzing...' : 'Analyze what I can reduce ↗'}</button>
      ${resultado}
      </div>
      ` : ''}
    </div>
  `;
}

function getEstadoIAPanelSimple(stateKey) {
  if(!iaPanelState[stateKey] || typeof iaPanelState[stateKey] !== 'object') {
    iaPanelState[stateKey] = { loading: false, error: '', result: '' };
  }
  return iaPanelState[stateKey];
}

function construirSnapshotMensualIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let ingresos = obtenerEventosIngresoDelMes(mesActivoGlobal).reduce((acc, e) => acc + (e.valor || 0), 0);
  let gastos = base.reduce((acc, c) => acc + (c.valor || 0), 0);
  let pendiente = base.reduce((acc, c) => acc + (!c.pagado ? (c.valor || 0) : 0), 0);
  let balance = ingresos - gastos;
  let ratioPendiente = 0;
  if(ingresos > 0) {
    ratioPendiente = pendiente / ingresos;
  } else if(pendiente > 0) {
    ratioPendiente = 1;
  }

  return {
    ingresos,
    gastos,
    pendiente,
    balance,
    ratioPendiente
  };
}

function generarAlertasDeficitTempranasIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let snapshot = construirSnapshotMensualIA(base);
  let semanas = obtenerResumenTramosSemanales(base);
  let alertas = [];

  let semanasDeficit = semanas.filter((s) => s.saldoCierre < 0);
  if(semanasDeficit.length) {
    let primera = semanasDeficit[0];
    alertas.push(`Riesgo semanal temprano: ${primera.nombre} cierra en ${formatCOP(primera.saldoCierre)}.`);
  }

  if(snapshot.balance < 0) {
    alertas.push(`Riesgo mensual: balance proyectado en deficit por ${formatCOP(Math.abs(snapshot.balance))}.`);
  }

  if(snapshot.ratioPendiente >= 0.8) {
    alertas.push(`Carga pendiente alta: ${Math.round(snapshot.ratioPendiente * 100)}% de ingresos comprometidos.`);
  }

  if(!alertas.length) {
    alertas.push('Sin alerta critica: no se detecta deficit semanal ni mensual con los datos actuales.');
  }

  let riesgoGlobal = 'bajo';
  if(snapshot.balance < 0 || semanasDeficit.length >= 2 || snapshot.ratioPendiente >= 0.95) riesgoGlobal = 'alto';
  else if(semanasDeficit.length || snapshot.ratioPendiente >= 0.8) riesgoGlobal = 'medio';

  return {
    riesgoGlobal,
    alertas,
    semanasDeficit,
    snapshot
  };
}

function construirPromptResumenMensualIA(snapshot, alertaInfo) {
  return [
    'Actua como asesor financiero personal y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Ingresos: ${formatCOP(snapshot.ingresos)}.`,
    `Gastos: ${formatCOP(snapshot.gastos)}.`,
    `Balance: ${formatCOP(snapshot.balance)}.`,
    `Pendiente por pagar: ${formatCOP(snapshot.pendiente)}.`,
    `Riesgo global detectado: ${alertaInfo.riesgoGlobal}.`,
    'Alertas detectadas:',
    alertaInfo.alertas.map((a, idx) => `${idx + 1}. ${a}`).join('\n'),
    'Entrega un resumen mensual entendible con 5 bullets maximo:',
    '- estado general',
    '- principal riesgo',
    '- accion inmediata sugerida',
    '- accion para siguiente semana',
    '- meta de control'
  ].join('\n');
}

function construirPromptAlertasDeficitIA(alertaInfo) {
  return [
    'Actua como monitor de riesgo financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Riesgo global actual: ${alertaInfo.riesgoGlobal}.`,
    'Alertas calculadas:',
    alertaInfo.alertas.map((a, idx) => `${idx + 1}. ${a}`).join('\n'),
    'Devuelve una alerta temprana operativa en maximo 4 bullets:',
    '- riesgo semanal',
    '- riesgo mensual',
    '- trigger concreto (cuando actuar)',
    '- mitigacion inmediata'
  ].join('\n');
}

function calcularMetricasEscenarioIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let snapshot = construirSnapshotMensualIA(base);
  let semanas = obtenerResumenTramosSemanales(base);
  let deficitSemanas = semanas.filter((s) => s.saldoCierre < 0).length;
  return {
    ...snapshot,
    deficitSemanas
  };
}

function simularEscenariosBaseIA(compromisosMes) {
  let base = (Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual()).map((c) => ({ ...c }));
  let escenarios = [];
  let antes = calcularMetricasEscenarioIA(base);

  let variablesPendientes = base
    .filter((c) => !c.pagado && c.tipo === 'variable')
    .sort((a, b) => (b.valor || 0) - (a.valor || 0));

  let topVariable = variablesPendientes[0] || null;
  if(topVariable) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === topVariable.id);
    if(target) {
      let original = Math.round(target.valor || 0);
      let nuevo = Math.max(1, Math.round(original * 0.9));
      target.valor = nuevo;
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Reducir 10% el mayor gasto variable',
        detalle: `${target.nombre}: ${formatCOP(original)} -> ${formatCOP(nuevo)}`,
        antes,
        despues
      });
    }
  }

  let moverQ2 = variablesPendientes.find((c) => {
    let dia = parseInt(c.dia, 10);
    return dia === -1 || (dia >= 1 && dia <= 14);
  });
  if(moverQ2) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === moverQ2.id);
    if(target) {
      let diaAntes = parseInt(target.dia, 10);
      target.dia = 20;
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Mover fecha de gasto fuerte hacia Q2',
        detalle: `${target.nombre}: dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} -> dia 20`,
        antes,
        despues
      });
    }
  }

  let mayorPendiente = base
    .filter((c) => !c.pagado)
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))[0] || null;
  if(mayorPendiente) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === mayorPendiente.id);
    if(target) {
      let diaAntes = parseInt(target.dia, 10);
      let diaBase = diaAntes === -1 ? 1 : diaAntes;
      let ultimoDiaMes = 31;
      let [mesNombre, anioTxt] = String(mesActivoGlobal || '').trim().split(/\s+/);
      let anio = parseInt(anioTxt, 10);
      let ordenMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      let mesIdx = ordenMeses.indexOf(mesNombre);
      if(!isNaN(anio) && mesIdx >= 0) {
        ultimoDiaMes = new Date(anio, mesIdx + 1, 0).getDate();
      }
      target.dia = Math.min(diaBase + 7, ultimoDiaMes);
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Posponer 7 dias la mayor obligacion pendiente',
        detalle: `${target.nombre}: dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} -> dia ${target.dia}`,
        antes,
        despues
      });
    }
  }

  return escenarios;
}

function formatearEscenariosIA(escenarios) {
  if(!Array.isArray(escenarios) || !escenarios.length) {
    return 'No se encontraron escenarios utiles con el contexto actual.';
  }

  return escenarios.map((esc, idx) => {
    let deltaBalance = (esc.despues.balance || 0) - (esc.antes.balance || 0);
    let mejoraSemanas = (esc.antes.deficitSemanas || 0) - (esc.despues.deficitSemanas || 0);
    return [
      `${idx + 1}) ${esc.nombre}`,
      `- Ajuste: ${esc.detalle}`,
      `- Balance: ${formatCOP(esc.antes.balance)} -> ${formatCOP(esc.despues.balance)} (${deltaBalance >= 0 ? '+' : ''}${formatCOP(deltaBalance)})`,
      `- Semanas en deficit: ${esc.antes.deficitSemanas} -> ${esc.despues.deficitSemanas} (mejora ${mejoraSemanas})`
    ].join('\n');
  }).join('\n\n');
}

function construirPromptEscenariosIA(escenarios) {
  return [
    'Actua como asesor financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    'Escenarios simulados:',
    formatearEscenariosIA(escenarios),
    'Resume en maximo 5 bullets:',
    '- cual escenario conviene primero',
    '- beneficio principal',
    '- riesgo de ejecutar ese cambio',
    '- plan de control para confirmar mejora'
  ].join('\n');
}

function buildIACardSimpleResultado(titulo, meta, stateKey, actionFnName, ctaText) {
  let cardExpandState = globalThis.__iaCardsExpandState;
  if(!(cardExpandState instanceof Set)) {
    cardExpandState = new Set();
    globalThis.__iaCardsExpandState = cardExpandState;
  }
  let cardKey = `ia-card-${stateKey}`;
  let expanded = cardExpandState.has(cardKey);

  let estado = getEstadoIAPanelSimple(stateKey);
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <button class="ia-card-toggle" onclick="toggleExpandIACard('${cardKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="ttl">${titulo}</span>
        <span class="ia-card-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
      </button>
      ${expanded ? `
      <div class="ia-card-body">
        <div class="ia-row" style="display:block;">
          <div class="meta">${escapeHTML(meta)}</div>
        </div>
        <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : ctaText}</button>
        ${resultado}
      </div>
      ` : ''}
    </div>
  `;
}

function obtenerMensajeIAValido(out) {
  if(!out || out.ok === false) {
    throw new Error((out && out.message) ? out.message : 'Sin respuesta valida desde IA.');
  }
  return out.message || 'Sin respuesta.';
}

async function pedirResumenMensualIA() {
  let stateKey = 'resumenMensual';
  let snapshot = construirSnapshotMensualIA(getCompromisosMesActual());
  let alertaInfo = generarAlertasDeficitTempranasIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  try {
    let prompt = construirPromptResumenMensualIA(snapshot, alertaInfo);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    iaPanelState[stateKey] = { loading: false, error: '', result: mensaje };
  } catch(_err) {
    let fallback = [
      `Estado general: ingresos ${formatCOP(snapshot.ingresos)}, gastos ${formatCOP(snapshot.gastos)}, balance ${formatCOP(snapshot.balance)}.`,
      `Pendiente por pagar: ${formatCOP(snapshot.pendiente)} (${Math.round(snapshot.ratioPendiente * 100)}% de ingresos).`,
      `Riesgo actual: ${alertaInfo.riesgoGlobal}.`,
      `Accion inmediata: ${alertaInfo.alertas[0] || 'Revisar top 3 gastos variables.'}`
    ].join('\n');
    iaPanelState[stateKey] = { loading: false, error: '', result: fallback };
  }

  renderIAPanelResumen();
}

async function analizarAlertasDeficitIA() {
  let stateKey = 'alertasDeficit';
  let alertaInfo = generarAlertasDeficitTempranasIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  try {
    let prompt = construirPromptAlertasDeficitIA(alertaInfo);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    iaPanelState[stateKey] = { loading: false, error: '', result: mensaje };
  } catch(_err) {
    let fallback = [`Riesgo global: ${alertaInfo.riesgoGlobal}.`]
      .concat(alertaInfo.alertas.map((a) => `- ${a}`))
      .join('\n');
    iaPanelState[stateKey] = { loading: false, error: '', result: fallback };
  }

  renderIAPanelResumen();
}

async function simularEscenariosIA() {
  let stateKey = 'simuladorEscenarios';
  let escenarios = simularEscenariosBaseIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  if(!escenarios.length) {
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: 'No hay escenarios simulables: revisa si existen obligaciones pendientes o gastos variables.'
    };
    renderIAPanelResumen();
    return;
  }

  try {
    let prompt = construirPromptEscenariosIA(escenarios);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    let detalle = formatearEscenariosIA(escenarios);
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: `${detalle}\n\nLectura IA:\n${mensaje}`
    };
  } catch(_err) {
    iaPanelState[stateKey] = { loading: false, error: '', result: formatearEscenariosIA(escenarios) };
  }

  renderIAPanelResumen();
}

function renderIAPanelResumen() {
  let nodo = document.getElementById('ia-panel-resumen');
  if(!nodo) return;

  actualizarEstadoAplicadoDesdeHistorialIA();
  let gastosMes = obtenerGastosVariablesPendientesMes();
  let st = getEstadoRecortesItemsMes();
  if(!Array.isArray(st.items)) st.items = [];

  nodo.innerHTML = `
    ${buildIACardSimpleResultado('Resumen mensual IA', 'Vista ejecutiva con ingresos, gastos, balance y riesgos del mes activo.', 'resumenMensual', 'pedirResumenMensualIA', 'Generar resumen mensual ↗')}
    ${buildIACardSimpleResultado('Alertas de deficit IA', 'Deteccion temprana de riesgo semanal y mensual para actuar antes del cierre.', 'alertasDeficit', 'analizarAlertasDeficitIA', 'Evaluar alertas tempranas ↗')}
    ${buildIACardSimpleResultado('Simulador de escenarios IA', 'Simula mover fecha o monto para estimar impacto en balance y semanas en deficit.', 'simuladorEscenarios', 'simularEscenariosIA', 'Simular escenarios de impacto ↗')}
    ${buildIACardGastos('Gastos este mes', gastosMes, 'gastosMes', 'analizarReduccionGastosMesIA')}
    ${buildIACardRecortesItemsMes(gastosMes, 'recortesItemsMes', 'analizarRecortesItemMesIA')}
    ${buildIACardHistorialIA()}
  `;
}

function renderIAPanelSemanal() {
  let nodo = document.getElementById('ia-panel-semanal');
  if(!nodo) return;
  let gastosSemana = obtenerGastosVariablesSemana();
  nodo.innerHTML = `
    ${buildIACardGastos('Gastos esta semana', gastosSemana, 'gastosSemana', 'analizarReduccionGastosSemanaIA')}
  `;
}

function renderIAPanelQuincena() {
  let nodo = document.getElementById('ia-panel-quincena');
  if(!nodo) return;
  let gastosQuincena = obtenerGastosVariablesQuincena();
  nodo.innerHTML = `
    ${buildIACardGastos('Gastos esta quincena', gastosQuincena, 'gastosQuincena', 'analizarReduccionGastosQuincenaIA')}
  `;

  if(typeof renderBalanceQuincena === 'function') {
    renderBalanceQuincena(getCompromisosMesActual());
  }
}

function renderIAPanelDeudas() {
  let nodo = document.getElementById('ia-panel-deudas');
  if(!nodo) return;

  let cardExpandState = globalThis.__iaCardsExpandState;
  if(!(cardExpandState instanceof Set)) {
    cardExpandState = new Set();
    globalThis.__iaCardsExpandState = cardExpandState;
  }
  let cardKey = 'ia-card-deudas';
  let expanded = cardExpandState.has(cardKey);

  let deudasPendientes = getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo !== 'credito' && /deuda|prestamo|pr[e\u00e9]stamo|vank|vecin/i.test(String(c.nombre || '')))
    .sort((a, b) => b.valor - a.valor);

  let lista = renderItemsIACard(deudasPendientes, 'No hay deudas pendientes detectadas para este mes.');
  let resultado = iaPanelState.deudas.result
    ? `<div class="ia-result ${iaPanelState.deudas.error ? 'error' : ''}">${escapeHTML(iaPanelState.deudas.result)}</div>`
    : '';

  nodo.innerHTML = `
    <div class="ia-card">
      <button class="ia-card-toggle" onclick="toggleExpandIACard('${cardKey}')" aria-expanded="${expanded ? 'true' : 'false'}">
        <span class="ttl">Deudas pendientes</span>
        <span class="ia-card-chevron" aria-hidden="true">${expanded ? '▾' : '▸'}</span>
      </button>
      ${expanded ? `
      <div class="ia-card-body">
        ${lista}
        <button class="ia-cta" onclick="pedirEstrategiaDeudasIA()" ${iaPanelState.deudas.loading ? 'disabled' : ''}>${iaPanelState.deudas.loading ? 'Analizando...' : 'Pedir estrategia para pagar deudas ↗'}</button>
        ${resultado}
      </div>
      ` : ''}
    </div>
  `;
}

function refreshIAPanels(scope = 'all') {
  if(scope === 'resumen') {
    renderIAPanelResumen();
    return;
  }
  if(scope === 'resumen-deudas') {
    renderIAPanelResumen();
    renderIAPanelDeudas();
    return;
  }
  if(scope === 'tramos') {
    renderIAPanelSemanal();
    renderIAPanelQuincena();
    return;
  }

  renderIAPanelResumen();
  renderIAPanelSemanal();
  renderIAPanelQuincena();
}
