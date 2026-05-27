const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

test('registrarEventoHistorialIA crea historial y recorta a maximo 500', () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['registrarEventoHistorialIA'], {
    appData: { iaHistory: [] },
    mesActivoGlobal: 'Mayo 2026',
    Date,
    Math
  });

  ctx.registrarEventoHistorialIA({
    source: 'recorte',
    actionType: 'reducir',
    status: 'applied',
    itemId: 10,
    itemName: 'Mercado',
    details: { ahorro: 20000 }
  });

  assert.equal(ctx.appData.iaHistory.length, 1);
  const first = ctx.appData.iaHistory[0];
  assert.equal(first.monthKey, 'Mayo 2026');
  assert.equal(first.source, 'recorte');
  assert.equal(first.actionType, 'reducir');
  assert.equal(first.status, 'applied');
  assert.equal(first.itemId, 10);
  assert.equal(first.itemName, 'Mercado');

  for(let i = 0; i < 550; i += 1) {
    ctx.registrarEventoHistorialIA({ source: 'rebalanceo', actionType: 'mover_tramo', status: 'applied', itemId: i });
  }

  assert.equal(ctx.appData.iaHistory.length, 500);
});
