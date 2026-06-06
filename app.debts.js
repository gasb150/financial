// Debt rendering and debt edit helpers extracted from app.js.

function eliminarCompromiso(id) {
  return window.FinancialActions.removeCompromiso(id);
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
    if(campo === 'diaPagoReal') {
      let txt = String(nuevoValor || '').trim();
      if(!txt) {
        comp.diaPagoReal = null;
      } else {
        let dpr = parseInt(txt, 10);
        comp.diaPagoReal = (!isNaN(dpr) && dpr >= 1 && dpr <= 31) ? dpr : null;
      }
    }
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

  // Prevent stale IDs from accumulating when debts are removed or month changes.
  deudasExpandState = new Set(
    [...deudasExpandState].filter((id) => deudasFiltradas.some((c) => String(c.id) === id))
  );

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

  let alertasVencimiento = construirAlertasVencimientoDeudas(compromisosMes || []);
  if(alertasVencimiento && (alertasVencimiento.vencidos.length > 0 || alertasVencimiento.proximos.length > 0)) {
    let resumenVencidos = alertasVencimiento.vencidos.length > 0
      ? `${alertasVencimiento.vencidos.length} vencido(s)`
      : 'Sin vencidos';
    let resumenProximos = alertasVencimiento.proximos.length > 0
      ? `${alertasVencimiento.proximos.length} próximo(s) a vencer en <= ${alertasVencimiento.umbralDias} días`
      : 'Sin vencimientos próximos';

    let muestraProximos = alertasVencimiento.proximos
      .slice(0, 3)
      .map((c) => `${escapeHTML(c.nombre)} (día ${c.dia})`)
      .join(' · ');

    container.innerHTML += `
      <div class="card" style="border-left:4px solid #BA7517;">
        <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Aviso de vencimientos</div>
        <div class="rm">${resumenVencidos} · ${resumenProximos}</div>
        ${muestraProximos ? `<div class="rm" style="margin-top:4px;">Próximos: ${muestraProximos}</div>` : ''}
      </div>
    `;
  }

  deudasFiltradas.forEach(c => {
    let nombreSeguro = escapeHTML(c.nombre);
    let tipoLabel = c.tipo === 'fijo' ? 'Fijo' : (c.tipo === 'credito' ? 'Crédito' : 'Variable');
    let tipoPillClass = c.tipo === 'fijo' ? 'pill-fijo' : (c.tipo === 'credito' ? 'pill-credito' : 'pill-variable');
    let diaNormalizado = parseInt(c.dia, 10) === -1 ? 1 : parseInt(c.dia, 10);
    let diaPagoReal = parseInt(c.diaPagoReal, 10);
    let diaPagoRealValido = !isNaN(diaPagoReal) && diaPagoReal >= 1 && diaPagoReal <= 31;
    let sem = obtenerSemanaParaDia(parseInt(c.dia, 10));
    let semTxt = sem ? sem.nombre.replace('Tramo Semanal ', 'S') : 'S/N';
    let card = document.createElement('div');
    card.className = `card deuda-card tipo-${c.tipo}`;
    if(c.pagado) card.style.opacity = '0.65';
    let pctBarra = c.tipo === 'credito' ? (((c.totales||12)-(c.faltantes||6))/(c.totales||12))*100 : 100;
    let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${c.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
    let colorBarra = c.pagado ? '#1D9E75' : '#E24B4A';
    let estadoCompactoIcon = c.pagado ? '●' : '○';
    let estadoCompactoTxt = c.pagado ? 'Pagado' : 'Pendiente';
    let deudaExpandida = deudasExpandState.has(String(c.id));
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
      ${deudaExpandida ? `
      <div class="deuda-toggle deuda-toggle-expanded">
        <div style="flex:1;min-width:0;">
          <div class="deuda-compact-top">
            <input type="text" value="${nombreSeguro}" class="input-inline deuda-name" onchange="modificarCompromisoPropiedad(${c.id}, 'nombre', this.value)">
            <input type="text" inputmode="numeric" value="${formatCOP(c.valor)}" class="input-inline deuda-valor money-input" onchange="modificarCompromisoPropiedad(${c.id}, 'valor', this.value)">
          </div>
          <div class="deuda-compact-meta">
            <span class="deuda-tipo-pill ${tipoPillClass}">${tipoLabel}</span>
            <span>${semTxt}</span>
            <span class="deuda-compact-status ${c.pagado ? 'paid' : 'pending'}" title="${estadoCompactoTxt}">${estadoCompactoIcon}</span>
          </div>
        </div>
        <button class="deuda-chevron-btn" onclick="toggleExpandDeuda(${c.id})" aria-expanded="true" title="Contraer detalle">
          <span class="deuda-chevron" aria-hidden="true">▾</span>
        </button>
      </div>
      ` : `
      <button class="deuda-toggle" onclick="toggleExpandDeuda(${c.id})" aria-expanded="false" title="Expandir detalle">
        <div style="flex:1;min-width:0;">
          <div class="deuda-compact-top">
            <div class="deuda-compact-name">${nombreSeguro}</div>
            <div class="deuda-compact-value">${formatCOP(c.valor)}</div>
          </div>
          <div class="deuda-compact-meta">
            <span class="deuda-tipo-pill ${tipoPillClass}">${tipoLabel}</span>
            <span>${semTxt}</span>
            <span class="deuda-compact-status ${c.pagado ? 'paid' : 'pending'}" title="${estadoCompactoTxt}">${estadoCompactoIcon}</span>
          </div>
        </div>
        <span class="deuda-chevron" aria-hidden="true">▸</span>
      </button>
      `}

      ${deudaExpandida ? `
      <div class="deuda-details">
        <div class="deuda-meta">
          <div>
            <label class="sl">Tipo</label>
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
            <label class="sl">Pago real (opcional)</label>
            <input type="number" value="${diaPagoRealValido ? diaPagoReal : ''}" min="1" max="31" placeholder="Auto" class="input-app" style="margin:0;padding:4px 6px;font-size:12px;" onchange="modificarCompromisoPropiedad(${c.id}, 'diaPagoReal', this.value)">
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
        <div class="rm" style="margin-top:4px;">Fecha real de pago: ${diaPagoRealValido ? `día ${diaPagoReal}` : 'sin definir (usa tentativa)'}</div>
        <div class="deuda-bar" style="margin-top:6px;"><div class="deuda-fill" style="width:${pctBarra}%;background:${colorBarra}"></div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-del btn-del-icon-only" onclick="eliminarCompromiso(${c.id})" title="Eliminar compromiso" aria-label="Eliminar compromiso"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
        </div>
      </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function obtenerMesKeyActualSistema() {
  let now = new Date();
  return `${ORDEN_MESES[now.getMonth()]} ${now.getFullYear()}`;
}

function construirAlertasVencimientoDeudas(compromisosMes, umbralDias = 3) {
  if(typeof window !== 'undefined' && window.FinancialDebtUseCases && typeof window.FinancialDebtUseCases.buildDebtDueAlerts === 'function') {
    return window.FinancialDebtUseCases.buildDebtDueAlerts({
      debts: compromisosMes,
      activeMonthKey: mesActivoGlobal,
      systemMonthKey: obtenerMesKeyActualSistema(),
      thresholdDays: umbralDias
    });
  }
  if(!Array.isArray(compromisosMes)) return null;
  if(mesActivoGlobal !== obtenerMesKeyActualSistema()) return null;

  let hoy = new Date().getDate();
  let pendientes = compromisosMes
    .filter((c) => !c.pagado)
    .map((c) => ({ ...c, dia: parseInt(c.dia, 10) }))
    .filter((c) => !isNaN(c.dia) && c.dia >= 1 && c.dia <= 31)
    .sort((a, b) => a.dia - b.dia);

  return {
    hoy,
    umbralDias,
    vencidos: pendientes.filter((c) => c.dia < hoy),
    proximos: pendientes.filter((c) => c.dia >= hoy && c.dia <= hoy + umbralDias)
  };
}
