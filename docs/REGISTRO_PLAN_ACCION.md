# Registro de Plan de Accion

Fecha de inicio: 26 de mayo de 2026
Proyecto: financial (gasb150/financial)
Objetivo: convertir la app en una web app estable en movil, con bajo riesgo de perdida de datos y capacidad de IA integrada con control de costo.

## 1) Objetivos

1. Tener una app web instalable y usable en telefono.
2. Reducir al minimo el riesgo de perder informacion.
3. Integrar IA en modo local (sin costo recurrente) y modo API (con limites de gasto).

## 2) Alcance por fases

### Fase 1 - Estabilidad base (sin costo)

1. PWA basica (manifest + service worker).
2. Offline para assets principales.
3. Validacion de guardado local y recuperacion.
4. Indicador de ultimo guardado en UI.

Entregable: app instalable, usable offline, sin backend pago.

### Fase 2 - Persistencia robusta

1. Migrar de localStorage a IndexedDB (manteniendo compatibilidad).
2. Versionado de esquema y migraciones.
3. Validacion de backups de importacion.

Entregable: menor riesgo de corrupcion/perdida y base escalable.

### Fase 3 - IA local

1. Selector de modo IA: OFF / LOCAL / API.
2. Integracion LOCAL con Ollama.
3. Primeras funciones IA:
   - resumen mensual
   - alertas de deficit
   - simulacion de escenarios

Entregable: IA funcional sin costo por tokens.

### Fase 4 - IA en nube con control de gasto

1. Gateway IA (routing por proveedor).
2. Limites: diario/mensual/tokens maximos.
3. Cache de respuestas para bajar costo.
4. Panel simple de consumo.

Entregable: IA externa disponible con gasto predecible.

## 3) Costos estimados

1. App + GitHub Pages + PWA + almacenamiento local: $0/mes.
2. Sync en nube (free tier): $0 al inicio (segun uso).
3. IA API: costo variable por tokens (estimado inicial personal: bajo, con limites).
4. IA local (Ollama): sin costo de tokens; requiere equipo encendido.

## 4) Riesgos y mitigaciones

1. Riesgo: perder datos por limpiar navegador/dispositivo.
   Mitigacion: exportacion JSON manual + auto-respaldo local + rutina de backups.

2. Riesgo: exponer datos sensibles en repo publico.
   Mitigacion: remover datos personales hardcodeados y usar plantilla limpia.

3. Riesgo: sobrecosto por IA API.
   Mitigacion: topes estrictos + cache + modo LOCAL por defecto.

## 5) Checklist maestro

- [ ] Fase 1: manifest.json
- [ ] Fase 1: service-worker.js
- [ ] Fase 1: instalacion PWA en movil validada
- [ ] Fase 1: ultimo guardado visible en UI
- [ ] Fase 2: IndexedDB implementado
- [ ] Fase 2: migracion de datos legacy validada
- [ ] Fase 2: verificacion de integridad de backup
- [ ] Fase 3: selector IA OFF/LOCAL/API
- [ ] Fase 3: endpoint local para Ollama
- [ ] Fase 3: 3 funciones IA iniciales
- [ ] Fase 4: gateway IA API
- [ ] Fase 4: limites de gasto activos
- [ ] Fase 4: panel de consumo

## 6) Bitacora de ejecucion

### 2026-05-26

1. Publicacion base en repo personal: completada.
2. Preparacion para GitHub Pages (index + nojekyll): completada.
3. Ajuste de remoto/SSH para cuenta personal: completado.
4. Plan de accion por fases definido: completado.
5. Documento de registro creado: completado.

## 7) Proxima accion recomendada

1. Implementar Fase 1 completa (PWA + offline + indicador de ultimo guardado).
2. Al cerrar Fase 1, actualizar este archivo con estado y evidencias.
