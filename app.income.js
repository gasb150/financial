// Income and summary rendering extracted from app.js.

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
  return window.FinancialActions.addDynamicIncome();
}

function eliminarIngreso(id) {
  return window.FinancialActions.removeIncome(id);
}

function renderConfigIngresos() {
  let container = document.getElementById('lista-config-ingresos');
  container.innerHTML = '';

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  const { anio: anioActivo, mes: mesNombreActivo } = parseMesKey(mesActivoGlobal);
  const mesIdxActivo = ORDEN_MESES.indexOf(mesNombreActivo);
  const diasMesActivo = new Date(anioActivo, mesIdxActivo + 1, 0).getDate();

  ingresosExpandState = new Set(
    [...ingresosExpandState].filter((id) => appData.ingresosList.some((i) => String(i.id) === id))
  );

  appData.ingresosList.forEach(i => {
    let nombreSeguro = escapeHTML(i.nombre);
    let desde = obtenerMesInicioIngreso(i);
    let hasta = obtenerMesFinIngreso(i);
    let ingresoExpandido = ingresosExpandState.has(String(i.id));
    let diasReales = obtenerDiasPagoIngresoEnMes(i, mesActivoGlobal);
    let tieneArrastre = diasReales.some((d) => d >= 29);
    let txtDay = i18nT('config.day', {}, 'Día');
    let txtImpactNextMonth = i18nT('income.impactNextMonthDay1', {}, 'día 1 del mes siguiente');
    let txtNoImpactThisMonth = i18nT('income.noImpactThisMonth', {}, 'sin impacto en este mes');
    let txtCarryoverBadge = i18nT('income.carryoverBadge', {}, 'Arrastre 29-31 -> día 1 del mes siguiente');
    let txtDirectImpactBadge = i18nT('income.directImpactBadge', {}, 'Impacto directo en el mismo mes');
    let txtSegment = i18nT('income.segmentAssignment', {}, 'Asignación de Tramo:');
    let txtPayDay = i18nT('income.payDay', {}, 'Día pago');
    let txtValidFrom = i18nT('config.validFrom', {}, 'Vigente desde');
    let txtValidTo = i18nT('config.validTo', {}, 'Vigente hasta');
    let txtRealPayDate = i18nT('income.realPayDateLabel', {}, 'Fecha real de pago:');
    let txtFlowImpactDate = i18nT('income.flowImpactDateLabel', {}, 'Fecha de impacto en flujo:');
    let txtExpand = i18nT('income.expandDetail', {}, 'Expandir detalle');
    let txtCollapse = i18nT('income.collapseDetail', {}, 'Contraer detalle');
    let txtIndefinite = i18nT('income.indefinite', {}, 'Indefinido');
    let txtDistQ1 = i18nT('config.dist.q1', {}, 'Entra en Quincena 1');
    let txtDistQ2 = i18nT('config.dist.q2', {}, 'Entra en Quincena 2');
    let txtDistBiweekly = i18nT('config.dist.biweekly', {}, 'Pago cada 14 días (quincenal real)');
    let txtDistSplit = i18nT('config.dist.all', {}, 'Ambas quincenas (50/50)');
    let txtBiweeklyShort = i18nT('income.biweeklyShort', {}, 'Quincenal real');
    let fechaRealTxt = diasReales.length
      ? diasReales.map((d) => `${txtDay} ${d}`).join(', ')
      : `${txtDay} ${normalizarDiaPagoDeMes(getDiaIngreso(i), anioActivo, mesIdxActivo, diasMesActivo)}`;
    let fechaImpactoTxt = diasReales.length
      ? diasReales.map((d) => (d >= 29 ? txtImpactNextMonth : `${txtDay} ${d}`)).join(', ')
      : txtNoImpactThisMonth;
    let arrastreTxt = tieneArrastre
      ? `<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#FCE7C6;color:#8A4B00;font-size:10px;">${txtCarryoverBadge}</span>`
      : `<span style="display:inline-block;margin-top:2px;padding:2px 6px;border-radius:10px;background:#E6F4EA;color:#1F6B42;font-size:10px;">${txtDirectImpactBadge}</span>`;
    let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}" ${desde === m ? 'selected' : ''}>${m}</option>`).join('');
    let opcionesHasta = `<option value="__indefinido__" ${!hasta ? 'selected' : ''}>${txtIndefinite}</option>` + mesesLineaTiempo.map(m => `<option value="${m}" ${hasta === m ? 'selected' : ''}>${m}</option>`).join('');
    let card = document.createElement('div');
    card.className = 'card ingreso-card';
    card.style.padding = '12px';
    card.style.marginBottom = '8px';
    card.innerHTML = `
      ${ingresoExpandido ? `
      <div class="ingreso-toggle ingreso-toggle-expanded">
        <div style="flex:1;min-width:0;">
          <div class="ingreso-compact-top">
            <input type="text" value="${nombreSeguro}" class="input-inline ingreso-name" onchange="modificarIngresoPropiedad(${i.id}, 'nombre', this.value)">
            <input type="text" inputmode="numeric" value="${formatCOP(i.valor)}" class="input-inline ingreso-value money-input" onchange="modificarIngresoPropiedad(${i.id}, 'valor', this.value)">
          </div>
          <div class="ingreso-compact-meta">
            <span>${i.periodo === 'biweekly' ? txtBiweeklyShort : (i.periodo === 'q1' ? 'Q1' : (i.periodo === 'q2' ? 'Q2' : 'Q1+Q2'))}</span>
            <span>${txtDay} ${getDiaIngreso(i)}</span>
          </div>
        </div>
        <button class="deuda-chevron-btn" onclick="toggleExpandIngreso(${i.id})" aria-expanded="true" title="${txtCollapse}"><span class="deuda-chevron" aria-hidden="true">▾</span></button>
      </div>
      ` : `
      <button class="ingreso-toggle" onclick="toggleExpandIngreso(${i.id})" aria-expanded="false" title="${txtExpand}">
        <div style="flex:1;min-width:0;">
          <div class="ingreso-compact-top">
            <div class="ingreso-compact-name">${nombreSeguro}</div>
            <div class="ingreso-compact-value">${formatCOP(i.valor)}</div>
          </div>
          <div class="ingreso-compact-meta">
            <span>${i.periodo === 'biweekly' ? txtBiweeklyShort : (i.periodo === 'q1' ? 'Q1' : (i.periodo === 'q2' ? 'Q2' : 'Q1+Q2'))}</span>
            <span>${txtDay} ${getDiaIngreso(i)}</span>
          </div>
        </div>
        <span class="deuda-chevron" aria-hidden="true">▸</span>
      </button>
      `}

      ${ingresoExpandido ? `
      <div class="ingreso-details">
        <div style="display:flex; gap:8px; align-items:end;">
          <div style="flex:1;">
          <label class="sl" style="display:block; margin-bottom:2px">${txtSegment}</label>
          <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'periodo', this.value)">
            <option value="q1" ${i.periodo === 'q1' ? 'selected' : ''}>${txtDistQ1}</option>
            <option value="q2" ${i.periodo === 'q2' ? 'selected' : ''}>${txtDistQ2}</option>
            <option value="biweekly" ${i.periodo === 'biweekly' ? 'selected' : ''}>${txtDistBiweekly}</option>
            <option value="todo" ${i.periodo === 'todo' ? 'selected' : ''}>${txtDistSplit}</option>
          </select>
          </div>
          <div style="width:92px;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtPayDay}</label>
            <input type="number" min="1" max="31" class="input-app" style="margin:0; padding:4px; font-size:12px;" value="${getDiaIngreso(i)}" onchange="modificarIngresoPropiedad(${i.id}, 'diaPago', this.value)">
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:end; margin-top:8px;">
          <div style="flex:1;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtValidFrom}</label>
            <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesInicio', this.value)">${opcionesDesde}</select>
          </div>
          <div style="flex:1;">
            <label class="sl" style="display:block; margin-bottom:2px">${txtValidTo}</label>
            <select class="input-app" style="margin:0; padding:4px; font-size:12px;" onchange="modificarIngresoPropiedad(${i.id}, 'mesFin', this.value)">${opcionesHasta}</select>
          </div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--color-text-secondary);line-height:1.4;">
          <div><strong>${txtRealPayDate}</strong> ${fechaRealTxt}</div>
          <div><strong>${txtFlowImpactDate}</strong> ${fechaImpactoTxt}</div>
          ${arrastreTxt}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button class="btn-del btn-del-icon-only" onclick="eliminarIngreso(${i.id})" title="Eliminar ingreso" aria-label="Eliminar ingreso"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
        </div>
      </div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

function renderSelectoresVigenciaIngreso() {
  let selDesde = document.getElementById('new-ing-desde');
  let selHasta = document.getElementById('new-ing-hasta');
  if(!selDesde || !selHasta) return;

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  let opcionesDesde = mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  let opcionesHasta = `<option value="__indefinido__">${i18nT('income.indefinite', {}, 'Indefinido')}</option>` + mesesLineaTiempo.map(m => `<option value="${m}">${m}</option>`).join('');
  selDesde.innerHTML = opcionesDesde;
  selHasta.innerHTML = opcionesHasta;

  if([...selDesde.options].some(o => o.value === mesActivoGlobal)) {
    selDesde.value = mesActivoGlobal;
  }
  selHasta.value = '__indefinido__';
}

function agregarPrimaNoRecurrente() {
  return window.FinancialActions.addOneOffBonus();
}

function eliminarPrima(id) {
  return window.FinancialActions.removeBonus(id);
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

  let i18nT = (key, vars = {}, fallback = key) => {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      let translated = window.FinancialI18n.t(key, vars);
      if(translated !== key && translated != null && translated !== '') return translated;
    }
    return fallback;
  };

  container.innerHTML = '';
  if(appData.primasList.length === 0) {
    container.innerHTML = `<div class="card" style="padding:12px;color:var(--color-text-tertiary);font-size:12px;">${i18nT('income.noBonusesYet', {}, 'No hay primas registradas aún.')}</div>`;
    return;
  }

  primasExpandState = new Set(
    [...primasExpandState].filter((id) => appData.primasList.some((p) => String(p.id) === id))
  );

  appData.primasList
    .slice()
    .sort((a, b) => mesKeyToIndex(a.mesKey) - mesKeyToIndex(b.mesKey))
    .forEach(p => {
      let nombreSeguro = escapeHTML(p.nombre);
      let mesOptions = mesesLineaTiempo.map(m => `<option value="${m}" ${p.mesKey === m ? 'selected' : ''}>${m}</option>`).join('');
      let primaExpandida = primasExpandState.has(String(p.id));
      let txtDay = i18nT('config.day', {}, 'Día');
      let txtBonus = i18nT('income.bonusLabel', {}, 'Prima');
      let txtPayDay = i18nT('income.payDay', {}, 'Día pago');
      let txtMonth = i18nT('income.monthLabel', {}, 'Mes');
      let txtExpand = i18nT('income.expandDetail', {}, 'Expandir detalle');
      let txtCollapse = i18nT('income.collapseDetail', {}, 'Contraer detalle');
      let card = document.createElement('div');
      card.className = 'card prima-card';
      card.style.padding = '12px';
      card.style.marginBottom = '8px';
      card.innerHTML = `
        ${primaExpandida ? `
        <div class="ingreso-toggle ingreso-toggle-expanded">
          <div style="flex:1;min-width:0;">
            <div class="ingreso-compact-top">
              <input type="text" value="${nombreSeguro}" class="input-inline ingreso-name" onchange="modificarPrimaPropiedad(${p.id}, 'nombre', this.value)">
              <input type="text" inputmode="numeric" value="${formatCOP(p.valor)}" class="input-inline ingreso-value money-input" onchange="modificarPrimaPropiedad(${p.id}, 'valor', this.value)">
            </div>
            <div class="ingreso-compact-meta">
              <span>${txtBonus}</span>
              <span>${txtDay} ${p.diaPago}</span>
            </div>
          </div>
          <button class="deuda-chevron-btn" onclick="toggleExpandPrima(${p.id})" aria-expanded="true" title="${txtCollapse}"><span class="deuda-chevron" aria-hidden="true">▾</span></button>
        </div>
        ` : `
        <button class="ingreso-toggle" onclick="toggleExpandPrima(${p.id})" aria-expanded="false" title="${txtExpand}">
          <div style="flex:1;min-width:0;">
            <div class="ingreso-compact-top">
              <div class="ingreso-compact-name">${nombreSeguro}</div>
              <div class="ingreso-compact-value">${formatCOP(p.valor)}</div>
            </div>
            <div class="ingreso-compact-meta">
              <span>${txtBonus}</span>
              <span>${txtDay} ${p.diaPago}</span>
            </div>
          </div>
          <span class="deuda-chevron" aria-hidden="true">▸</span>
        </button>
        `}

        ${primaExpandida ? `
        <div class="ingreso-details">
          <div style="display:flex; gap:8px; align-items:end;">
            <div style="width:88px;">
              <label class="sl" style="display:block; margin-bottom:2px;">${txtPayDay}</label>
              <input type="number" min="1" max="31" class="input-app" style="margin:0;padding:4px;font-size:12px;" value="${p.diaPago}" onchange="modificarPrimaPropiedad(${p.id}, 'diaPago', this.value)">
            </div>
            <div style="flex:1;">
              <label class="sl" style="display:block; margin-bottom:2px;">${txtMonth}</label>
              <select class="input-app" style="margin:0;padding:4px;font-size:12px;" onchange="modificarPrimaPropiedad(${p.id}, 'mesKey', this.value)">${mesOptions}</select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn-del btn-del-icon-only" onclick="eliminarPrima(${p.id})" title="Eliminar prima" aria-label="Eliminar prima"><img src="./assets/icons/trash.svg" class="btn-del-icon" alt=""></button>
          </div>
        </div>
        ` : ''}
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
