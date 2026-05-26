// Public, safe seed used by default in repo and deployments.
window.__FINANZAS_SEED_DATA__ = {
  ingresosList: [
    { id: 1, nombre: "Salario Demo (Q1)", valor: 3200000, periodo: "q1", diaPago: 1, mesInicio: "Mayo 2026", mesFin: null, mesFinIndefinido: true },
    { id: 2, nombre: "Salario Demo (Q2)", valor: 3200000, periodo: "q2", diaPago: 15, mesInicio: "Mayo 2026", mesFin: null, mesFinIndefinido: true },
    { id: 3, nombre: "Renta Demo", valor: 650000, periodo: "q2", diaPago: 30, mesInicio: "Mayo 2026", mesFin: null, mesFinIndefinido: true }
  ],
  primasList: [],
  compromisos: [
    { id: 101, nombre: "Arriendo", valor: 1800000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 102, nombre: "Servicios", valor: 360000, dia: 5, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 103, nombre: "Mercado", valor: 900000, dia: 8, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 104, nombre: "Transporte", valor: 380000, dia: 12, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 105, nombre: "Credito Demo", valor: 520000, dia: 15, pagado: false, tipo: "credito", faltantes: 8, totales: 24, mesKey: "Mayo 2026" }
  ],
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
