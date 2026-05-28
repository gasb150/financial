const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const ACTIONS_JS = path.join(ROOT, 'app.actions.js');

test('toggleInstallmentFields changes cuotas block visibility by debt type', () => {
  const wrap = { style: { display: '' } };

  const ctx = loadFunctionsFromFile(ACTIONS_JS, ['toggleInstallmentFields'], {
    document: {
      getElementById: (id) => id === 'wrap-cuotas-add' ? wrap : null
    }
  });

  ctx.toggleInstallmentFields('credito');
  assert.equal(wrap.style.display, 'block');

  ctx.toggleInstallmentFields('fijo');
  assert.equal(wrap.style.display, 'none');
});

test('clearDebtDateFilter resets state and optionally skips render', () => {
  let renderCalls = 0;
  const fromInput = { value: '2' };
  const toInput = { value: '18' };

  const ctx = loadFunctionsFromFile(ACTIONS_JS, ['clearDebtDateFilter'], {
    filtroDiaDesde: 2,
    filtroDiaHasta: 18,
    getCompromisosMesActual: () => [{ id: 1 }],
    renderDeudasModulo: () => { renderCalls += 1; },
    document: {
      getElementById: (id) => {
        if (id === 'f-dia-desde') return fromInput;
        if (id === 'f-dia-hasta') return toInput;
        return null;
      }
    }
  });

  ctx.clearDebtDateFilter(true);
  assert.equal(ctx.filtroDiaDesde, null);
  assert.equal(ctx.filtroDiaHasta, null);
  assert.equal(fromInput.value, '');
  assert.equal(toInput.value, '');
  assert.equal(renderCalls, 0);

  ctx.clearDebtDateFilter(false);
  assert.equal(renderCalls, 1);
});

test('processNewExpense adds compromiso in quick mode and resets form values', () => {
  let initCalls = 0;
  let modeSwitch = null;
  let alertCalls = 0;

  const nodes = {
    'add-nombre': { value: 'Seguro hogar' },
    'add-valor': { value: '$450.000' },
    'add-dia': { value: '12' },
    'add-tipo-gasto': { value: 'credito' },
    'add-mes-destino': { value: 'Julio 2026' },
    'add-faltantes': { value: '4' },
    'add-totales': { value: '12' }
  };

  const appData = { compromisos: [] };

  const ctx = loadFunctionsFromFile(ACTIONS_JS, ['commitAppChange', 'isValidPositiveValue', 'isValidDayInMonth', 'processNewExpense'], {
    appData,
    modoAltaDeuda: 'rapido',
    mesActivoGlobal: 'Junio 2026',
    parseMontoInput: (v) => Number(String(v).replace(/[^\d]/g, '')),
    setModoAltaDeuda: (mode) => { modeSwitch = mode; },
    initApp: () => { initCalls += 1; },
    alert: () => { alertCalls += 1; },
    document: {
      getElementById: (id) => nodes[id] || null
    }
  });

  ctx.processNewExpense();

  assert.equal(alertCalls, 0);
  assert.equal(appData.compromisos.length, 1);
  assert.equal(typeof appData.compromisos[0].id, 'number');
  assert.equal(appData.compromisos[0].nombre, 'Seguro hogar');
  assert.equal(appData.compromisos[0].valor, 450000);
  assert.equal(appData.compromisos[0].dia, 12);
  assert.equal(appData.compromisos[0].pagado, false);
  assert.equal(appData.compromisos[0].tipo, 'credito');
  assert.equal(appData.compromisos[0].mesKey, 'Junio 2026');
  assert.equal(appData.compromisos[0].faltantes, 4);
  assert.equal(appData.compromisos[0].totales, 12);

  assert.equal(nodes['add-nombre'].value, '');
  assert.equal(nodes['add-valor'].value, '');
  assert.equal(nodes['add-dia'].value, '1');
  assert.equal(nodes['add-tipo-gasto'].value, 'variable');
  assert.equal(nodes['add-faltantes'].value, '6');
  assert.equal(nodes['add-totales'].value, '12');
  assert.equal(modeSwitch, 'rapido');
  assert.equal(initCalls, 1);
});

test('saveApiAIConfig preserves explicit zero limits', () => {
  let persistCalls = 0;
  let renderCalls = 0;

  const nodes = {
    'ia-api-endpoint': { value: 'https://api.example.com/v1/chat/completions' },
    'ia-api-provider': { value: 'openai' },
    'ia-api-model': { value: 'gpt-4.1-mini' },
    'ia-api-key': { value: '' },
    'ia-api-daily-tokens': { value: '0' },
    'ia-api-monthly-tokens': { value: '0' },
    'ia-api-daily-cop': { value: '0' },
    'ia-api-monthly-cop': { value: '0' },
    'ia-api-cost-1k': { value: '40' },
    'ia-test-result': { innerText: '' }
  };

  const appData = { iaConfig: {} };

  const ctx = loadFunctionsFromFile(ACTIONS_JS, ['saveApiAIConfig'], {
    appData,
    normalizarEndpointIAGateway: (value) => value.trim(),
    guardarApiKeySesionIA: () => {},
    persistAndStampNow: () => { persistCalls += 1; },
    renderConfigIA: () => { renderCalls += 1; },
    document: {
      getElementById: (id) => nodes[id] || null
    }
  });

  ctx.saveApiAIConfig();

  assert.equal(appData.iaConfig.apiDailyTokenLimit, 0);
  assert.equal(appData.iaConfig.apiMonthlyTokenLimit, 0);
  assert.equal(appData.iaConfig.apiDailyCopLimit, 0);
  assert.equal(appData.iaConfig.apiMonthlyCopLimit, 0);
  assert.equal(appData.iaConfig.apiEstimatedCopPer1kTokens, 40);
  assert.equal(persistCalls, 1);
  assert.equal(renderCalls, 1);
});

test('saveGoogleAuthConfig persists without mutating iaConfig.updatedAt', () => {
  let persistMainCalls = 0;
  let persistAuxCalls = 0;
  let renderCalls = 0;

  const nodes = {
    'google-oauth-client-id': { value: 'client-id-123' }
  };

  const appData = {
    iaConfig: { updatedAt: '2026-05-01T00:00:00.000Z' },
    googleAuth: { provider: 'google', clientId: '', scope: '', session: null, lastError: 'x' }
  };

  const ctx = loadFunctionsFromFile(ACTIONS_JS, ['saveGoogleAuthConfig'], {
    appData,
    GOOGLE_OAUTH_DEFAULT_SCOPE: 'email profile',
    persistAndStampNow: () => { throw new Error('should not call persistAndStampNow'); },
    persistirDataPrincipalConFallback: () => { persistMainCalls += 1; },
    persistirAuxiliaresConFallback: () => { persistAuxCalls += 1; },
    renderGoogleAuthConfig: () => { renderCalls += 1; },
    document: {
      getElementById: (id) => nodes[id] || null
    }
  });

  ctx.saveGoogleAuthConfig();

  assert.equal(appData.iaConfig.updatedAt, '2026-05-01T00:00:00.000Z');
  assert.equal(appData.googleAuth.clientId, 'client-id-123');
  assert.equal(appData.googleAuth.scope, 'email profile');
  assert.equal(appData.googleAuth.lastError, '');
  assert.equal(persistMainCalls, 1);
  assert.equal(persistAuxCalls, 1);
  assert.equal(renderCalls, 1);
});
