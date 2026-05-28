# TKT-059 - Arquitectura modular evolutiva (capas + puertos/adaptadores)

Estado: Propuesto
Fecha: 2026-05-28
Owner: Gustavo

## 1. Objetivo

Definir una arquitectura de evolucion para que la app siga creciendo sin concentrar logica en archivos orquestadores y sin romper la experiencia mobile-first.

Resultados esperados:

1. Menor acoplamiento entre UI, reglas de negocio y persistencia/sync.
2. Cambios funcionales mas pequenos, testeables y con menor riesgo de regresion.
3. Ruta clara para incorporar alertas y notificaciones futuras sin reescribir el nucleo.

## 2. Principios de diseno

1. Dominio primero: reglas financieras sin depender del DOM.
2. Puertos y adaptadores: el dominio no conoce APIs externas (Drive, IndexedDB, Notification API).
3. Estado unico: estado de aplicacion en un solo store con mutaciones explicitas.
4. Efectos aislados: toda IO (persistencia, red, cache, SW) fuera de casos de uso puros.
5. Migracion incremental: sin big-bang y manteniendo compatibilidad con flujos actuales.

## 3. Arquitectura objetivo (alto nivel)

```text
UI (views/components)
  -> Application (use-cases/orchestrators)
    -> Domain (entities/value-objects/rules)
      -> Ports (interfaces)
        -> Infrastructure Adapters (idb, localStorage, drive, crypto, notifications)
```

## 4. Estructura de carpetas objetivo

```text
src/
  app/
    bootstrap.js
    store/
      appStore.js
      selectors.js
      actions.js
    use-cases/
      debts/
        markDebtPaid.js
        buildDebtDueAlerts.js
      sync/
        syncWithDrive.js
        forcePullFromDrive.js
      backup/
        exportBackup.js
        importBackup.js
      ai/
        runAiQuery.js
        applyAiActions.js
  domain/
    debts/
      debtEntity.js
      debtRules.js
    incomes/
      incomeEntity.js
      incomeRules.js
    calendar/
      mesKey.js
      scheduleRules.js
    shared/
      money.js
      dates.js
      guards.js
  ports/
    persistencePort.js
    syncPort.js
    authPort.js
    notificationPort.js
  infrastructure/
    persistence/
      indexedDbAdapter.js
      localStorageAdapter.js
    sync/
      driveAdapter.js
    auth/
      googleGisAdapter.js
    notifications/
      browserNotificationAdapter.js
      inAppAlertAdapter.js
    crypto/
      webCryptoAdapter.js
  ui/
    screens/
      dashboard/
      debts/
      weekly/
      quincena/
      config/
    components/
    formatters/
    i18n/
  tests/
    domain/
    use-cases/
    integration/
```

Nota: la app actual puede mantener archivos existentes (`app.js`, `app.actions.js`, `app.rules.js`, etc.) como facade temporal mientras se mueve logica por fases.

## 5. Modulos clave y responsabilidades

### 5.1 Store de estado

Responsabilidad:

1. Contener `appData`, estado de UI (mes activo, filtros, seleccion diaria), estado de sync y estado IA.
2. Exponer `dispatch(action)` + reducers puros.
3. Publicar `selectors` para evitar calculos duplicados en render.

No debe hacer:

1. Llamadas a Drive/IndexedDB.
2. Manipulacion directa del DOM.

### 5.2 Casos de uso

Responsabilidad:

1. Coordinar reglas de dominio + puertos.
2. Validar precondiciones y producir eventos de salida.

Casos iniciales prioritarios:

1. `markDebtPaid`.
2. `buildDebtDueAlerts`.
3. `syncWithDrive` y `forcePullFromDrive`.
4. `exportBackup` y `importBackup`.

### 5.3 Dominio financiero

Responsabilidad:

1. Reglas de calendario (`mesKey`, normalizacion de dias).
2. Reglas de compromisos/ingresos (pagado, fecha real, recurrencias).
3. Calculos puros de balance semanal, quincenal y mensual.

### 5.4 Adaptadores de infraestructura

Responsabilidad:

1. Traducir puertos a implementaciones concretas.
2. Encapsular formato de payload y errores externos.

Ejemplos:

1. `driveAdapter`: solo conoce API Google Drive y mapping de envelopes.
2. `indexedDbAdapter`: lectura/escritura de snapshots.
3. `browserNotificationAdapter`: Notification API + permisos.
4. `inAppAlertAdapter`: fallback visual sin backend.

## 6. Contratos base (puertos)

```javascript
// ports/persistencePort.js
export class PersistencePort {
  async loadSnapshot() {}
  async saveSnapshot(snapshot) {}
}

// ports/syncPort.js
export class SyncPort {
  async pull() {}
  async push(snapshot) {}
}

// ports/notificationPort.js
export class NotificationPort {
  async ensurePermission() {}
  async notifyDueSoon(payload) {}
}
```

## 7. Flujo de referencia: marcar deuda pagada

1. UI dispara `markDebtPaidRequested(id)`.
2. Caso de uso `markDebtPaid` lee estado actual desde store.
3. Dominio decide:
   - si cambia a pagado y mes activo es mes del sistema, setea `diaPagoReal = hoy`.
   - si cambia a no pagado, limpia `diaPagoReal`.
4. Caso de uso persiste snapshot via `PersistencePort`.
5. Caso de uso emite resultado para re-render y eventual sync diferido.

## 8. Alertas de vencimiento: estrategia

### Fase A (sin backend, inmediata)

1. Construccion de alertas en caso de uso `buildDebtDueAlerts`.
2. Render in-app en modulo Deudas.
3. Opcional Notification API solo cuando la app esta abierta y con permiso.

### Fase B (opcional, futura)

1. Backend/serverless para push real en background.
2. Scheduler diario con umbral configurable.
3. Token de dispositivo y preferencias por usuario.

## 9. Plan de migracion incremental

### Fase 0 - Baseline y estabilizacion

1. Congelar contratos actuales publicos (`window.Financial*`).
2. Agregar smoke tests de rutas criticas.
3. Crear mapeo archivo actual -> modulo objetivo.

### Fase 1 - Store + selectors

1. Introducir store central sin cambiar UI visible.
2. Mover estado derivado a selectors.
3. Adaptar render actual para leer del store.

Criterio de aceptacion:

1. Sin cambios funcionales en navegador.
2. Suite de pruebas igual o mayor cobertura.

### Fase 2 - Casos de uso de deudas

1. Extraer `markDebtPaid` y `buildDebtDueAlerts` a use-cases.
2. Dejar `app.actions.js` como facade.

Criterio de aceptacion:

1. Auto-set de `diaPagoReal` validado.
2. Aviso de vencimientos validado para mes activo.

### Fase 3 - Persistencia y backup

1. Encapsular IndexedDB/localStorage bajo `PersistencePort`.
2. Mover export/import backup a use-cases.

### Fase 4 - Sync Drive

1. Encapsular pull/push/checksum en `SyncPort` + `driveAdapter`.
2. Conservar flow de conflicto/force-pull.

### Fase 5 - IA y observabilidad

1. Mover ejecucion IA y limites a use-cases.
2. Agregar telemetria local de errores (sin PII).

## 10. Estrategia de testing por capa

1. Dominio: pruebas unitarias puras (sin DOM, sin IO).
2. Casos de uso: pruebas con puertos fake/mocks.
3. Integracion: adapters reales (IndexedDB fake + payload Drive simulado).
4. E2E liviano browser: escenarios clave de deuda/sync/backup.

Matriz minima de regresion:

1. Marcar pagado/no pagado conserva reglas de `diaPagoReal`.
2. Alertas vencidas/proximas responden al dia actual y mes activo.
3. Sync no persiste tokens de sesion.
4. Restore desde backup cifrado conserva integridad.

## 11. Como probar en browser cada fase

1. Abrir la app en local y confirmar carga normal de paneles.
2. En Deudas:
   - marcar una deuda del mes actual como pagada;
   - validar que se completa `Pago real` con dia de hoy.
3. Cambiar de mes:
   - validar que no aparezcan alertas de vencimiento fuera del mes actual.
4. Volver al mes actual:
   - crear deudas con dia menor y dia cercano para validar bloque de alertas.
5. Recargar pagina:
   - confirmar que estado pagado y `diaPagoReal` persisten.

## 12. Riesgos de migracion y mitigacion

1. Riesgo: duplicar logica entre facade y use-cases.
   Mitigacion: bandera de ownership por modulo y fecha limite para borrar facade.
2. Riesgo: regresiones por estado derivado.
   Mitigacion: selectors con tests y snapshots de UI en rutas criticas.
3. Riesgo: complejidad de sync + cifrado.
   Mitigacion: mantener contrato envelope y pruebas de checksum/cifrado en cada fase.

## 13. Definition of Done de TKT-059

1. Documento de arquitectura aprobado y versionado.
2. Roadmap por fases con criterios de aceptacion definido.
3. Matriz de pruebas por capa acordada.
4. Primer corte de implementacion (Fase 1 o Fase 2) creado como ticket ejecutable.
