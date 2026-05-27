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

test('revertirEventoHistorialIA restaura snapshot previo y marca evento como reverted', () => {
  let persisted = 0;
  let auxPersisted = 0;
  let inits = 0;
  const historyEvent = {
    id: 'iah-1',
    at: '2026-05-26T00:00:00.000Z',
    monthKey: 'Mayo 2026',
    source: 'recorte',
    actionType: 'reducir',
    status: 'applied',
    itemId: 77,
    itemName: 'Suscripcion',
    details: {
      before: { id: 77, mesKey: 'Mayo 2026', nombre: 'Suscripcion', valor: 45000, dia: 9 },
      after: { id: 77, mesKey: 'Mayo 2026', nombre: 'Suscripcion', valor: 60000, dia: 9 }
    }
  };

  const ctx = loadFunctionsFromFile(APP_IA_JS, ['registrarEventoHistorialIA', 'revertirEventoHistorialIA'], {
    appData: {
      compromisos: [{ id: 77, mesKey: 'Mayo 2026', nombre: 'Suscripcion', valor: 60000, dia: 9 }],
      iaHistory: [historyEvent]
    },
    mesActivoGlobal: 'Mayo 2026',
    Date,
    Math,
    alert: () => {},
    persistirDataPrincipalConFallback: () => { persisted += 1; },
    persistirAuxiliaresConFallback: () => { auxPersisted += 1; },
    initApp: () => { inits += 1; }
  });

  ctx.revertirEventoHistorialIA('iah-1');

  assert.equal(ctx.appData.compromisos[0].valor, 45000);
  assert.equal(ctx.appData.iaHistory[0].status, 'reverted');
  assert.equal(persisted, 1);
  assert.equal(auxPersisted, 1);
  assert.equal(inits, 1);
  assert.equal(ctx.appData.iaHistory.length >= 2, true);
});
