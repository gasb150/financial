// Fortnight balance rendering extracted from app.js.

function renderQuincenas(compromisosMes) {
  let preCont = document.getElementById('lista-pre-quincena');
  let q1Cont = document.getElementById('lista-q1-quincena');
  let q2Cont = document.getElementById('lista-q2-quincena');

  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let resumen = calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes);

  let q1CompsConOrigen = [
    ...resumen.preComps.map((c) => ({ ...c, __origenPreMes: true })),
    ...resumen.q1Comps.map((c) => ({ ...c, __origenPreMes: false }))
  ];

  renderBloquePreMesIntegrado(preCont, resumen.preComps);
  buildQuincenaHtml(q1Cont, q1CompsConOrigen, "Tramo de Cobros 1 (Días 1-14)", resumen.tramos[0].ingresos);
  buildQuincenaHtml(q2Cont, resumen.q2Comps, "Tramo de Cobros 2 (Días 15-31)", resumen.tramos[1].ingresos);
}

function calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes) {
  let eventos = Array.isArray(eventosIngresosMes) ? eventosIngresosMes : [];
  let comps = Array.isArray(compromisosMes) ? compromisosMes : [];

  let preComps = comps.filter(c => parseInt(c.dia, 10) === -1);
  let q1Comps = comps.filter(c => {
    let d = parseInt(c.dia, 10);
    return d >= 1 && d <= 14;
  });
  let q2Comps = comps.filter(c => parseInt(c.dia, 10) >= 15);

  let ingQ1 = eventos
    .filter(e => e.dia >= 1 && e.dia <= 14)
    .reduce((acc, e) => acc + e.valor, 0);
  let ingQ2 = eventos
    .filter(e => e.dia >= 15)
    .reduce((acc, e) => acc + e.valor, 0);

  let gastosPre = preComps.reduce((acc, c) => acc + c.valor, 0);
  let gastosQ1Nativos = q1Comps.reduce((acc, c) => acc + c.valor, 0);
  let gastosQ1 = gastosPre + gastosQ1Nativos;
  let gastosQ2 = q2Comps.reduce((acc, c) => acc + c.valor, 0);

  let saldoInicialQ1 = 0;
  let netoQ1 = ingQ1 - gastosQ1;
  let saldoCierreQ1 = saldoInicialQ1 + netoQ1;

  let saldoInicialQ2 = saldoCierreQ1;
  let netoQ2 = ingQ2 - gastosQ2;
  let saldoCierreQ2 = saldoInicialQ2 + netoQ2;

  return {
    preComps,
    q1Comps,
    q2Comps,
    tramos: [
      {
        id: 'q1',
        nombre: 'Q1',
        saldoInicial: saldoInicialQ1,
        ingresos: ingQ1,
        gastos: gastosQ1,
        gastosPreMes: gastosPre,
        gastosNativos: gastosQ1Nativos,
        neto: netoQ1,
        saldoCierre: saldoCierreQ1
      },
      {
        id: 'q2',
        nombre: 'Q2',
        saldoInicial: saldoInicialQ2,
        ingresos: ingQ2,
        gastos: gastosQ2,
        gastosPreMes: 0,
        gastosNativos: gastosQ2,
        neto: netoQ2,
        saldoCierre: saldoCierreQ2
      }
    ]
  };
}

function renderBloquePreMesIntegrado(container, preComps) {
  if(!container) return;
  let total = preComps.reduce((acc, c) => acc + c.valor, 0);
  if(preComps.length === 0) {
    container.innerHTML = `<div style="font-size:12px;color:var(--color-text-tertiary);">No hay cargos Pre-Mes este periodo.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong style="font-size:13px;">Pre-Mes integrado en Q1</strong>
      <span style="font-size:11px;color:var(--color-text-tertiary);">${preComps.length} item(s) · ${formatCOP(total)}</span>
    </div>
    <div class="rm" style="font-size:11px;color:var(--color-text-secondary);">Estos cargos ahora impactan dentro del bloque de gastos de Q1 y se marcan con badge de origen en el listado de Q1.</div>
  `;
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
    let origenBadge = c.__origenPreMes
      ? '<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#F4E9FF;color:#55308D;font-size:10px;">Viene de Pre-Mes</span>'
      : '';
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div><div>${nombreSeguro}</div>${origenBadge}</div>
        </div>
        <div class="ra neg">${formatCOP(c.valor)}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderBalanceQuincena(compromisosMes) {
  let cont = document.getElementById('balance-quincena-bloque');
  if(!cont) return;

  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
  let resumen = calcularResumenBalanceQuincena(eventosIngresosMes, compromisosMes);
  let tramos = resumen.tramos;
  let state = iaPanelState && iaPanelState.rebalanceQuincena
    ? iaPanelState.rebalanceQuincena
    : { loading: false, error: false, result: '' };

  let rowsHtml = tramos.map((t) => {
    let colorNeto = t.neto >= 0 ? '#1D9E75' : '#E24B4A';
    let extraQ1 = t.id === 'q1'
      ? `<div class="rm" style="font-size:10px;">Incluye Pre-Mes: ${formatCOP(t.gastosPreMes)} · Nativo Q1: ${formatCOP(t.gastosNativos)}</div>`
      : '';
    return `
      <div style="border:1px solid var(--color-border-secondary);border-radius:8px;padding:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:12px;">${t.nombre}</strong>
          <span style="font-size:11px;color:var(--color-text-tertiary);">Cierre: ${formatCOP(t.saldoCierre)}</span>
        </div>
        <div class="row"><div class="rn">Saldo inicial</div><div class="ra">${formatCOP(t.saldoInicial)}</div></div>
        <div class="row"><div class="rn">Ingresos</div><div class="ra pos">${formatCOP(t.ingresos)}</div></div>
        <div class="row"><div class="rn">Gastos</div><div class="ra neg">${formatCOP(t.gastos)}</div></div>
        ${extraQ1}
        <div class="row"><div class="rn">Neto</div><div class="ra" style="color:${colorNeto};font-weight:600;">${formatCOP(t.neto)}</div></div>
      </div>
    `;
  }).join('');

  let resultBox = state.result
    ? `<div class="rm" style="margin-top:8px;color:${state.error ? '#A32D2D' : 'var(--color-text-secondary)'};">${escapeHTML(state.result)}</div>`
    : '';
  let accionesBox = typeof renderAccionesRebalanceoIA === 'function'
    ? renderAccionesRebalanceoIA('quincena')
    : '';
  let hayDeficit = tramos.some((t) => t.saldoCierre < 0);
  let ctaRebalanceo = `<button class="btn-action btn-ia" data-action="rebalance-quincena-from-balance" ${state.loading ? 'disabled' : ''} style="width:100%;margin-top:4px;">
      ${state.loading ? 'Analizando rebalanceo...' : '<img src="./assets/icons/ai-badge.svg" class="btn-ia-icon" alt=""> Rebalancear entre tramos'}
    </button>`;
  let notaSinDeficit = hayDeficit
    ? ''
    : '<div class="rm" style="margin-top:8px;">Sin deficit en quincena. Puedes usar rebalanceo preventivo.</div>';

  cont.innerHTML = `
    ${rowsHtml}
    ${ctaRebalanceo}
    ${notaSinDeficit}
    ${resultBox}
    ${accionesBox}
  `;
}

function ejecutarRebalanceoQuincenaDesdeBalance() {
  if(typeof analizarRebalanceoQuincenaIA !== 'function') {
    alert('No se pudo iniciar el rebalanceo quincenal.');
    return;
  }

  let run = analizarRebalanceoQuincenaIA();
  if(run && typeof run.finally === 'function') {
    run.finally(() => {
      renderBalanceQuincena(getCompromisosMesActual());
    });
    return;
  }

  renderBalanceQuincena(getCompromisosMesActual());
}

// CALENDAR LOGIC AND CLICK INTERACTION
