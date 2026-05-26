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

- [ ] TKT-005 Versionado de esquema y migraciones
- [ ] TKT-006 Integridad de backup (validacion + checksum)
- [ ] TKT-007 Selector IA OFF / LOCAL / API
- [ ] TKT-008 Integracion IA local con Ollama
- [ ] TKT-009 Asistente IA: resumen mensual
- [ ] TKT-010 Asistente IA: alertas de deficit
- [ ] TKT-011 Asistente IA: simulador de escenarios
- [ ] TKT-012 Gateway IA para proveedores externos
- [ ] TKT-013 Limites de gasto IA (diario/mensual/tokens)
- [ ] TKT-014 Panel de consumo IA

## En curso

- [ ] Sin tickets en curso

## Bloqueado

- [ ] Sin tickets bloqueados

## Done

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

- Estado: Backlog
- Prioridad: Alta
- Fase: 2
- Owner: Gustavo
- Criterio de aceptacion:
   - Cada cambio de datos incrementa version.
   - Migraciones reproducibles por version.
- Checklist:
   - [ ] Crear registro de version
   - [ ] Definir migradores por version

### TKT-006 - Integridad de backup (validacion + checksum)

- Estado: Backlog
- Prioridad: Media
- Fase: 2
- Owner: Gustavo
- Criterio de aceptacion:
   - Import no acepta payload invalido/corrupto.
- Checklist:
   - [ ] Agregar hash/checksum al export
   - [ ] Validar checksum al importar

### TKT-007 - Selector IA OFF / LOCAL / API

- Estado: Backlog
- Prioridad: Alta
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - Usuario puede cambiar modo IA en Config.
   - Modo OFF desactiva llamadas IA.
- Checklist:
   - [ ] Crear setting de modo IA
   - [ ] Conectar selector en UI

### TKT-008 - Integracion IA local con Ollama

- Estado: Backlog
- Prioridad: Alta
- Fase: 3
- Owner: Gustavo
- Criterio de aceptacion:
   - App responde via endpoint local cuando modo LOCAL este activo.
- Checklist:
   - [ ] Crear cliente IA local
   - [ ] Manejo de timeout/reintento

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

## Bitacora de avance

### 2026-05-26

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
