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

  const ctx = loadFunctionsFromFile(RENDER_JS, ['getTranslator', 'renderLastSavedIndicator'], {
    window: {
      FINANCIAL_I18N_DICTIONARY: {
        'es-CO': {
          'lastSave.none': 'Último guardado: sin registro aún.',
          'lastSave.invalid': 'Último guardado: formato inválido.'
        }
      }
    },
    appData: { locale: 'es-CO' },
    STORAGE_LAST_SAVE_KEY: 'last-save',
    document: {
      getElementById: (id) => id === 'last-save-indicator' ? node : null
    },
    localStorage: {
      getItem: () => storage.value
    }
  });

  ctx.renderLastSavedIndicator();
  assert.equal(node.innerText, 'Último guardado: sin registro aún.');

  storage.value = 'not-a-date';
  ctx.renderLastSavedIndicator();
  assert.equal(node.innerText, 'Último guardado: formato inválido.');
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

test('renderWeeklyMenu clears container when no weeks are available', () => {
  const container = { innerHTML: 'old-content' };

  const ctx = loadFunctionsFromFile(RENDER_JS, ['renderWeeklyMenu'], {
    semanaSeleccionadaIndex: 0,
    obtenerSemanasDelMesActivo: () => [],
    document: {
      getElementById: (id) => id === 'nav-semanas-botones' ? container : null
    }
  });

  ctx.renderWeeklyMenu();
  assert.equal(container.innerHTML, '');
});

test('renderWeeklyMenu resets out-of-range index and uses partial render on click', () => {
  const container = {
    innerHTML: '',
    buttons: [],
    appendChild(btn) { this.buttons.push(btn); }
  };

  let activeWeekCalls = 0;
  let iaPanelCalls = 0;
  let initCalls = 0;

  const weeks = [
    { nombre: 'Semana 1', dias: [1, 2], rango: '1-2' },
    { nombre: 'Semana 2', dias: [3, 4], rango: '3-4' }
  ];

  const ctx = loadFunctionsFromFile(RENDER_JS, ['renderWeeklyMenu'], {
    semanaSeleccionadaIndex: 10,
    obtenerSemanasDelMesActivo: () => weeks,
    getCompromisosMesActual: () => [{ id: 1 }],
    renderActiveWeek: () => { activeWeekCalls += 1; },
    renderIAPanelSemanal: () => { iaPanelCalls += 1; },
    initApp: () => { initCalls += 1; },
    document: {
      getElementById: (id) => id === 'nav-semanas-botones' ? container : null,
      createElement: () => ({
        className: '',
        innerText: '',
        onclick: null
      })
    }
  });

  ctx.renderWeeklyMenu();
  assert.equal(ctx.semanaSeleccionadaIndex, 0);
  assert.equal(container.buttons.length, 2);

  container.buttons[1].onclick();
  assert.equal(ctx.semanaSeleccionadaIndex, 1);
  assert.equal(activeWeekCalls, 1);
  assert.equal(iaPanelCalls, 1);
  assert.equal(initCalls, 0);
});

test('renderActiveWeek escapes week labels and sanitizes debt id in onclick', () => {
  const container = { innerHTML: '' };
  const weeks = [
    {
      nombre: '<img src=x onerror=alert(1)>',
      rango: '1-7<script>alert(1)</script>',
      dias: [1, 2, 3]
    }
  ];

  const compromisos = [
    { id: '7);alert(1)//', nombre: '<b>deuda</b>', dia: 1, pagado: false, valor: 1200 }
  ];

  const ctx = loadFunctionsFromFile(RENDER_JS, ['renderActiveWeek'], {
    semanaSeleccionadaIndex: 0,
    obtenerSemanasDelMesActivo: () => weeks,
    calcularBalanceSemanal: () => ({ ingresosSemana: 2000, gastosSemana: 1200, balanceSemana: 800 }),
    formatCOP: (n) => `$${n}`,
    escapeHTML: (v) => String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;'),
    document: {
      getElementById: (id) => id === 'lista-semana-activa' ? container : null
    }
  });

  ctx.renderActiveWeek(compromisos);

  assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(container.innerHTML, /1-7&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(container.innerHTML, /toggleCheckPago\(7\)/);
  assert.doesNotMatch(container.innerHTML, /alert\(1\)\//);
});
