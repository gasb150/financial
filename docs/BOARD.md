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
- [ ] TKT-017 Rebalanceo IA entre tramos (semana/quincena)
- [ ] TKT-018 Aplicar sugerencias IA (boton + preview + undo)
- [ ] TKT-019 Recortes IA item a item accionables

## En curso

- [ ] Sin tickets en curso

## Bloqueado

- [ ] Sin tickets bloqueados

## Done

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

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - IA detecta tramos con deficit y tramos con superavit en el mes activo.
   - IA sugiere mover obligaciones no criticas de un tramo deficitario a otro con capacidad.
   - Cada sugerencia muestra impacto esperado antes/despues por tramo (saldo cierre).
- Checklist:
   - [ ] Construir contexto financiero por tramo (S1..Sn, Q1/Q2, pre-mes)
   - [ ] Prompt para estrategia de reubicacion con restricciones de negocio
   - [ ] Mostrar propuestas con impacto cuantificado por tramo

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

- Estado: Backlog
- Prioridad: Alta
- Fase: 4
- Owner: Gustavo
- Criterio de aceptacion:
   - IA entrega recortes por item con prioridad, ahorro estimado y riesgo.
   - Cada item tiene accion directa (reducir monto, posponer, mover de tramo).
   - Resultado final muestra ahorro total proyectado y nuevo balance por tramo.
- Checklist:
   - [ ] Generar recomendaciones por item con metadata accionable
   - [ ] Agregar botones por item para aplicar recorte/movimiento
   - [ ] Recalcular resumen global y por tramo tras cada aplicacion

## Bitacora de avance

### 2026-05-26

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
