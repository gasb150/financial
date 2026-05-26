// Localization module with auto-detect and manual language switch.

(function initFinancialI18nModule(globalScope) {
  const LOCALE_STORAGE_KEY = 'financial_app_locale_v1';
  const SUPPORTED_LOCALES = ['es-CO', 'en-US'];

  const DICTIONARY = (() => {
    const externalDictionary = globalScope.FINANCIAL_I18N_DICTIONARY || {};
    return {
      'es-CO': {
        'app.greeting': 'Hola Tavo!',
        'app.title': 'Mis Finanzas',
        'app.trm': 'TRM: $4.180',
        'nav.summary': 'Resumen',
        'nav.weeks': 'Semanas',
        'nav.fortnights': 'Quincenas',
        'nav.debts': 'Deudas',
        'nav.settings': 'Config',
        'lang.label': 'Idioma',
        'lang.auto': 'Auto',
        'lang.es': 'Español',
        'lang.en': 'English',
        'lastSave.none': 'Último guardado: sin registro aún.',
        'lastSave.invalid': 'Último guardado: formato inválido.',
        'lastSave.ok': 'Último guardado: {{value}}',
        ...(externalDictionary['es-CO'] || {})
      },
      'en-US': {
        'app.greeting': 'Hi Tavo!',
        'app.title': 'My Finances',
        'app.trm': 'FX: COP 4,180',
        'nav.summary': 'Summary',
        'nav.weeks': 'Weeks',
        'nav.fortnights': 'Fortnights',
        'nav.debts': 'Debts',
        'nav.settings': 'Settings',
        'lang.label': 'Language',
        'lang.auto': 'Auto',
        'lang.es': 'Spanish',
        'lang.en': 'English',
        'lastSave.none': 'Last saved: no record yet.',
        'lastSave.invalid': 'Last saved: invalid format.',
        'lastSave.ok': 'Last saved: {{value}}',
        ...(externalDictionary['en-US'] || {})
      }
    };
  })();

  function normalizeLocale(localeRaw) {
    const raw = String(localeRaw || '').trim().replace('_', '-').toLowerCase();
    if(!raw) return 'es-CO';
    if(raw.startsWith('es')) return 'es-CO';
    if(raw.startsWith('en')) return 'en-US';
    return 'es-CO';
  }

  function detectLocaleFromEnvironment(env = {}) {
    const navigatorLanguages = Array.isArray(env.navigatorLanguages) ? env.navigatorLanguages : [];
    const navigatorLanguage = String(env.navigatorLanguage || '').trim();
    const timeZone = String(env.timeZone || '').trim();

    const firstNavigatorLocale = navigatorLanguages.find(Boolean) || navigatorLanguage;
    if(firstNavigatorLocale) return normalizeLocale(firstNavigatorLocale);

    if(timeZone.startsWith('America/')) return 'es-CO';
    return 'en-US';
  }

  function getStoredLocale() {
    try {
      const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
      if(!raw) return null;
      return normalizeLocale(raw);
    } catch(_e) {
      return null;
    }
  }

  function resolveInitialLocale() {
    const stored = getStoredLocale();
    if(stored && SUPPORTED_LOCALES.includes(stored)) return stored;

    const tz = (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions)
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : '';

    const detected = detectLocaleFromEnvironment({
      navigatorLanguages: navigator.languages,
      navigatorLanguage: navigator.language,
      timeZone: tz
    });

    if(SUPPORTED_LOCALES.includes(detected)) return detected;
    return 'es-CO';
  }

  function getCurrentLocale() {
    if(SUPPORTED_LOCALES.includes(appData && appData.locale)) return appData.locale;
    return 'es-CO';
  }

  function t(key, vars = {}) {
    const locale = getCurrentLocale();
    const dict = DICTIONARY[locale] || DICTIONARY['es-CO'];
    const fallback = DICTIONARY['es-CO'][key] || key;
    let text = dict[key] || fallback;

    Object.keys(vars).forEach((k) => {
      text = text.replace(`{{${k}}}`, String(vars[k]));
    });

    return text;
  }

  function persistLocale(locale) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch(_e) {}
  }

  function applyDeclarativeTranslations() {
    if(typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if(!key) return;
      el.setAttribute('placeholder', t(key));
    });
  }

  function applyStaticTranslations() {
    if(document && document.documentElement) {
      document.documentElement.lang = getCurrentLocale();
    }

    const greeting = document.getElementById('app-greeting');
    const title = document.getElementById('app-title');
    const trm = document.getElementById('app-trm');

    if(greeting) greeting.innerText = t('app.greeting');
    if(title) title.innerText = t('app.title');
    if(trm) trm.innerText = t('app.trm');

    const navSummary = document.getElementById('nav-summary-label');
    const navWeeks = document.getElementById('nav-weeks-label');
    const navFortnights = document.getElementById('nav-fortnights-label');
    const navDebts = document.getElementById('nav-debts-label');
    const navSettings = document.getElementById('nav-settings-label');

    if(navSummary) navSummary.innerText = t('nav.summary');
    if(navWeeks) navWeeks.innerText = t('nav.weeks');
    if(navFortnights) navFortnights.innerText = t('nav.fortnights');
    if(navDebts) navDebts.innerText = t('nav.debts');
    if(navSettings) navSettings.innerText = t('nav.settings');

    const langLabel = document.getElementById('lang-switch-label');
    if(langLabel) langLabel.innerText = t('lang.label');

    const selector = document.getElementById('lang-switch');
    if(selector) {
      const optAuto = selector.querySelector('option[value="auto"]');
      const optEs = selector.querySelector('option[value="es-CO"]');
      const optEn = selector.querySelector('option[value="en-US"]');
      if(optAuto) optAuto.textContent = t('lang.auto');
      if(optEs) optEs.textContent = t('lang.es');
      if(optEn) optEn.textContent = t('lang.en');
    }

    applyDeclarativeTranslations();
  }

  function setupLanguageSwitcher() {
    const selector = document.getElementById('lang-switch');
    if(!selector) return;

    const current = getCurrentLocale();
    selector.value = current;
  }

  function setAppLocale(localeRaw, options = {}) {
    const locale = normalizeLocale(localeRaw);
    if(!appData || typeof appData !== 'object') return locale;

    appData.locale = locale;
    if(options.persist !== false) {
      persistLocale(locale);
      if(typeof persistirDataPrincipalConFallback === 'function') {
        persistirDataPrincipalConFallback();
      }
      if(typeof persistirAuxiliaresConFallback === 'function') {
        persistirAuxiliaresConFallback(new Date().toISOString());
      }
    }

    applyStaticTranslations();
    setupLanguageSwitcher();
    return locale;
  }

  function initializeLocale() {
    if(!appData || typeof appData !== 'object') return;
    if(!SUPPORTED_LOCALES.includes(appData.locale)) {
      appData.locale = resolveInitialLocale();
    }
    applyStaticTranslations();
    setupLanguageSwitcher();
  }

  globalScope.setAppLocale = function(localeRaw) {
    if(localeRaw === 'auto') {
      return setAppLocale(resolveInitialLocale());
    }
    return setAppLocale(localeRaw);
  };

  globalScope.FinancialI18n = {
    supportedLocales: SUPPORTED_LOCALES,
    normalizeLocale,
    detectLocaleFromEnvironment,
    resolveInitialLocale,
    initializeLocale,
    getCurrentLocale,
    setAppLocale,
    t,
    applyDeclarativeTranslations,
    applyStaticTranslations,
    setupLanguageSwitcher
  };
})(window);
