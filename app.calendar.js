// Calendar and daily view rendering extracted from app.js.

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
  let mapaPagosRealesCompromisos = {};
  compromisosMes.forEach(c => {
    let d = parseInt(c.dia); 
    if (d === -1) d = 1; // Displays fixed pre-month charges on day 1.
    if (!mapaDias[d]) mapaDias[d] = [];
    mapaDias[d].push(c);

    let diaReal = parseInt(c.diaPagoReal, 10);
    if(!isNaN(diaReal) && diaReal >= 1 && diaReal <= 31) {
      if(!mapaPagosRealesCompromisos[diaReal]) mapaPagosRealesCompromisos[diaReal] = [];
      mapaPagosRealesCompromisos[diaReal].push(c);
    }
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

      if(mapaPagosRealesCompromisos[dia] && mapaPagosRealesCompromisos[dia].length > 0) {
        let realMark = document.createElement('div');
        realMark.className = 'cal-pay-mark';
        realMark.style.right = '20px';
        realMark.style.background = '#136F63';
        realMark.innerText = 'R';
        realMark.title = 'Compromisos con fecha real de pago';
        item.appendChild(realMark);
      }

    // If the day has assigned financial commitments.
    if(mapaDias[dia] && mapaDias[dia].length > 0) {
      let todosPagados = mapaDias[dia].every(c => c.pagado);
      let dot = document.createElement('div'); 
      // Requested behavior: red when debt exists, green when the whole day is paid.
      dot.className = `cal-dot ${todosPagados ? 'all-paid' : 'pending'}`;
      item.appendChild(dot);
    }

    // Evento Click para desplegar o cerrar la vista diaria
    item.onclick = function() {
      if(diaSeleccionadoActivo === dia) {
        diaSeleccionadoActivo = null; // Close when clicking the active day again.
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

function obtenerCompromisosConPagoRealDelDia(mesKey, diaObjetivo) {
  return appData.compromisos
    .filter((c) => c.mesKey === mesKey)
    .filter((c) => {
      let diaReal = parseInt(c.diaPagoReal, 10);
      return !isNaN(diaReal) && diaReal === diaObjetivo;
    });
}

// NUEVO: SISTEMA DE DESPLIEGUE DE LA VISTA DIARIA
function renderVistaDiaria(compromisosMes) {
  let secTitulo = document.getElementById('sec-vista-diaria');
  let cardContenedor = document.getElementById('card-vista-diaria');

  // Filter commitments for the selected day.
  let deEsteDia = compromisosMes.filter(c => {
    let d = parseInt(c.dia);
    if(d === -1 && diaSeleccionadoActivo === 1) return true; // Include fixed pre-month commitments on day 1.
    return d === diaSeleccionadoActivo;
  });

  // Filter income entering on this day, including bonuses and carryovers.
  let ingresosDia = obtenerEventosIngresoDelMes(mesActivoGlobal)
    .filter(e => e.dia === diaSeleccionadoActivo);
  let pagosRealesDiferidosDia = obtenerPagosRealesDiferidosDelDia(mesActivoGlobal, diaSeleccionadoActivo);
  let compromisosPagoRealDia = obtenerCompromisosConPagoRealDelDia(mesActivoGlobal, diaSeleccionadoActivo)
    .filter((c) => {
      let diaTentativo = parseInt(c.dia, 10);
      if(diaTentativo === -1) diaTentativo = 1;
      return diaTentativo !== diaSeleccionadoActivo;
    });

  secTitulo.innerText = `Detalle del Día ${diaSeleccionadoActivo} de ${mesActivoGlobal}`;
  secTitulo.style.display = 'flex';
  cardContenedor.style.display = 'block';

  if(deEsteDia.length === 0 && ingresosDia.length === 0 && pagosRealesDiferidosDia.length === 0 && compromisosPagoRealDia.length === 0) {
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

  if(compromisosPagoRealDia.length > 0) {
    html += `<div style="font-size:11px; color:var(--color-text-tertiary); margin-bottom:8px;">Compromisos con pago real hoy (fecha tentativa distinta):</div>`;
    compromisosPagoRealDia.forEach((c) => {
      let nombreSeguro = escapeHTML(c.nombre);
      let diaTentativo = parseInt(c.dia, 10);
      if(diaTentativo === -1) diaTentativo = 1;
      html += `
        <div class="row">
          <div class="rn"><i class="ti ti-calendar-event"></i> ${nombreSeguro}</div>
          <div class="ra neg">${formatCOP(c.valor)} <span class="rm">(impacta día ${diaTentativo})</span></div>
        </div>
      `;
    });
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
    let diaReal = parseInt(c.diaPagoReal, 10);
    let diaRealTxt = (!isNaN(diaReal) && diaReal >= 1 && diaReal <= 31)
      ? `Pago real: día ${diaReal}`
      : 'Pago real: usa fecha tentativa';
    html += `
      <div class="row ${c.pagado ? 'row-paid' : ''}">
        <div class="rn">
          <input type="checkbox" class="chk-box" ${c.pagado ? 'checked' : ''} onclick="toggleCheckPago(${c.id})">
          <div>
            <div style="font-size:13px; font-weight:500;">${nombreSeguro}</div>
            <div class="rm" style="text-transform: capitalize;">${c.tipo} · ${diaRealTxt}</div>
          </div>
        </div>
        <div class="ra ${c.pagado ? 'pos' : 'neg'}" style="font-size:13px;">${formatCOP(c.valor)}</div>
      </div>
    `;
  });

  cardContenedor.innerHTML = html;
}

function ocultarVistaDiariaDOM() {
  let secTitulo = document.getElementById('sec-vista-diaria');
  let cardContenedor = document.getElementById('card-vista-diaria');
  if(secTitulo) secTitulo.style.display = 'none';
  if(cardContenedor) cardContenedor.style.display = 'none';
}
