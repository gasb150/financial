// Private local seed (ignored by git).
window.__FINANZAS_SEED_LOCAL_DATA__ = {
  ingresosList: [
    { id: 1, nombre: "Salario Miguel (Quincena 1)", valor: 1787657, periodo: "q1" },
    { id: 2, nombre: "Salario Miguel (Quincena 2)", valor: 1787657, periodo: "q2" },
    { id: 3, nombre: "Apto Barranquilla", valor: 400000, periodo: "q2" }
  ],
  primasList: [],
  compromisos: [
    { id: 1, nombre: "Internet T", valor: 360000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 2, nombre: "Cuota Datos G", valor: 55000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 3, nombre: "Gas (servicios)", valor: 190000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 4, nombre: "EPM", valor: 110000, dia: -1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 5, nombre: "Comida", valor: 1200000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 6, nombre: "Alquiler", valor: 2259000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 7, nombre: "Casa", valor: 1610000, dia: 14, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 12, nombre: "Gas Barranquilla", valor: 720000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 13, nombre: "Administración Bq", valor: 374000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 14, nombre: "Karla", valor: 1300000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 15, nombre: "Internet M", valor: 106000, dia: 12, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 16, nombre: "Mensualidad colegio", valor: 339000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 17, nombre: "Gasolina", valor: 600000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 21, nombre: "AAA Barranquilla", valor: 700000, dia: 15, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 101, nombre: "Colegio de Fiore", valor: 678000, dia: 1, pagado: false, tipo: "fijo", mesKey: "Mayo 2026" },
    { id: 102, nombre: "Extra Colegio Fiore", valor: 678000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 103, nombre: "K y T", valor: 300000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 104, nombre: "Regalo ado", valor: 200000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 105, nombre: "Tia Nayi", valor: 200000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 106, nombre: "Deuda Vecinos", valor: 250000, dia: 16, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 107, nombre: "Deuda Vank", valor: 500000, dia: 16, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 108, nombre: "Cumple Pao", valor: 150000, dia: 10, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 109, nombre: "Cumple esposa de alejo", valor: 150000, dia: 13, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 110, nombre: "Cumple Miller", valor: 150000, dia: 20, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 111, nombre: "Zapatos Fiorella", valor: 150000, dia: 15, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 112, nombre: "Fiore", valor: 74000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 113, nombre: "Itala", valor: 500000, dia: 1, pagado: false, tipo: "variable", mesKey: "Mayo 2026" },
    { id: 8, nombre: "Tarjeta Crédito Bogotá", valor: 1050959, dia: 1, pagado: false, tipo: "credito", faltantes: 12, totales: 24, mesKey: "Mayo 2026" },
    { id: 9, nombre: "Crédito Bogotá 1", valor: 600000, dia: 1, pagado: false, tipo: "credito", faltantes: 6, totales: 12, mesKey: "Mayo 2026" },
    { id: 10, nombre: "Crédito Bogotá 2", valor: 2019972, dia: 1, pagado: false, tipo: "credito", faltantes: 24, totales: 48, mesKey: "Mayo 2026" },
    { id: 11, nombre: "Alkosto", valor: 676688, dia: 1, pagado: false, tipo: "credito", faltantes: 4, totales: 6, mesKey: "Mayo 2026" },
    { id: 18, nombre: "Falabella", valor: 220000, dia: 15, pagado: false, tipo: "credito", faltantes: 3, totales: 12, mesKey: "Mayo 2026" },
    { id: 19, nombre: "Carro Bogotá", valor: 2500000, dia: 5, pagado: false, tipo: "credito", faltantes: 36, totales: 60, mesKey: "Mayo 2026" },
    { id: 20, nombre: "Crédito Bogotá 3", valor: 250000, dia: 5, pagado: false, tipo: "credito", faltantes: 8, totales: 24, mesKey: "Mayo 2026" }
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
