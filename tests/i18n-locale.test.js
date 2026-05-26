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
