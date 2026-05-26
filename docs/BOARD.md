# Dashboard de Tickets - Financial

Actualizado: 2026-05-26
Proyecto: financial (gasb150/financial)
Objetivo: app movil estable, bajo riesgo de perdida de datos e IA integrada con costo controlado.

## Resumen ejecutivo

1. Costo base esperado: $0/mes (GitHub Pages + almacenamiento local).
2. IA en API externa: costo variable por uso.
3. IA local (Ollama): sin costo de tokens, requiere equipo disponible.

## Tablero (estado rapido)

## Backlog

- [ ] TKT-009 Asistente IA: resumen mensual
- [ ] TKT-010 Asistente IA: alertas de deficit
- [ ] TKT-011 Asistente IA: simulador de escenarios
- [ ] TKT-012 Gateway IA para proveedores externos
- [ ] TKT-013 Limites de gasto IA (diario/mensual/tokens)
- [ ] TKT-014 Panel de consumo IA
- [ ] TKT-018 Aplicar sugerencias IA (boton + preview + undo)
- [ ] TKT-029 QA funcional de sugerencias IA y reglas de visibilidad
- [ ] TKT-030 Balance quincena a quincena con rebalanceo
- [ ] TKT-031 Pre-Mes integrado a Q1 con indicador de origen
- [ ] TKT-032 Indicadores de fecha real en listado/edicion de ingresos
- [ ] TKT-033 Fecha real de pago para gastos unicos y diferidos
- [ ] TKT-034 Historial persistente de acciones IA y revertir
- [ ] TKT-045 Modularizacion final de app.js y dominio IA
- [ ] TKT-046 Validacion fuerte de persistencia y esquema de datos
- [ ] TKT-050 Cobertura i18n completa en UI y mensajes

## En curso

- [ ] Sin tickets en curso

## Bloqueado

- [ ] Sin tickets bloqueados

## Done

- [x] TKT-038 Split dominio reglas financieras y calculos
- [x] TKT-039 Split dominio acciones de usuario y formularios
- [x] TKT-040 QA de regresion post-split y saneamiento
- [x] TKT-047 Eliminacion de handlers inline en HTML
- [x] TKT-048 Endurecimiento offline/PWA y dependencia CDN
- [x] TKT-049 Cobertura de pruebas de integracion critica
- [x] TKT-051 Estandarizar linters y calidad de codigo
- [x] TKT-043 Saneamiento historico de Git y datos sensibles
- [x] TKT-044 Seed anonima final para version publica
- [x] TKT-042 Base de localizacion (i18n) para transicion a ingles
- [x] TKT-037 Split dominio render y navegacion
- [x] TKT-036 Split dominio datos y persistencia
- [x] TKT-041 Baseline de pruebas automatizadas pre-split
- [x] TKT-035 Split base: extraer modulo IA de app.js
- [x] TKT-028 Undo del ultimo cambio aplicado por IA
- [x] TKT-027 Flujo de confirmacion y ejecucion transaccional IA
- [x] TKT-026 Motor de preview de impacto por accion IA
- [x] TKT-025 Contrato JSON de acciones IA unificado
- [x] TKT-024 Simplificar UX semanal: solo boton de rebalanceo
- [x] TKT-023 Reubicar rebalanceo semanal bajo balance semana a semana
- [x] TKT-022 Visibilidad condicional de rebalanceo por deficit
- [x] TKT-019 Recortes IA item a item accionables
- [x] TKT-017 Rebalanceo IA entre tramos (semana/quincena)
- [x] TKT-021 Robustez IA local (config + errores + timeout)
- [x] TKT-020 IA contextual por pantalla (resumen/semanal/quincena/deudas)
- [x] TKT-016 Recomendaciones IA por categoria (deudas/variables)
- [x] TKT-015 Panel IA accionable (tarjetas + CTA)
- [x] TKT-008 Integracion IA local con Ollama
- [x] TKT-007 Selector IA OFF / LOCAL / API
- [x] TKT-006 Integridad de backup (validacion + checksum)
- [x] TKT-005 Versionado de esquema y migraciones
- [x] TKT-004 Migracion de localStorage a IndexedDB
- [x] TKT-003 Indicador de ultimo guardado
- [x] TKT-002 Service worker offline cache
- [x] TKT-001 PWA base (manifest + install)
- [x] OPS-001 Repo personal publicado y push estable
- [x] OPS-002 GitHub Pages preparado (index + nojekyll)
- [x] OPS-003 Remoto SSH corregido para cuenta personal
- [x] OPS-004 Respaldo local/app (export/import) integrado

## Catalogo de tickets (detalle)

### TKT-001 - PWA base (manifest + install)

- Estado: Done
- Prioridad: Alta
- Fase: 1
- Owner: Gustavo
- Criterio de aceptacion:
   - App instalable desde movil.
   - Icono y nombre correctos en home screen.
   - Apertura directa sin fricciones.
- Checklist:
   - [x] Crear manifest.json
   - [x] Linkear manifest en HTML
   - [x] Agregar iconos 192/512

### TKT-002 - Service worker offline cache

- Estado: Done
- Prioridad: Alta
- Fase: 1
- Owner: Gustavo
- Criterio de aceptacion:
   - App abre sin internet despues de primera carga.
   - Actualizacion de cache controlada por version.
- Checklist:
   - [x] Crear service-worker.js
   - [x] Registrar SW en la app
   - [x] Definir estrategia cache-first para assets

### TKT-003 - Indicador de ultimo guardado

- Estado: Done
- Prioridad: Media
- Fase: 1
- Owner: Gustavo
- Criterio de aceptacion:
   - Mostrar fecha/hora del ultimo guardado visible en Config.
- Checklist:
   - [x] Persistir timestamp ultimo guardado
   - [x] Mostrar timestamp en UI

### TKT-004 - Migracion de localStorage a IndexedDB

- Estado: Done
- Prioridad: Alta
- Fase: 2
- Owner: Gustavo
- Criterio de aceptacion:
   - Datos existentes migran automaticamente sin perdida.
   - Lectura/escritura principal sobre IndexedDB.
- Checklist:
   - [x] Implementar capa de acceso a datos
   - [x] Script de migracion inicial
   - [x] Fallback seguro a localStorage

### TKT-005 - Versionado de esquema y migraciones

- Estado: Done
- Prioridad: Alta
- Fase: 2
- Owner: Gustavo
- Criterio de aceptacion:
   - Cada cambio de datos incrementa version.
   - Migraciones reproducibles por version.
- Checklist:
   - [x] Crear registro de version
   - [x] Definir migradores por version

### TKT-006 - Integridad de backup (validacion + checksum)

- Estado: Done
- Prioridad: Media
- Fase: 2
- Owner: Gustavo
- Criterio de aceptacion:
   - Import no acepta payload invalido/corrupto.
- Checklist:
   - [x] Agregar hash/checksum al export
   - [x] Validar checksum al importar

### TKT-007 - Selector IA OFF / LOCAL / API

- Estado: Done
- Prioridad: Alta
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - Usuario puede cambiar modo IA en Config.
   - Modo OFF desactiva llamadas IA.
- Checklist:
   - [x] Crear setting de modo IA
   - [x] Conectar selector en UI

### TKT-008 - Integracion IA local con Ollama

- Estado: Done
- Prioridad: Alta
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - App responde via endpoint local cuando modo LOCAL este activo.
- Checklist:
   - [x] Crear cliente IA local
   - [x] Manejo de timeout/reintento

### TKT-009 - Asistente IA: resumen mensual

- Estado: Backlog
- Prioridad: Media
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - Resumen entendible con ingresos, gastos, balance y riesgos.

### TKT-010 - Asistente IA: alertas de deficit

- Estado: Backlog
- Prioridad: Media
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - Alerta temprana por semana/mes en riesgo.

### TKT-011 - Asistente IA: simulador de escenarios

- Estado: Backlog
- Prioridad: Media
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - Simular impacto de mover fecha/monto de una obligacion.

### TKT-012 - Gateway IA para proveedores externos

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Un punto unico de integracion para API externa.

### TKT-013 - Limites de gasto IA (diario/mensual/tokens)

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Bloqueo automatico al superar topes.

### TKT-014 - Panel de consumo IA

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Vista simple de costo/uso acumulado.

### TKT-015 - Panel IA accionable (tarjetas + CTA)

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Vista IA tipo tarjeta por tema financiero (ej: deudas pendientes, gastos variables), distribuida en pantallas relevantes.
   - Cada tarjeta incluye CTA claro para ejecutar analisis IA.
   - Diseño visual consistente con mobile y legible en modo oscuro.
- Checklist:
   - [x] Definir layout de tarjetas IA en Resumen
   - [x] Agregar CTA por tarjeta (accion primaria)
   - [x] Conectar estado de carga/error por tarjeta

### TKT-016 - Recomendaciones IA por categoria (deudas/variables)

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Boton "Pedir estrategia para pagar deudas" genera plan priorizado de pago.
   - Boton "Analizar qué puedo reducir" sugiere recortes por impacto/riesgo.
   - Respuesta mostrada en formato accionable y corto (pasos concretos).
- Checklist:
   - [x] Crear prompt/entrada para estrategia de deuda
   - [x] Crear prompt/entrada para analisis de recorte variable
   - [x] Renderizar resultados en panel IA

### TKT-020 - IA contextual por pantalla (resumen/semanal/quincena/deudas)

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Tarjetas IA se muestran en la pantalla funcional correspondiente (Resumen, Semanal, Quincena, Deudas).
   - La recomendacion de recorte en Semanal/Quincena toma el contexto visible activo.
   - El cambio no rompe navegacion ni render base de cada pantalla.
- Checklist:
   - [x] Reubicar contenedores IA por pantalla
   - [x] Conectar render y estado por panel
   - [x] Usar contexto activo (semana seleccionada y tab de quincena)

### TKT-021 - Robustez IA local (config + errores + timeout)

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Config LOCAL editable/persistida (endpoint, modelo, timeout, reintentos).
   - Mensajes de error distinguen conexion, timeout y modelo inexistente.
   - Se evita timeout demasiado corto por migraciones legacy.
- Checklist:
   - [x] Exponer y guardar configuracion LOCAL en UI
   - [x] Mejorar manejo de errores HTTP/red/timeout
   - [x] Aplicar normalizacion y migracion de timeout legacy

### TKT-017 - Rebalanceo IA entre tramos (semana/quincena)

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - IA detecta tramos con deficit y tramos con superavit en el mes activo.
   - IA sugiere mover obligaciones no criticas de un tramo deficitario a otro con capacidad.
   - Cada sugerencia muestra impacto esperado antes/despues por tramo (saldo cierre).
- Checklist:
   - [x] Construir contexto financiero por tramo (S1..Sn, Q1/Q2, pre-mes)
   - [x] Prompt para estrategia de reubicacion con restricciones de negocio
   - [x] Mostrar propuestas con impacto cuantificado por tramo

### TKT-018 - Aplicar sugerencias IA (boton + preview + undo)

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Cada recomendacion IA incluye CTA para aplicar cambio real (ej: mover dia/tramo o ajustar monto).
   - Antes de aplicar, usuario ve preview de impacto y puede confirmar/cancelar.
   - Se puede deshacer ultimo cambio aplicado por IA sin perder integridad de datos.
- Checklist:
   - [ ] Definir esquema de sugerencia estructurada (JSON de acciones)
   - [ ] Implementar UI de preview/confirmacion por accion
   - [ ] Implementar undo transaccional para acciones IA

### TKT-019 - Recortes IA item a item accionables

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - IA entrega recortes por item con prioridad, ahorro estimado y riesgo.
   - Cada item tiene accion directa (reducir monto, posponer, mover de tramo).
   - Resultado final muestra ahorro total proyectado y nuevo balance por tramo.
- Checklist:
   - [x] Generar recomendaciones por item con metadata accionable
   - [x] Agregar botones por item para aplicar recorte/movimiento
   - [x] Recalcular resumen global y por tramo tras cada aplicacion

### TKT-022 - Visibilidad condicional de rebalanceo por deficit

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - La opcion de rebalanceo solo se muestra cuando exista al menos un tramo en deficit.
   - Si no hay deficit, no aparece CTA de rebalanceo ni tarjeta asociada.
   - El criterio se evalua en tiempo real al cambiar mes, pagos o montos.
- Checklist:
   - [x] Calcular flag global de deficit por contexto (semanal/quincenal)
   - [x] Condicionar render de rebalanceo al flag
   - [x] Validar comportamiento al alternar escenarios con/sin deficit

### TKT-023 - Reubicar rebalanceo semanal bajo balance semana a semana

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - El control de rebalanceo semanal aparece inmediatamente despues del bloque "Balance semana a semana".
   - Se elimina duplicidad visual entre panel IA semanal y bloque de balance semanal.
   - La accion mantiene el mismo resultado funcional actual.
- Checklist:
   - [x] Mover CTA de rebalanceo al modulo semanal de balance
   - [x] Remover ubicacion anterior para evitar duplicados
   - [x] Verificar flujo completo desde el nuevo punto de entrada

### TKT-024 - Simplificar UX semanal: solo boton de rebalanceo

- Estado: Done
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - En la vista semanal no se muestra tarjeta redundante de rebalanceo.
   - Solo se muestra el boton "Rebalancear entre tramos ↗" en el punto definido del modulo semanal.
   - El boton conserva estados de carga y error de forma clara.
- Checklist:
   - [x] Sustituir tarjeta semanal de rebalanceo por CTA unico
   - [x] Mantener feedback de estado (loading/error/resultado)
   - [x] Ajustar estilos para integracion limpia con el bloque semanal

### TKT-025 - Contrato JSON de acciones IA unificado

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe un schema unico para acciones IA (reducir, posponer, mover_tramo).
   - Todas las respuestas IA se validan contra el schema antes de habilitar CTA de aplicar.
   - En caso de payload invalido se aplica fallback controlado y mensaje claro en UI.
- Checklist:
   - [x] Definir schema versionado para acciones IA
   - [x] Implementar validador y normalizador central
   - [x] Integrar validacion en recortes y rebalanceo

### TKT-026 - Motor de preview de impacto por accion IA

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Antes de aplicar una accion IA se muestra preview de impacto (saldo tramo/mes, ahorro esperado).
   - Preview funciona para reducir, posponer y mover_tramo.
   - El calculo de preview no modifica datos persistidos.
- Checklist:
   - [x] Construir simulador puro por tipo de accion
   - [x] Mostrar diff antes/despues en UI
   - [x] Validar consistencia preview vs resultado aplicado

### TKT-027 - Flujo de confirmacion y ejecucion transaccional IA

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Cada accion IA requiere confirmacion explicita de usuario.
   - Si falla una aplicacion, el estado no queda parcialmente actualizado.
   - Se registra resultado de aplicacion (ok/error) por accion.
- Checklist:
   - [x] Implementar modal/paso de confirmacion previo
   - [x] Aplicar cambios con estrategia transaccional
   - [x] Persistir y mostrar estado final por accion

### TKT-028 - Undo del ultimo cambio aplicado por IA

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Usuario puede deshacer el ultimo cambio aplicado por IA.
   - Undo restaura valor/dia/tramo previo sin corrupcion de datos.
   - Undo se deshabilita cuando no exista accion reversible.
- Checklist:
   - [x] Guardar snapshot minimo pre-aplicacion
   - [x] Implementar accion de rollback en UI
   - [x] Validar restauracion y persistencia tras undo

### TKT-029 - QA funcional de sugerencias IA y reglas de visibilidad

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe matriz de pruebas para escenarios con/sin deficit y con/sin sugerencias.
   - Se valida no-regresion de reglas de visibilidad (TKT-022/023/024).
   - Se documentan casos borde y resultados esperados.
- Checklist:
   - [ ] Definir matriz de escenarios criticos
   - [ ] Ejecutar pruebas manuales guiadas y registrar evidencia
   - [ ] Ajustar criterios de aceptacion segun hallazgos

### TKT-030 - Balance quincena a quincena con rebalanceo

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe vista "Balance quincena a quincena" con estructura equivalente a "Balance semana a semana".
   - La vista muestra saldo inicial, ingresos, gastos, neto y saldo de cierre por tramo (Q1/Q2).
   - Incluye CTA de "Rebalancear entre tramos" con el mismo flujo funcional de rebalanceo ya existente.
- Checklist:
   - [ ] Crear bloque visual quincena a quincena en la pantalla de Quincena
   - [ ] Reusar/ajustar calculos de saldos por tramo quincenal
   - [ ] Integrar CTA de rebalanceo quincenal con estado (loading/error/resultado)

### TKT-031 - Pre-Mes integrado a Q1 con indicador de origen

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Los cargos Pre-Mes impactan dentro del bloque de gastos de Q1.
   - Cada item Pre-Mes mantiene marcador visual de "viene del mes anterior".
   - El usuario puede distinguir claramente cargo Q1 nativo vs cargo arrastrado Pre-Mes.
- Checklist:
   - [ ] Consolidar Pre-Mes dentro del calculo/render de Q1
   - [ ] Agregar badge/etiqueta de origen en listas y tarjetas
   - [ ] Verificar que no haya doble conteo en resumenes

### TKT-032 - Indicadores de fecha real en listado/edicion de ingresos

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - El listado y edicion de ingresos muestra "fecha real de pago" y "fecha de impacto en flujo".
   - Se identifica cuando un ingreso cae en 29-31 y se arrastra al dia 1 del mes siguiente.
   - El indicador permite lectura rapida sin abrir otras vistas.
- Checklist:
   - [ ] Agregar metadatos visibles en tarjetas de configuracion de ingresos
   - [ ] Mostrar estado de arrastre/impacto en resumen de ingresos
   - [ ] Alinear textos con reglas actuales de flujo

### TKT-033 - Fecha real de pago para gastos unicos y diferidos

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Gastos unicos pueden registrar una fecha real de pago distinta a la fecha de impacto en flujo.
   - La app permite modelar gastos que se pagan dias despues sin romper balances.
   - La UI muestra claramente ambas fechas cuando existan diferencias.
- Checklist:
   - [ ] Definir campos de fecha real/fecha impacto para compromisos aplicables
   - [ ] Ajustar calculos de calendario, quincenas y semana a semana
   - [ ] Mostrar indicador visual en listas y modulo de edicion

### TKT-034 - Historial persistente de acciones IA y revertir

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Las sugerencias/aplicaciones IA quedan registradas en un historial persistente (no se pierden al reiniciar).
   - Se puede revertir una o varias acciones previas desde el historial, con orden y trazabilidad.
   - El historial muestra accion, item afectado, timestamp y estado (aplicada/revertida).
- Checklist:
   - [ ] Definir modelo de datos para historial IA (acciones y metadatos)
   - [ ] Persistir historial en almacenamiento principal
   - [ ] Implementar UI de historial con opcion de revertir

### TKT-043 - Saneamiento historico de Git y datos sensibles

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Se reescribe todo el historial Git desde el primer commit con data real para eliminar datos sensibles de forma permanente.
   - Se publica historial saneado mediante force push y las referencias antiguas dejan de estar disponibles en remoto.
   - El estado final conserva comportamiento funcional manteniendo la data actual durante desarrollo activo.
- Checklist:
   - [x] Identificar commit base donde aparece data sensible y definir ventana de reescritura
   - [x] Definir politica de anonimización (campos permitidos/prohibidos)
   - [x] Aplicar reescritura historica (filter-repo o equivalente) sobre ramas/tags relevantes
   - [x] Validar que no queden rastros de datos sensibles en todo el historial reescrito
   - [x] Publicar historial saneado con force push
   - [x] Documentar impacto para clones existentes (re-clone o hard reset al nuevo historial)

### TKT-044 - Seed anonima final para version publica

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Al cierre del desarrollo se reemplaza la data real por una seed anonima estable para publicacion.
   - La seed anonima mantiene estructura, volumen y fechas clave para conservar comportamiento funcional de demo.
   - El usuario puede reiniciar datos con seed de prueba sin exponer informacion sensible real.
- Checklist:
   - [x] Definir mapeo de nombres/montos anonimizados
   - [x] Reemplazar datos reales en defaults/fixtures por seed anonima
   - [x] Validar flujos funcionales con seed anonima
   - [x] Documentar estrategia de reset/seed para entorno publico

### TKT-042 - Base de localizacion (i18n) para transicion a ingles

- Estado: Done
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe un diccionario base de textos para separar idioma de logica funcional.
   - El proyecto define locale por defecto y estrategia de fallback con autodeteccion por locale/región del navegador.
   - Existe switch manual de idioma en UI para cambiar entre español e ingles.
- Checklist:
   - [x] Definir estructura de recursos por locale (es-CO, en-US)
   - [x] Crear helper central de traduccion con fallback
   - [x] Migrar primer bloque de mensajes de prueba
   - [x] Agregar switch manual de idioma en UI
   - [x] Agregar autodeteccion de locale por entorno del navegador

### TKT-036 - Split dominio datos y persistencia

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - La logica de acceso a datos (lectura, guardado, backup, migraciones) queda aislada en modulo propio.
   - No se alteran contratos publicos usados por UI y calculos.
   - Guardado/restore sigue funcionando en escenarios normales y con fallback.
- Checklist:
   - [x] Extraer helpers y flujos de persistencia a archivo dedicado
   - [x] Mantener wrappers o adaptadores para compatibilidad temporal
   - [x] Ejecutar smoke test de guardar/importar/restaurar

### TKT-041 - Baseline de pruebas automatizadas pre-split

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe una suite minima automatizada para funciones criticas que se ejecuta localmente.
   - Las pruebas validan parseo de montos, utilidades de mes, calculo semanal y contrato base de acciones IA.
   - Hay comando unico para correr la suite antes y despues de cada ticket de split.
- Checklist:
   - [x] Crear harness de pruebas sin dependencias externas
   - [x] Agregar casos baseline de funciones core y IA
   - [x] Exponer script de ejecucion estandar (`npm test`)

### TKT-035 - Split base: extraer modulo IA de app.js

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Las funciones IA quedan separadas en un archivo dedicado sin romper el comportamiento actual.
   - El HTML carga el nuevo archivo en orden correcto y la app inicia sin errores de referencia.
   - El service worker incluye el nuevo asset y refresca cache por version.
- Checklist:
   - [x] Extraer funciones IA desde app.js a modulo dedicado
   - [x] Ajustar carga de scripts en HTML
   - [x] Actualizar version y assets en service worker

### TKT-037 - Split dominio render y navegacion

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Funciones de render y cambio de secciones quedan organizadas por pantalla/modulo.
   - Se reduce acoplamiento entre render y mutacion de estado.
   - Navegacion entre tabs/pantallas conserva comportamiento actual.
- Checklist:
   - [x] Separar renderizadores de Resumen/Semanas/Quincenas/Deudas/Config
   - [x] Centralizar orquestacion de repaint por eventos de estado
   - [x] Validar flujos de navegacion y refresco

### TKT-038 - Split dominio reglas financieras y calculos

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Calculos de balance, tramos, semanas y quincenas quedan en modulo de negocio sin dependencias directas del DOM.
   - Las funciones puras pueden invocarse con datos de prueba sin inicializar UI.
   - Resultados de calculo no presentan regresiones visibles en pantallas principales.
- Checklist:
   - [x] Extraer funciones de calculo y normalizacion financiera
   - [x] Eliminar dependencias de document/window dentro de reglas de negocio
   - [x] Comparar resultados antes/despues en escenarios representativos

### TKT-039 - Split dominio acciones de usuario y formularios

- Estado: Done
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Handlers de UI (crear/editar/eliminar/aplicar) quedan agrupados por dominio.
   - El registro de eventos no depende del orden incidental de funciones en un unico archivo.
   - Formularios mantienen validaciones y mensajes actuales.
- Checklist:
   - [x] Separar handlers de compromisos, ingresos y configuracion
   - [x] Reordenar bootstrap de listeners y acciones globales
   - [x] Validar formularios criticos y atajos existentes

### TKT-045 - Modularizacion final de app.js y dominio IA

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - app.js queda reducido a bootstrap/orquestacion y pierde logica de dominio restante.
   - El cliente IA y flujo de consulta quedan centralizados en app.ia.js.
   - Existen pruebas para consultarIALocal y ejecutarConsultaIA con casos de error/reintento.
- Checklist:
   - [ ] Extraer inicializacion y composicion de dashboard fuera de app.js
   - [ ] Migrar transporte/errores/fallback IA a app.ia.js
   - [ ] Agregar pruebas unitarias del cliente IA

### TKT-046 - Validacion fuerte de persistencia y esquema de datos

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - validatePrimaryData y validateBackupPayload validan estructura interna completa.
   - Se soporta recuperacion parcial segura cuando algun bloque del payload esta corrupto.
   - Se registra trazabilidad de errores de persistencia para diagnostico.
- Checklist:
   - [ ] Definir esquema de ingresos/primas/compromisos/iaConfig
   - [ ] Implementar validador estructural y sanitizacion de entradas
   - [ ] Agregar logs de error y pruebas de payloads invalidos

### TKT-047 - Eliminacion de handlers inline en HTML

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Se eliminan handlers inline (onclick/onchange/oninput) de finanzas_tavo_app.html.
   - Los eventos se registran desde JS usando data-* y listeners desacoplados.
   - No hay regresiones en flujos de formularios y navegacion.
- Checklist:
   - [x] Reemplazar handlers inline por data-action/data-input
   - [x] Registrar listeners en bootstrap de UI
   - [x] Ejecutar smoke completo de pantallas

### TKT-048 - Endurecimiento offline/PWA y dependencia CDN

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - El modo offline no depende de recursos mutables externos (@latest).
   - Los assets criticos de UI quedan versionados localmente o con estrategia estable cacheable.
   - Se valida carga en frio offline tras instalacion.
- Checklist:
   - [x] Reemplazar CDN mutable por asset local/versionado
   - [x] Ajustar service worker para cubrir asset de iconos/tablero
   - [x] Validar PWA offline en movil/escritorio

### TKT-049 - Cobertura de pruebas de integracion critica

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Se cubren flujos de inicializacion, render principal y rutas IA criticas.
   - Se cubren escenarios clave de PWA/service worker sin dependencia de red.
   - El pipeline local identifica regresiones DOM/integracion no cubiertas por unit tests.
- Checklist:
   - [x] Agregar pruebas de integracion de initApp y render por pantallas
   - [x] Agregar pruebas de flujo IA end-to-end simulado
   - [x] Agregar pruebas de cache/offline de service worker

### TKT-050 - Cobertura i18n completa en UI y mensajes

- Estado: Backlog
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - El cambio de idioma impacta todos los textos visibles de UI principal.
   - Se eliminan hardcodes remanentes en HTML/app.js para textos de usuario.
   - Existen pruebas basicas de regresion para claves faltantes/fallback.
- Checklist:
   - [ ] Inventariar textos hardcodeados y moverlos a diccionario
   - [ ] Completar claves de traduccion por pantalla
   - [ ] Agregar pruebas de fallback y cobertura minima por locale

### TKT-051 - Estandarizar linters y calidad de codigo

- Estado: Done
- Prioridad: Media
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe configuracion de linter para JS y validacion basica de estilos/errores comunes.
   - Se expone comando unico para ejecutar lint localmente antes de push/PR.
   - El proyecto documenta reglas base y excepciones para evitar regresiones de estilo/calidad.
- Checklist:
   - [x] Definir stack de lint (ESLint y reglas base del proyecto)
   - [x] Agregar script de lint en package.json
   - [x] Corregir hallazgos criticos iniciales y documentar uso

### TKT-040 - QA de regresion post-split y saneamiento

- Estado: Done
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - Existe checklist de regresion para los modulos impactados por el split.
   - Se validan errores de consola, carga offline y rutas de IA principales.
   - Se documentan hallazgos y fixes necesarios antes de retomar nuevos features.
- Checklist:
   - [x] Ejecutar smoke test funcional completo (Resumen, Semanas, Quincenas, Deudas, Config)
   - [x] Validar cache offline y carga en frio tras cambio de version
   - [x] Registrar incidencias y aplicar correcciones de saneamiento

## Bitacora de avance

### 2026-05-26

1. TKT-051 completado: ESLint configurado con reglas base, scripts `npm run lint`/`npm run lint:fix`, e ignores de entorno para evitar ruido de infraestructura.
1. TKT-051 agregado: estandarizacion de linters y comando de calidad para validacion antes de PR.
1. TKT-049 completado: pruebas de integracion critica agregadas para `initApp`/render principal, flujo IA simulado y escenarios de cache/offline del service worker.
1. TKT-048 completado: dependencia CDN mutable removida (@latest -> version fija) y cache endurecida en service worker para asset externo estable.
1. TKT-047 completado: eliminados handlers inline en HTML y migrados a listeners delegados con data-action en bootstrap de JS.
1. TKT-040 completado: QA de regresion ejecutado (tests + smoke funcional + verificacion service worker/cache) con correccion de runtime en render semanal (`renderMenuSemanas` y `renderSemanaActiva`).
1. TKT-050 agregado: cobertura i18n completa para eliminar textos hardcodeados en UI.
1. TKT-049 agregado: pruebas de integracion critica (init/render/IA/offline).
1. TKT-048 agregado: endurecimiento offline/PWA removiendo dependencia CDN mutable.
1. TKT-047 agregado: eliminacion de handlers inline y registro de eventos por listeners JS.
1. TKT-046 agregado: validacion fuerte de persistencia y esquema de datos.
1. TKT-045 agregado: modularizacion final de app.js y centralizacion de dominio IA.
1. TKT-044 completado: seed anonima publicada y separacion de seed local ignorada por git.
1. TKT-043 completado: historial git saneado y publicado via force push.
1. TKT-039 completado: split de acciones/formularios con modulo dedicado y pruebas.
1. Follow-up agregado: TKT-034 para historial persistente de acciones IA y revertir multi-paso.
1. TKT-038 completado: modulo app.rules.js agregado para reglas financieras/calculos con wrappers compatibles y pruebas dedicadas.
1. TKT-044 agregado: seed anonima final separada del saneamiento historico para ejecutar al cierre del desarrollo.
1. TKT-043 ajustado: se mantiene data real durante desarrollo y la reescritura historica se deja para fase de publicacion.
1. TKT-043 ajustado: como el repo ya es publico, el alcance pasa a reescritura historica completa de Git + force push para eliminar datos sensibles pasados.
1. TKT-042 completado: base i18n implementada con autodeteccion por locale/región del navegador y switch manual de idioma en cabecera.
1. TKT-037 completado: modulo app.render.js agregado para navegacion/render con wrappers compatibles y pruebas dedicadas.
1. TKT-036 completado: modulo app.data.js agregado con wrappers compatibles en app.js y cache actualizada para offline.
1. TKT-041 completado: baseline de pruebas automatizadas agregado para validar refactors de split con comando unico (`npm test`).
1. TKT-035 completado: split base de IA en app.ia.js con carga en HTML y cache v4 en service worker.
1. Backlog de modularizacion agregado: TKT-035/TKT-036/TKT-037/TKT-038/TKT-039/TKT-040 para dividir app.js por dominios y ejecutar QA de regresion antes de nuevos features.
1. TKT-028 completado: undo del ultimo cambio IA aplicado con restauracion de snapshot.
1. TKT-027 completado: confirmacion previa y aplicacion transaccional en acciones IA de recorte.
1. TKT-026 completado: preview antes/despues por accion IA (mes y tramo).
1. TKT-025 completado: contrato JSON unificado y validacion central para acciones IA.
1. Backlog ampliado: TKT-030/TKT-031/TKT-032/TKT-033 para balance quincenal, integracion de Pre-Mes e indicadores de fecha real.
1. TKT-024 completado: UX semanal simplificada eliminando tarjeta redundante y dejando CTA unico de rebalanceo.
1. TKT-023 completado: CTA semanal de rebalanceo reubicado inmediatamente despues de "Balance semana a semana".
1. TKT-022 completado: rebalanceo visible solo cuando hay deficit por tramo.
1. Backlog ampliado: TKT-025/TKT-026/TKT-027/TKT-028/TKT-029 para descomponer TKT-018 en piezas paralelizables y verificables.
1. Backlog UX agregado: TKT-022/TKT-023/TKT-024 para visibilidad condicional y simplificacion del rebalanceo semanal.
1. TKT-019 completado: recortes IA item a item con acciones aplicables (reducir/posponer/mover) y recálculo inmediato tras aplicar.
1. TKT-017 completado: rebalanceo IA semanal/quincenal con deteccion de deficit/superavit y salida con impacto antes/despues por tramo.
1. TKT-021 completado: robustez de IA local con configuracion persistente, diagnosticos y migracion de timeout legacy.
1. TKT-020 completado: paneles IA contextualizados por pantalla y uso de contexto visible en semana/quincena.
1. TKT-016 completado: recomendaciones IA por categoria operativas (deudas/variables) con prompts y resultados en panel.
1. TKT-015 completado: panel IA en Resumen con tarjetas accionables, CTA y estados de carga/error por tarjeta.
1. TKT-008 completado: cliente LOCAL Ollama operativo con timeout configurable y reintentos.
1. Backlog ampliado: TKT-017/TKT-018/TKT-019 para rebalanceo entre tramos y aplicacion accionable de sugerencias IA.
1. Backlog ampliado: TKT-015 y TKT-016 agregados para UX IA accionable (tarjetas + CTA por categoria).
1. TKT-007 completado: selector IA OFF/LOCAL/API persistido y guardas para bloquear IA en OFF.
1. TKT-006 completado: checksum SHA-256 agregado y validado en import/restore.
1. TKT-005 completado: schemaVersion y migradores v1/v2 aplicados en carga/import/restore.
1. TKT-004 completado: IndexedDB como almacenamiento principal con migracion y fallback.
1. TKT-003 completado: timestamp de ultimo guardado persistido y visible en Config.
1. TKT-002 completado: cache offline base con service worker registrado.
1. TKT-001 completado: manifest, iconos y flujo de instalacion base agregados.
1. OPS-001 completado: push estable a repo personal.
2. OPS-002 completado: entrypoint y pages listos.
3. OPS-003 completado: remoto SSH corregido.
4. OPS-004 completado: respaldo local integrado en app.

## Plantilla para nuevos tickets

Copiar/pegar:

### TKT-XXX - Titulo del ticket

- Estado: Backlog | En curso | Bloqueado | Done
- Prioridad: Alta | Media | Baja
- Fase: 1 | 2 | 3 | 4
- Owner: Nombre
- Criterio de aceptacion:
   - Resultado verificable 1
   - Resultado verificable 2
- Checklist:
   - [ ] Tarea 1
   - [ ] Tarea 2
