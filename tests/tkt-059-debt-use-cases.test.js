const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DEBT_USE_CASES_JS = path.join(ROOT, 'src/app/use-cases/debts/debtUseCases.js');

function loadDebtUseCases() {
  const ctx = {
    window: {},
    Date,
    Number,
    parseInt,
    Array,
    Object,
    console
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(fs.readFileSync(DEBT_USE_CASES_JS, 'utf8'), ctx, { filename: DEBT_USE_CASES_JS });
  return ctx.window.FinancialDebtUseCases;
}

test('markDebtPaid toggles paid state and stamps active-month real payment day', () => {
  const useCases = loadDebtUseCases();
  const debts = [
    { id: 1, mesKey: 'Junio 2026', pagado: false, diaPagoReal: null },
    { id: 2, mesKey: 'Julio 2026', pagado: false, diaPagoReal: null }
  ];
  const now = new Date('2026-06-18T12:00:00.000Z');

  const activeResult = useCases.markDebtPaid({ debts, debtId: 1, activeMonthKey: 'Junio 2026', now });
  const futureResult = useCases.markDebtPaid({ debts, debtId: 2, activeMonthKey: 'Junio 2026', now });

  assert.equal(activeResult.ok, true);
  assert.equal(debts[0].pagado, true);
  assert.equal(debts[0].diaPagoReal, 18);
  assert.equal(futureResult.ok, true);
  assert.equal(debts[1].pagado, true);
  assert.equal(debts[1].diaPagoReal, null);
});

test('buildDebtDueAlerts classifies overdue and due-soon debts only for system month', () => {
  const useCases = loadDebtUseCases();
  const debts = [
    { id: 1, nombre: 'Water', dia: 5, pagado: false },
    { id: 2, nombre: 'Power', dia: 8, pagado: false },
    { id: 3, nombre: 'Internet', dia: 12, pagado: false },
    { id: 4, nombre: 'Paid', dia: 6, pagado: true },
    { id: 5, nombre: 'Invalid', dia: -1, pagado: false }
  ];
  const alerts = useCases.buildDebtDueAlerts({
    debts,
    activeMonthKey: 'Junio 2026',
    systemMonthKey: 'Junio 2026',
    now: new Date('2026-06-07T12:00:00.000Z'),
    thresholdDays: 3
  });

  assert.deepEqual(alerts.vencidos.map((debt) => debt.nombre), ['Water']);
  assert.deepEqual(alerts.proximos.map((debt) => debt.nombre), ['Power']);

  assert.equal(useCases.buildDebtDueAlerts({
    debts,
    activeMonthKey: 'Julio 2026',
    systemMonthKey: 'Junio 2026'
  }), null);
});
