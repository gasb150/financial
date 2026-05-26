// Render and navigation module extracted from app.js for maintainability.

(function initFinancialRenderModule(globalScope) {
  function renderLastSavedIndicator() {
    let node = document.getElementById('last-save-indicator');
    if(!node) return;

    let raw = localStorage.getItem(STORAGE_LAST_SAVE_KEY);
    if(!raw) {
      node.innerText = 'Ultimo guardado: sin registro aun.';
      return;
    }

    let dt = new Date(raw);
    if(isNaN(dt.getTime())) {
      node.innerText = 'Ultimo guardado: formato invalido.';
      return;
    }

    node.innerText = `Ultimo guardado: ${dt.toLocaleString('es-CO')}`;
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

  globalScope.FinancialRender = {
    renderLastSavedIndicator,
    changeDisplayedMonth,
    updateMonthSelectors,
    switchScreen,
    showQuincenaTab
  };
})(window);
