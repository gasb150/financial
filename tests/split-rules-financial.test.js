const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_RULES_JS = path.join(ROOT, 'app.rules.js');

test('isValidMesKey validates month-year shape using known month names', () => {
  const ctx = loadFunctionsFromFile(APP_RULES_JS, ['isValidMesKey'], {
    ORDEN_MESES: [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ]
  });

  assert.equal(ctx.isValidMesKey('Mayo 2026'), true);
  assert.equal(ctx.isValidMesKey('Foo 2026'), false);
  assert.equal(ctx.isValidMesKey('Mayo xx'), false);
});

test('normalizeIncomeDayOfMonth moves end-of-month to business day', () => {
  const ctx = loadFunctionsFromFile(
    APP_RULES_JS,
    ['lastBusinessDayOfMonth', 'normalizeIncomeDayOfMonth']
  );

  // June 2026 ends on Tuesday -> no move
  assert.equal(ctx.normalizeIncomeDayOfMonth(30, 2026, 5, 30), 30);
  // August 2026 ends on Monday, day 31 valid and >= 28
  assert.equal(ctx.normalizeIncomeDayOfMonth(31, 2026, 7, 31), 31);
});

test('addMonthsToMesKey handles year rollover correctly', () => {
  const ctx = loadFunctionsFromFile(
    APP_RULES_JS,
    ['parseMesKeySafe', 'mesKeyToNumericIndex', 'numericIndexToMesKey', 'addMonthsToMesKey'],
    {
      ORDEN_MESES: [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
      ]
    }
  );

  assert.equal(ctx.addMonthsToMesKey('Noviembre 2026', 2), 'Enero 2027');
  assert.equal(ctx.addMonthsToMesKey('Enero 2027', -1), 'Diciembre 2026');
});
