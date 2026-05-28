// Render and navigation module extracted from app.js for maintainability.

(function initFinancialRenderModule(globalScope) {
  function getTranslator() {
    if(window.FinancialI18n && typeof window.FinancialI18n.t === 'function') {
      return window.FinancialI18n.t;
    }

    return (key, vars = {}) => {
      let locale = (appData && appData.locale) || 'es-CO';
      let externalDictionary = window.FINANCIAL_I18N_DICTIONARY || {};
      let localeDict = externalDictionary[locale] || externalDictionary['es-CO'] || {};
      let fallbackDict = externalDictionary['es-CO'] || {};
      let template = localeDict[key] || fallbackDict[key] || key;
      return Object.keys(vars).reduce((acc, varKey) => acc.replace(`{{${varKey}}}`, String(vars[varKey])), template);
    };
  }

  function resolvePreferredMonth() {
    if(mesesLineaTiempo.includes(mesActivoGlobal)) return mesActivoGlobal;
    if(mesesLineaTiempo.length > 0) return mesesLineaTiempo[0];
    if(typeof mesActivoGlobal === 'string' && mesActivoGlobal.trim() !== '') return mesActivoGlobal;
    return '';
  }

  function renderLastSavedIndicator() {
    let node = document.getElementById('last-save-indicator');
    if(!node) return;

    let tr = getTranslator();

    let raw = localStorage.getItem(STORAGE_LAST_SAVE_KEY);
    if(!raw) {
      node.innerText = tr('lastSave.none');
      return;
    }

    let dt = new Date(raw);
    if(isNaN(dt.getTime())) {
      node.innerText = tr('lastSave.invalid');
      return;
    }

    node.innerText = tr('lastSave.ok', { value: dt.toLocaleString(getCurrentLocaleForDate()) });
  }

  function getCurrentLocaleForDate() {
    let locale = (window.FinancialI18n && typeof window.FinancialI18n.getCurrentLocale === 'function')
      ? window.FinancialI18n.getCurrentLocale()
      : 'es-CO';
    return locale || 'es-CO';
  }

  function changeDisplayedMonth(newMonth) {
    mesActivoGlobal = newMonth;
    semanaSeleccionadaIndex = 0;
    diaSeleccionadoActivo = null;
    limpiarFiltroFechaDeudas(true);
    initApp();
  }

  function updateMonthSelectors() {
    let mainSelect = document.getElementById('global-mes-filtro');
    let formSelect = document.getElementById('add-mes-destino');
    let bonusSelect = document.getElementById('new-prima-mes');
    let mainCache = mainSelect.value || mesActivoGlobal;

    if(!mesesLineaTiempo.includes(mesActivoGlobal)) {
      mesActivoGlobal = resolvePreferredMonth();
    }

    mainSelect.innerHTML = '';
    if(formSelect) formSelect.innerHTML = '';
    if(bonusSelect) bonusSelect.innerHTML = '';

    mesesLineaTiempo.forEach(m => {
      mainSelect.innerHTML += `<option value="${m}">${m}</option>`;
      if(formSelect) formSelect.innerHTML += `<option value="${m}">${m}</option>`;
      if(bonusSelect) bonusSelect.innerHTML += `<option value="${m}">${m}</option>`;
    });

    let mainValue = mesesLineaTiempo.includes(mainCache)
      ? mainCache
      : (mesesLineaTiempo.includes(mesActivoGlobal) ? mesActivoGlobal : resolvePreferredMonth());

    mesActivoGlobal = mainValue;
    mainSelect.value = mainValue;

    if(!mainSelect.value && mainSelect.options.length > 0) {
      mainSelect.selectedIndex = 0;
      mesActivoGlobal = mainSelect.value;
    }

    if(formSelect && mesesLineaTiempo.includes(mesActivoGlobal)) {
      formSelect.value = mesActivoGlobal;
    }
    if(bonusSelect && !bonusSelect.value) bonusSelect.value = mesActivoGlobal;
  }

  function switchScreen(id, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
    document.getElementById('s-' + id).classList.add('on');
    btn.classList.add('on');
  }

  function composeDashboardRender(i18nT) {
    actualizarSelectoresDeMes();

    document.getElementById('tit-cal-dinamico').innerText = i18nT(
      'summary.flowCalendarTitle',
      { month: mesActivoGlobal },
      `Calendario de Flujo - ${mesActivoGlobal}`
    );
    document.getElementById('tit-semanas-dinamico').innerText = i18nT(
      'weeks.timelineTitle',
      { month: mesActivoGlobal },
      `Línea de Semanas - ${mesActivoGlobal}`
    );

    const titSobrante = document.getElementById('tit-sobrante-dinamico');
    if(titSobrante) {
      titSobrante.innerText = i18nT(
        'summary.surplusBaseMonthly',
        { value: formatCOP(0) },
        `Sobrante (Base mensual: ${formatCOP(0)})`
      );
    }

    let compromisosMesActual = getCompromisosMesActual();
    if(typeof compromisosMesGlobalCache !== 'undefined') {
      compromisosMesGlobalCache = compromisosMesActual;
    }

    let eventosIngresoMes = obtenerEventosIngresoDelMes(mesActivoGlobal);
    let totalIngresos = eventosIngresoMes.reduce((acc, e) => acc + e.valor, 0);
    let totalArrastreIngresos = eventosIngresoMes
      .filter(e => e.origen === 'arrastre' || e.origen === 'prima-arrastre')
      .reduce((acc, e) => acc + e.valor, 0);
    let totalNormalIngresos = totalIngresos - totalArrastreIngresos;
    let totalGastos = compromisosMesActual.reduce((acc, c) => acc + c.valor, 0);
    let totalPendiente = compromisosMesActual.reduce((acc, c) => acc + (c.pagado ? 0 : c.valor), 0);
    let balance = totalIngresos - totalGastos;
    const totalGastosPorc = totalIngresos > 0 ? ((totalGastos / totalIngresos) * 100).toFixed(0) : '100';

    document.getElementById('res-ingresos').innerText = formatCOP(totalIngresos);
    document.getElementById('res-ingresos-detalle').innerText = i18nT(
      'summary.incomeBreakdown',
      {
        normal: formatCOP(totalNormalIngresos),
        carry: formatCOP(totalArrastreIngresos)
      },
      `Normal: ${formatCOP(totalNormalIngresos)} · Arrastre: ${formatCOP(totalArrastreIngresos)}`
    );
    document.getElementById('res-gastos').innerText = formatCOP(totalGastos);
    document.getElementById('res-gastos-porc').innerText = i18nT(
      'summary.percentIncomeDynamic',
      { value: totalGastosPorc },
      `${totalGastosPorc}% del ingreso`
    );

    let balCard = document.getElementById('res-balance');
    balCard.innerText = formatCOP(balance);
    if(balance < 0) {
      balCard.style.color = '#E24B4A';
      document.getElementById('res-balance-text').innerText = i18nT(
        'summary.balanceDeficitPeriod',
        {},
        'Déficit en este periodo'
      );
      document.getElementById('alerta-deficit').style.display = 'flex';
      document.getElementById('alerta-b-text').innerText = i18nT(
        'summary.alertDeficitBody',
        {
          expenses: formatCOP(totalGastos),
          income: formatCOP(totalIngresos)
        },
        `Gastos: ${formatCOP(totalGastos)} vs Ingresos: ${formatCOP(totalIngresos)}.`
      );
    } else {
      balCard.style.color = '#1D9E75';
      document.getElementById('res-balance-text').innerText = i18nT(
        'summary.balanceSurplusPeriod',
        {},
        'Superávit en este periodo'
      );
      document.getElementById('alerta-deficit').style.display = 'none';
    }
    document.getElementById('res-pendiente').innerText = formatCOP(totalPendiente);
    renderSobrante(balance);
    renderIAPanelResumen();

    renderIngresosResumen();
    renderCalendario(compromisosMesActual);
    renderQuincenas(compromisosMesActual);
    if(typeof renderBalanceQuincena === 'function') {
      renderBalanceQuincena(compromisosMesActual);
    }
    renderDeudasModulo(compromisosMesActual);
    renderWeeklyMenu();
    renderActiveWeek(compromisosMesActual);
    renderSelectoresVigenciaIngreso();
    renderConfigIngresos();
    renderConfigPrimas();
    renderConfigIA();
    renderIAPanelSemanal();
    renderIAPanelQuincena();
    renderIAPanelDeudas();
    renderLastSavedIndicator();
    aplicarFormatoMonedaInputs();

    return { compromisosMesActual };
  }

  function showQuincenaTab(q) {
    ['pre','q1','q2'].forEach(k => {
      document.getElementById('qp-' + k).style.display = k === q ? 'block' : 'none';
      let btn = document.getElementById('q-' + k);
      if(btn) btn.classList.toggle('on', k === q);
    });
  }

  function renderWeeklyMenu() {
    let container = document.getElementById('nav-semanas-botones');
    if(!container) return;

    let weeks = obtenerSemanasDelMesActivo();
    if(!Array.isArray(weeks) || weeks.length === 0) {
      container.innerHTML = '';
      return;
    }

    if(semanaSeleccionadaIndex < 0 || semanaSeleccionadaIndex >= weeks.length) {
      semanaSeleccionadaIndex = 0;
    }

    container.innerHTML = '';
    weeks.forEach((week, idx) => {
      let btn = document.createElement('button');
      btn.className = `qb ${idx === semanaSeleccionadaIndex ? 'on' : ''}`;
      btn.innerText = `Tramo ${idx + 1}`;
      btn.onclick = function() {
        semanaSeleccionadaIndex = idx;
        renderWeeklyMenu();
        renderActiveWeek(typeof getCompromisosMesActual === 'function' ? getCompromisosMesActual() : []);
        if(typeof renderIAPanelSemanal === 'function') renderIAPanelSemanal();
      };
      container.appendChild(btn);
    });
  }

  function renderActiveWeek(compromisosMes) {
    let container = document.getElementById('lista-semana-activa');
    if(!container) return;

    let weeks = obtenerSemanasDelMesActivo();
    if(!Array.isArray(weeks) || weeks.length === 0) {
      container.innerHTML = '<div class="rm" style="padding:8px 0;">Sin semanas disponibles para este mes.</div>';
      return;
    }

    if(semanaSeleccionadaIndex < 0 || semanaSeleccionadaIndex >= weeks.length) {
      semanaSeleccionadaIndex = 0;
    }

    let selectedWeek = weeks[semanaSeleccionadaIndex];
    if(!selectedWeek) {
      container.innerHTML = '<div class="rm" style="padding:8px 0;">No se pudo calcular la semana activa.</div>';
      return;
    }

    let weeklySummary = weeks.map((week) => ({ ...week, ...calcularBalanceSemanal(compromisosMes, week) }));
    let carry = 0;
    let summaryWithCarry = weeklySummary.map((week) => {
      let opening = carry;
      let closing = opening + week.balanceSemana;
      carry = closing;
      return {
        ...week,
        saldoInicial: opening,
        saldoCierre: closing
      };
    });
    let activeWeekStats = summaryWithCarry[semanaSeleccionadaIndex];

    let weekDebts = compromisosMes.filter((debt) => {
      let dayNum = parseInt(debt.dia, 10);
      if(dayNum === -1) return semanaSeleccionadaIndex === 0;
      return selectedWeek.dias.includes(dayNum);
    });

    let html = '<div style="margin-bottom:8px"><strong>Balance semana a semana</strong></div>';
    html += '<div class="resumen-semanas">';
    html += '<div class="r h"><div>Semana</div><div>Ingresos</div><div>Gastos</div><div>Saldo cierre</div></div>';
    summaryWithCarry.forEach((week, idx) => {
      let cls = week.saldoCierre >= 0 ? 'badge-pos' : 'badge-neg';
      html += `<div class="r" style="background:${idx === semanaSeleccionadaIndex ? '#EEEDFE' : 'transparent'}">`;
      html += `<div>S${idx + 1}</div>`;
      html += `<div class="badge-pos">${formatCOP(week.ingresosSemana)}</div>`;
      html += `<div class="badge-neg">${formatCOP(week.gastosSemana)}</div>`;
      html += `<div class="${cls}">${formatCOP(week.saldoCierre)}</div>`;
      html += '</div>';
    });
    html += '</div>';

    let safeWeekName = escapeHTML(selectedWeek.nombre);
    let safeWeekRange = escapeHTML(selectedWeek.rango);
    html += `<div style="margin:10px 0 8px"><strong>${safeWeekName}</strong> (${safeWeekRange})</div>`;
    html += '<div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:8px;">';
    html += `Arrastre previo: <span class="${activeWeekStats.saldoInicial >= 0 ? 'pos' : 'neg'}">${formatCOP(activeWeekStats.saldoInicial)}</span> · `;
    html += `Ingresos: <span class="pos">${formatCOP(activeWeekStats.ingresosSemana)}</span> · `;
    html += `Gastos: <span class="neg">${formatCOP(activeWeekStats.gastosSemana)}</span> · `;
    html += `Neto semana: <span class="${activeWeekStats.balanceSemana >= 0 ? 'pos' : 'neg'}">${formatCOP(activeWeekStats.balanceSemana)}</span> · `;
    html += `Saldo cierre: <span class="${activeWeekStats.saldoCierre >= 0 ? 'pos' : 'neg'}">${formatCOP(activeWeekStats.saldoCierre)}</span>`;
    html += '</div>';

    let rebalanceState = (typeof iaPanelState === 'object' && iaPanelState && iaPanelState.rebalanceSemana)
      ? iaPanelState.rebalanceSemana
      : { loading: false, error: false, result: '' };
    let mostrarRebalanceoSemana = summaryWithCarry.some((week) => week.saldoCierre < 0);
    let resultado = rebalanceState.result
      ? `<div class="rm" style="margin:8px 0;color:${rebalanceState.error ? '#A32D2D' : 'var(--color-text-secondary)'};">${escapeHTML(rebalanceState.result)}</div>`
      : '';
    let acciones = typeof renderAccionesRebalanceoIA === 'function'
      ? renderAccionesRebalanceoIA('semana')
      : '';
    let notaSinDeficit = mostrarRebalanceoSemana
      ? ''
      : '<div class="rm" style="margin-top:6px;">No hay deficit semanal proyectado, pero puedes simular rebalanceo preventivo.</div>';
    html += `
      <div style="margin:6px 0 10px;">
        <button class="btn-action btn-ia" style="width:100%;" onclick="analizarRebalanceoSemanaIA()" ${rebalanceState.loading ? 'disabled' : ''}>${rebalanceState.loading ? 'Analizando rebalanceo...' : '<img src="./assets/icons/ai-badge.svg" class="btn-ia-icon" alt=""> Rebalancear entre semanas'}</button>
        ${notaSinDeficit}
        ${resultado}
        ${acciones}
      </div>
    `;

    if(weekDebts.length === 0) {
      html += '<div class="rm" style="padding:6px 0;">Sin obligaciones en esta semana.</div>';
    }

    weekDebts.forEach((debt) => {
      let safeName = escapeHTML(debt.nombre);
      let safeDebtId = parseInt(debt.id, 10);
      html += `<div class="row ${debt.pagado ? 'row-paid' : ''}">`;
      html += `<div class="rn"><input type="checkbox" class="chk-box" ${debt.pagado ? 'checked' : ''} onclick="toggleCheckPago(${Number.isFinite(safeDebtId) ? safeDebtId : 'null'})"> ${safeName}</div>`;
      html += `<div class="ra ${debt.pagado ? 'pos' : 'neg'}">${formatCOP(debt.valor)}</div>`;
      html += '</div>';
    });

    container.innerHTML = html;
  }

  globalScope.FinancialRender = {
    renderLastSavedIndicator,
    changeDisplayedMonth,
    updateMonthSelectors,
    switchScreen,
    composeDashboardRender,
    showQuincenaTab,
    renderWeeklyMenu,
    renderActiveWeek
  };
})(window);
