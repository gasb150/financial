const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const CHANGE_SUMMARY_JS = path.join(ROOT, 'src/app/use-cases/driveSync/changeSummary.js');

function loadChangeSummaryModule() {
  const ctx = {
    window: {},
    Array,
    Object,
    String,
    Math
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(fs.readFileSync(CHANGE_SUMMARY_JS, 'utf8'), ctx, { filename: CHANGE_SUMMARY_JS });
  return ctx.window.FinancialDriveSyncChangeSummary;
}

test('drive sync change summary formats changed primitive values', () => {
  const summary = loadChangeSummaryModule();

  assert.equal(summary.formatChangedValue(400000, (value) => `$${Math.round(value).toLocaleString('es-CO')}`), '$400.000');
  assert.equal(summary.formatChangedValue(false), 'no');
  assert.equal(summary.formatChangedValue('   '), 'vacío');
  assert.equal(summary.getFieldLabel('compromisos'), 'deudas');
});

test('drive sync change summary collects readable local and remote differences', () => {
  const summary = loadChangeSummaryModule();
  const changes = summary.collectDriveSyncChanges(
    {
      ingresosList: [{ id: 1, nombre: 'Salario', valor: 400000 }],
      compromisos: []
    },
    {
      ingresosList: [{ id: 1, nombre: 'Salario', valor: 300000 }],
      compromisos: []
    },
    { formatCurrency: (value) => `$${Math.round(value).toLocaleString('es-CO')}` }
  );

  assert.equal(changes.length, 1);
  assert.match(changes[0], /Salario/);
  assert.match(changes[0], /\$400\.000/);
  assert.match(changes[0], /\$300\.000/);
});
