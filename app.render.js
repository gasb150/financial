// Render and navigation module extracted from app.js for maintainability.

(function initFinancialRenderModule(globalScope) {
  function renderLastSavedIndicator() {
    let node = document.getElementById('last-save-indicator');
    if(!node) return;

    let tr = (window.FinancialI18n && typeof window.FinancialI18n.t === 'function')
      ? window.FinancialI18n.t
      : (key, vars = {}) => {
        if(key === 'lastSave.none') return 'Ultimo guardado: sin registro aun.';
        if(key === 'lastSave.invalid') return 'Ultimo guardado: formato invalido.';
        if(key === 'lastSave.ok') return `Ultimo guardado: ${vars.value || ''}`;
        return key;
      };

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

    function resolvePreferredMonth() {
      if(mesesLineaTiempo.includes('Junio 2026')) return 'Junio 2026';
      return mesesLineaTiempo[0] || 'Junio 2026';
    }

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
    showQuincenaTab,
    renderWeeklyMenu,
    renderActiveWeek
  };
})(window);
