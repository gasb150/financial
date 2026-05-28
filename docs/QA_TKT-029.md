# TKT-029 - Matriz QA funcional IA y visibilidad

Fecha: 2026-05-27

## Objetivo

Validar reglas de visibilidad y flujo funcional IA (TKT-022/TKT-023/TKT-024) con y sin déficit, además de escenarios de sugerencias aplicables/no aplicables.

## Matriz de escenarios críticos

| ID | Contexto | Condición inicial | Resultado esperado |
|---|---|---|---|
| QA-IA-01 | Semanal | Existe al menos 1 tramo en déficit | CTA de rebalanceo semanal visible y habilitado |
| QA-IA-02 | Semanal | No existe déficit | CTA de rebalanceo semanal no visible |
| QA-IA-03 | Quincenal | Existe déficit en Q1 o Q2 | CTA de rebalanceo quincenal visible |
| QA-IA-04 | Quincenal | Sin déficit | CTA de rebalanceo quincenal oculto |
| QA-IA-05 | Mes | Hay gastos variables pendientes | Tarjeta de recortes item a item muestra sugerencias o fallback |
| QA-IA-06 | Mes | Sin gastos variables | Tarjeta informa “no hay gastos pendientes” y no muestra acciones aplicables |
| QA-IA-07 | IA API | Modo API + topes alcanzados | Consulta bloqueada con mensaje explícito de límite |
| QA-IA-08 | IA API | Modo API + topes disponibles | Consulta ejecuta, incrementa consumo y actualiza panel |
| QA-IA-09 | IA Local | Endpoint inalcanzable | Mensaje de error de conexión en resultado de prueba |
| QA-IA-10 | Modo OFF | Cualquier CTA IA | Bloqueo inmediato con mensaje de modo OFF |

## Casos borde documentados

1. **Límites justo en umbral**: si consumo diario/mensual ya está en el tope, el siguiente intento se bloquea antes de invocar proveedor.
2. **Uso sin telemetría de tokens del proveedor**: se usa estimación por longitud de prompt/respuesta para mantener trazabilidad.
3. **Payload IA incompleto**: respuestas API con estructura no estándar se normalizan (message/choices/response).
4. **Sin endpoint API configurado**: el modo API falla en forma controlada sin romper UI.

## Estado de ejecución

- Matriz definida: ✅
- Ejecución manual guiada con evidencia visual: ⏳ Pendiente
- Ajuste final de criterios según hallazgos: ⏳ Pendiente a ejecución manual
