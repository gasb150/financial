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
