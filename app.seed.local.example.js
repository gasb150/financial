// Copy this file to app.seed.local.js and put your private seed there.
// app.seed.local.js is ignored by git.
window.__FINANZAS_SEED_LOCAL_DATA__ = {
  ingresosList: [
    { id: 9001, nombre: "Ingreso privado", valor: 0, periodo: "q1", diaPago: 1, mesInicio: "Mayo 2026", mesFin: null, mesFinIndefinido: true }
  ],
  primasList: [],
  compromisos: [],
  lineaTiempoGuardada: ["Mayo 2026", "Junio 2026", "Julio 2026", "Agosto 2026", "Septiembre 2026", "Octubre 2026", "Noviembre 2026", "Diciembre 2026"],
  iaConfig: {
    mode: 'off',
    providerLocalEndpoint: 'http://localhost:11434/api/generate',
    providerLocalModel: 'llama3.1:8b',
    timeoutMs: 45000,
    retries: 1,
    updatedAt: null
  }
};
