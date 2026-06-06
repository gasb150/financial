(function(globalScope) {
  function showToast(message, duration = 2500, id = 'toast-cache') {
    const toast = document.getElementById(id);
    if(!toast) return;
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
  }

  function showI18nToast(i18nKey, duration = 2500, id = 'toast-cache') {
    const translate = globalScope.FinancialI18n && typeof globalScope.FinancialI18n.t === 'function'
      ? globalScope.FinancialI18n.t
      : (key) => key;
    showToast(translate(i18nKey), duration, id);
  }

  function clearStaticCacheAndReload() {
    if(!('caches' in globalScope)) return;
    caches.keys().then((keys) => {
      Promise.all(keys.filter((key) => key.startsWith('finanzas-cache')).map((key) => caches.delete(key)))
        .then(() => {
          showI18nToast('config.cacheCleared');
          setTimeout(() => location.reload(), 1200);
        });
    });
  }

  function setupCacheClearButton() {
    const button = document.getElementById('btn-clear-cache');
    if(button) button.onclick = clearStaticCacheAndReload;
  }

  function setupServiceWorkerUpdateToast() {
    if(!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((registration) => {
      if(!registration) return;
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if(newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const toast = document.getElementById('toast-update');
            if(toast) toast.style.display = 'block';
            const button = document.getElementById('btn-update-app');
            if(button) {
              button.onclick = () => {
                newWorker.postMessage({ action: 'skipWaiting' });
                globalScope.location.reload();
              };
            }
          }
        });
      });
    });
  }

  function initializePwaBootstrap() {
    setupCacheClearButton();
    setupServiceWorkerUpdateToast();
  }

  globalScope.FinancialPwaBootstrap = {
    showToast,
    showI18nToast,
    clearStaticCacheAndReload,
    setupCacheClearButton,
    setupServiceWorkerUpdateToast,
    initializePwaBootstrap
  };
})(window);
