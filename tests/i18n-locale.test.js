const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const I18N_JS = path.join(ROOT, 'app.i18n.js');

test('normalizeLocale maps es/en variants to supported locales', () => {
  const ctx = loadFunctionsFromFile(I18N_JS, ['normalizeLocale']);

  assert.equal(ctx.normalizeLocale('es'), 'es-CO');
  assert.equal(ctx.normalizeLocale('es-MX'), 'es-CO');
  assert.equal(ctx.normalizeLocale('en_GB'), 'en-US');
  assert.equal(ctx.normalizeLocale('fr-FR'), 'es-CO');
});

test('detectLocaleFromEnvironment prefers navigator locale and falls back to timezone', () => {
  const ctx = loadFunctionsFromFile(I18N_JS, ['normalizeLocale', 'detectLocaleFromEnvironment']);

  assert.equal(
    ctx.detectLocaleFromEnvironment({ navigatorLanguage: 'en-GB', timeZone: 'America/Bogota' }),
    'en-US'
  );

  assert.equal(
    ctx.detectLocaleFromEnvironment({ navigatorLanguage: '', timeZone: 'America/Bogota' }),
    'es-CO'
  );

  assert.equal(
    ctx.detectLocaleFromEnvironment({ navigatorLanguage: '', timeZone: 'Europe/Berlin' }),
    'en-US'
  );
});

test('t returns translated value with variable interpolation', () => {
  const ctx = loadFunctionsFromFile(I18N_JS, ['t'], {
    appData: { locale: 'en-US' },
    DICTIONARY: {
      'es-CO': { 'lastSave.ok': 'Ultimo guardado: {{value}}' },
      'en-US': { 'lastSave.ok': 'Last saved: {{value}}' }
    },
    SUPPORTED_LOCALES: ['es-CO', 'en-US'],
    getCurrentLocale: () => 'en-US'
  });

  assert.equal(ctx.t('lastSave.ok', { value: '10:30 AM' }), 'Last saved: 10:30 AM');
});

test('t falls back to es-CO when key is missing in current locale', () => {
  const ctx = loadFunctionsFromFile(I18N_JS, ['t'], {
    appData: { locale: 'en-US' },
    DICTIONARY: {
      'es-CO': { 'summary.balanceMonth': 'Balance Mes' },
      'en-US': {}
    },
    SUPPORTED_LOCALES: ['es-CO', 'en-US'],
    getCurrentLocale: () => 'en-US'
  });

  assert.equal(ctx.t('summary.balanceMonth'), 'Balance Mes');
});

test('applyDeclarativeTranslations updates text and placeholders', () => {
  function buildNode(initialAttrs = {}) {
    return {
      attrs: { ...initialAttrs },
      textContent: '',
      getAttribute(name) {
        return this.attrs[name] || null;
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      }
    };
  }

  const textNode = buildNode({ 'data-i18n': 'summary.incomePeriod' });
  const placeholderNode = buildNode({ 'data-i18n-placeholder': 'debts.commitmentName.placeholder' });

  const ctx = loadFunctionsFromFile(I18N_JS, ['applyDeclarativeTranslations'], {
    document: {
      querySelectorAll(selector) {
        if(selector === '[data-i18n]') return [textNode];
        if(selector === '[data-i18n-placeholder]') return [placeholderNode];
        return [];
      }
    },
    t: (key) => ({
      'summary.incomePeriod': 'Period income',
      'debts.commitmentName.placeholder': 'Ex: Vehicle insurance'
    }[key] || key)
  });

  ctx.applyDeclarativeTranslations();

  assert.equal(textNode.textContent, 'Period income');
  assert.equal(placeholderNode.attrs.placeholder, 'Ex: Vehicle insurance');
});
