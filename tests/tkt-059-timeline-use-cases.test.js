const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const TIMELINE_JS = path.join(ROOT, 'src/app/use-cases/timeline/timelineUseCases.js');

function loadTimelineModule() {
  const ctx = {
    window: {},
    Date,
    Set,
    Array,
    Object,
    String,
    Number,
    parseInt
  };
  ctx.window.window = ctx.window;
  vm.runInNewContext(fs.readFileSync(TIMELINE_JS, 'utf8'), ctx, { filename: TIMELINE_JS });
  return ctx.window.FinancialTimelineUseCases;
}

test('timeline use cases build month keys from dates', () => {
  const timeline = loadTimelineModule();

  assert.equal(timeline.getMonthKeyForDate(new Date('2026-06-06T12:00:00.000Z')), 'Junio 2026');
});

test('timeline use cases mark restored backup month correction', () => {
  const timeline = loadTimelineModule();
  const data = { migraciones: {} };

  assert.equal(timeline.markBaseMonthCorrectionApplied(data), data);
  assert.equal(data.migraciones.correccionMesBaseJunio2026, true);
});

test('timeline use cases ensure current-year months and preserve legacy values', () => {
  const timeline = loadTimelineModule();
  const result = timeline.ensureCurrentYearTimelineMonths({
    currentYear: 2026,
    timeline: [
      'Julio 2026',
      '  Enero 2027  ',
      'Mes roto',
      'Abril sin-anio',
      '',
      '   ',
      null,
      123,
      { mes: 'Junio' }
    ]
  });

  assert.equal(result.length, 15);
  assert.equal(result[0], 'Enero 2026');
  assert.equal(result[11], 'Diciembre 2026');
  assert.equal(result[12], 'Enero 2027');
  assert.deepEqual(result.slice(13), ['Mes roto', 'Abril sin-anio']);
});
