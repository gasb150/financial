const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

test('obtenerMensajeIAValido retorna mensaje cuando ok es true', () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['obtenerMensajeIAValido'], {});
  const out = ctx.obtenerMensajeIAValido({ ok: true, message: 'respuesta' });
  assert.equal(out, 'respuesta');
});

test('obtenerMensajeIAValido lanza error cuando ok es false', () => {
  const ctx = loadFunctionsFromFile(APP_IA_JS, ['obtenerMensajeIAValido'], {});
  assert.throws(
    () => ctx.obtenerMensajeIAValido({ ok: false, message: 'Gateway/API externa aun no integrada.' }),
    /Gateway\/API externa aun no integrada\./
  );
});

test('generarAlertasDeficitTempranasIA detecta riesgo semanal y mensual', () => {
  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    ['construirSnapshotMensualIA', 'generarAlertasDeficitTempranasIA'],
    {
      mesActivoGlobal: 'Mayo 2026',
      getCompromisosMesActual: () => [
        { valor: 600000, pagado: false },
        { valor: 450000, pagado: false }
      ],
      obtenerEventosIngresoDelMes: () => [{ valor: 700000 }],
      obtenerResumenTramosSemanales: () => [
        { nombre: 'Semana 1', saldoCierre: -90000 },
        { nombre: 'Semana 2', saldoCierre: -20000 }
      ],
      formatCOP: (n) => `$${n}`
    }
  );

  const out = ctx.generarAlertasDeficitTempranasIA(ctx.getCompromisosMesActual());

  assert.equal(out.riesgoGlobal, 'alto');
  assert.equal(Array.isArray(out.alertas), true);
  assert.match(out.alertas.join('\n'), /Riesgo semanal temprano/);
  assert.match(out.alertas.join('\n'), /Riesgo mensual/);
});

test('construirSnapshotMensualIA usa ratio 0 cuando no hay ingresos ni pendiente', () => {
  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    ['construirSnapshotMensualIA'],
    {
      mesActivoGlobal: 'Mayo 2026',
      getCompromisosMesActual: () => [],
      obtenerEventosIngresoDelMes: () => []
    }
  );

  const out = ctx.construirSnapshotMensualIA([]);
  assert.equal(out.ingresos, 0);
  assert.equal(out.pendiente, 0);
  assert.equal(out.ratioPendiente, 0);
});

test('simularEscenariosBaseIA devuelve escenarios con impacto formateable', () => {
  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    [
      'construirSnapshotMensualIA',
      'calcularMetricasEscenarioIA',
      'simularEscenariosBaseIA',
      'formatearEscenariosIA'
    ],
    {
      mesActivoGlobal: 'Mayo 2026',
      getCompromisosMesActual: () => [
        { id: 1, nombre: 'Mercado', tipo: 'variable', valor: 300000, dia: 10, pagado: false },
        { id: 2, nombre: 'Comidas fuera', tipo: 'variable', valor: 180000, dia: 5, pagado: false },
        { id: 3, nombre: 'Arriendo', tipo: 'fijo', valor: 400000, dia: 18, pagado: false }
      ],
      obtenerEventosIngresoDelMes: () => [{ valor: 700000 }],
      obtenerResumenTramosSemanales: (comps) => {
        const q1 = comps
          .filter((c) => {
            const d = parseInt(c.dia, 10);
            return d === -1 || (d >= 1 && d <= 14);
          })
          .reduce((acc, c) => acc + c.valor, 0);
        const q2 = comps
          .filter((c) => parseInt(c.dia, 10) >= 15)
          .reduce((acc, c) => acc + c.valor, 0);

        return [
          { nombre: 'Semana 1', saldoCierre: 350000 - q1 },
          { nombre: 'Semana 3', saldoCierre: 350000 - q2 }
        ];
      },
      formatCOP: (n) => `$${n}`
    }
  );

  const escenarios = ctx.simularEscenariosBaseIA(ctx.getCompromisosMesActual());
  const texto = ctx.formatearEscenariosIA(escenarios);

  assert.ok(escenarios.length >= 2);
  assert.match(texto, /Balance:/);
  assert.match(texto, /Semanas en deficit:/);
});

test('simularEscenariosBaseIA limita dia pospuesto al fin del mes activo', () => {
  const ctx = loadFunctionsFromFile(
    APP_IA_JS,
    [
      'construirSnapshotMensualIA',
      'calcularMetricasEscenarioIA',
      'simularEscenariosBaseIA'
    ],
    {
      mesActivoGlobal: 'Febrero 2026',
      getCompromisosMesActual: () => [
        { id: 11, nombre: 'Seguro', tipo: 'fijo', valor: 500000, dia: 25, pagado: false },
        { id: 12, nombre: 'Mercado', tipo: 'variable', valor: 120000, dia: 8, pagado: false }
      ],
      obtenerEventosIngresoDelMes: () => [{ valor: 900000 }],
      obtenerResumenTramosSemanales: () => [
        { nombre: 'Semana 1', saldoCierre: 0 },
        { nombre: 'Semana 2', saldoCierre: 0 }
      ],
      formatCOP: (n) => `$${n}`
    }
  );

  const escenarios = ctx.simularEscenariosBaseIA(ctx.getCompromisosMesActual());
  const posponer = escenarios.find((e) => /Posponer 7 dias/.test(e.nombre));

  assert.ok(posponer);
  assert.match(posponer.detalle, /-> dia 28$/);
});
