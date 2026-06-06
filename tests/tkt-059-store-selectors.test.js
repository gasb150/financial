const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const STORE_JS = path.join(ROOT, 'src/app/store/appStore.js');
const SELECTORS_JS = path.join(ROOT, 'src/app/store/selectors.js');

function loadStoreModules() {
  const ctx = {
    window: {},
    Set,
    Array,
    Object,
    String,
    console
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(fs.readFileSync(STORE_JS, 'utf8'), ctx, { filename: STORE_JS });
  vm.runInNewContext(fs.readFileSync(SELECTORS_JS, 'utf8'), ctx, { filename: SELECTORS_JS });
  return ctx.window;
}

test('app store updates state and notifies subscribers', () => {
  const { FinancialAppStore } = loadStoreModules();
  const store = FinancialAppStore.createAppStore({ activeMonthKey: 'Junio 2026' });
  let observed = null;

  const unsubscribe = store.subscribe((state) => {
    observed = state;
  });

  store.setState({ selectedDay: 6 });

  assert.equal(store.getState().activeMonthKey, 'Junio 2026');
  assert.equal(store.getState().selectedDay, 6);
  assert.equal(observed.selectedDay, 6);

  unsubscribe();
  store.setState({ selectedDay: 7 });
  assert.equal(observed.selectedDay, 6);
});

test('selectors return current-month debts without mutating app data', () => {
  const { FinancialAppStore, FinancialSelectors } = loadStoreModules();
  const debts = [
    { id: 1, mesKey: 'Junio 2026', valor: 100 },
    { id: 2, mesKey: 'Julio 2026', valor: 200 },
    { id: 3, mesKey: 'Junio 2026', valor: 300 }
  ];
  const store = FinancialAppStore.createAppStore({
    activeMonthKey: 'Junio 2026',
    appData: { compromisos: debts },
    monthsTimeline: ['Junio 2026']
  });

  const currentMonthDebts = store.select(FinancialSelectors.getCurrentMonthDebts, []);
  const timeline = store.select(FinancialSelectors.getTimelineMonths, []);

  assert.deepEqual(currentMonthDebts.map((debt) => debt.id), [1, 3]);
  assert.deepEqual(timeline, ['Junio 2026']);
  assert.notEqual(timeline, store.getState().monthsTimeline);
});
