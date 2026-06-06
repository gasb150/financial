// Static DOM event wiring and application startup extracted from app.js.

function procesarNuevoGasto() {
  return window.FinancialActions.processNewExpense();
}

function resetAFactory() {
  if(confirm("¿Resetear?")) { appData = JSON.parse(JSON.stringify(datosDefault)); initApp(); }
}

function registrarServiceWorker() {
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    // Fail silently; app should continue working without offline cache.
  });
}

function registrarEventosHtmlEstaticos() {
  if(htmlActionHandlersBound) return;
  htmlActionHandlersBound = true;

  document.addEventListener('click', (event) => {
    let el = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
    if(!el) return;

    let action = el.getAttribute('data-action');
    let value = el.getAttribute('data-value');

    if(action === 'switch-screen') {
      sw(value, el);
      return;
    }
    if(action === 'show-quincena') {
      showQ(value);
      return;
    }
    if(action === 'rebalance-quincena-from-balance') {
      ejecutarRebalanceoQuincenaDesdeBalance();
      return;
    }
    if(action === 'filter-debt') {
      cambiarFiltroDeuda(value);
      return;
    }
    if(action === 'clear-debt-date-filter') {
      limpiarFiltroFechaDeudas();
      return;
    }
    if(action === 'set-debt-entry-mode') {
      setModoAltaDeuda(value);
      return;
    }
    if(action === 'save-new-expense') {
      procesarNuevoGasto();
      return;
    }
    if(action === 'add-income') {
      agregarIngresoDinamico();
      return;
    }
    if(action === 'add-bonus') {
      agregarPrimaNoRecurrente();
      return;
    }
    if(action === 'install-pwa') {
      instalarAppPWA();
      return;
    }
    if(action === 'export-backup') {
      exportarRespaldoJSON();
      return;
    }
    if(action === 'open-import-backup') {
      let input = document.getElementById('import-backup-file');
      if(input) input.click();
      return;
    }
    if(action === 'restore-backup') {
      restaurarUltimoRespaldoLocal();
      return;
    }
    if(action === 'test-ai-mode') {
      probarIAConfigurada();
      return;
    }
    if(action === 'sync-drive-now') {
      sincronizarDriveAhora();
      return;
    }
    if(action === 'restore-drive-now') {
      recuperarDesdeDriveAhora();
      return;
    }
    if(action === 'logout-google-auth') {
      cerrarSesionGoogleAuth();
      return;
    }
    if(action === 'extend-timeline-year') {
      extenderAnioLineaTiempo();
      return;
    }
    if(action === 'reset-factory') {
      resetAFactory();
    }
  });

  document.addEventListener('change', (event) => {
    let el = event.target;
    if(!el || !el.getAttribute) return;

    let action = el.getAttribute('data-action');
    if(!action) return;

    if(action === 'change-month') {
      cambiarMesDeVisualizacion(el.value);
      return;
    }
    if(action === 'set-locale') {
      setAppLocale(el.value);
      initApp({ skipPersist: true, skipDataNormalization: true, skipLocaleInit: true });
      return;
    }
    if(action === 'debt-type-change') {
      onTipoGastoAltaChange(el.value);
      return;
    }
    if(action === 'apply-debt-date-filter') {
      aplicarFiltroFechaDeudas();
      return;
    }
    if(action === 'update-debt-preview') {
      actualizarPreviewNuevaDeuda();
      return;
    }
    if(action === 'import-backup-file') {
      importarRespaldoArchivo(event);
      return;
    }
    if(action === 'set-ai-mode') {
      setModoIA(el.value);
      return;
    }
    if(action === 'save-local-ai-config') {
      guardarConfigIALocal();
      return;
    }
    if(action === 'save-api-ai-config') {
      guardarConfigIAApi();
      return;
    }
    if(action === 'save-google-auth-config') {
      guardarConfigGoogleAuth();
    }
  });

  document.addEventListener('input', (event) => {
    let el = event.target;
    if(!el || !el.getAttribute) return;
    let action = el.getAttribute('data-action');
    if(action === 'update-debt-preview') {
      actualizarPreviewNuevaDeuda();
    }
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  let btn = document.getElementById('btn-install-app');
  if(btn) btn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  let btn = document.getElementById('btn-install-app');
  if(btn) btn.style.display = 'none';
});

window.onload = function() {
  registrarEventosHtmlEstaticos();

  if(window.FinancialI18n && typeof window.FinancialI18n.initializeLocale === 'function') {
    window.FinancialI18n.initializeLocale();
  }

  hidratarDataDesdeIndexedDB().finally(async () => {
    await procesarCallbackGoogleOAuthSiAplica();
    initApp();
    registrarServiceWorker();
  });
};
