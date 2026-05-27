const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

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
