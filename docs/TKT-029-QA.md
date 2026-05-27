# TKT-029 - QA funcional de sugerencias IA y reglas de visibilidad

Fecha: 2026-05-27

## Matriz de escenarios críticos

| Escenario | Déficit | Superávit | Sugerencias estructuradas | Resultado esperado |
| --- | --- | --- | --- | --- |
| S1 | No | N/A | N/A | No se muestra CTA de rebalanceo semanal y el estado del panel queda limpio |
| S2 | Sí | No | N/A | Se informa que no hay capacidad para recibir movimientos |
| S3 | Sí | Sí | No | Se mantiene resultado IA sin acciones aplicables |
| S4 | Sí | Sí | Sí | Se genera al menos una acción `mover_tramo` aplicable |

## Evidencia ejecutada

- `tests/tkt-029-ia-qa.test.js` cubre:
  - Inicialización de estado semanal/quincenal
  - Render de acciones aplicar/deshacer
  - Manejo de errores al aplicar/deshacer
  - Flujo `analizarRebalanceoIA` para S1, S2, S3 y S4
- `npm test`: suite completa en verde
- `npm run lint`: sin errores (warnings existentes del proyecto)

## Hallazgos y ajuste de criterios

- Las reglas de visibilidad de rebalanceo (TKT-022/023/024) se mantienen: solo aparece CTA semanal cuando existe déficit en al menos un tramo.
- El flujo de rebalanceo conserva degradación segura cuando no hay superávit o cuando no hay acción estructurada válida.
- Se mantiene criterio de aceptación de TKT-029 sin cambios funcionales adicionales: la cobertura QA ahora es reproducible por pruebas automatizadas y evidencia documentada.
