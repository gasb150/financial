const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const RENDER_JS = path.join(ROOT, 'app.render.js');

test('changeDisplayedMonth updates state and triggers re-render flow', () => {
  let filterReset = false;
  let initCalled = false;

  const ctx = loadFunctionsFromFile(RENDER_JS, ['changeDisplayedMonth'], {
    mesActivoGlobal: 'Mayo 2026',
    semanaSeleccionadaIndex: 2,
    diaSeleccionadoActivo: 15,
    limpiarFiltroFechaDeudas: (force) => { filterReset = force === true; },
    initApp: () => { initCalled = true; }
  });

  ctx.changeDisplayedMonth('Junio 2026');

  assert.equal(ctx.mesActivoGlobal, 'Junio 2026');
  assert.equal(ctx.semanaSeleccionadaIndex, 0);
  assert.equal(ctx.diaSeleccionadoActivo, null);
  assert.equal(filterReset, true);
  assert.equal(initCalled, true);
});

test('renderLastSavedIndicator handles no data and invalid date cases', () => {
  const node = { innerText: '' };
  const storage = { value: null };

  const ctx = loadFunctionsFromFile(RENDER_JS, ['renderLastSavedIndicator'], {
    window: {},
    STORAGE_LAST_SAVE_KEY: 'last-save',
    document: {
      getElementById: (id) => id === 'last-save-indicator' ? node : null
    },
    localStorage: {
      getItem: () => storage.value
    }
  });

  ctx.renderLastSavedIndicator();
  assert.equal(node.innerText, 'Ultimo guardado: sin registro aun.');

  storage.value = 'not-a-date';
  ctx.renderLastSavedIndicator();
  assert.equal(node.innerText, 'Ultimo guardado: formato invalido.');
});

test('showQuincenaTab toggles display and button states by active tab', () => {
  const makeButton = () => ({
    state: false,
    classList: {
      toggle: function(_name, on) { this.__owner.state = !!on; },
      __owner: null
    }
  });

  const preBtn = makeButton(); preBtn.classList.__owner = preBtn;
  const q1Btn = makeButton(); q1Btn.classList.__owner = q1Btn;
  const q2Btn = makeButton(); q2Btn.classList.__owner = q2Btn;

  const nodes = {
    'qp-pre': { style: { display: '' } },
    'qp-q1': { style: { display: '' } },
    'qp-q2': { style: { display: '' } },
    'q-pre': preBtn,
    'q-q1': q1Btn,
    'q-q2': q2Btn
  };

  const ctx = loadFunctionsFromFile(RENDER_JS, ['showQuincenaTab'], {
    document: {
      getElementById: (id) => nodes[id] || null
    }
  });

  ctx.showQuincenaTab('q1');

  assert.equal(nodes['qp-pre'].style.display, 'none');
  assert.equal(nodes['qp-q1'].style.display, 'block');
  assert.equal(nodes['qp-q2'].style.display, 'none');

  assert.equal(preBtn.state, false);
  assert.equal(q1Btn.state, true);
  assert.equal(q2Btn.state, false);
});
