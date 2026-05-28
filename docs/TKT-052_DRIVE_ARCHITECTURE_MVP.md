# TKT-052 - Google Drive Backend Architecture (MVP)

Status: Proposed for implementation (design approved)
Date: 2026-05-27
Scope: Define a remote data layer on top of Google Drive without breaking offline-first behavior.

## 1. Goals

1. Add optional cloud backup/sync using Google Drive.
2. Preserve current offline-first operation as the default behavior.
3. Avoid exposing sensitive credentials in client code.
4. Enable future phased rollout for auth, sync, encryption, and conflict resolution (TKT-053..056).

## 2. Architecture Decision

### 2.1 Option A: Direct Google Drive API from browser

Pros:
- Fewer moving parts.
- No extra service deployment.

Cons:
- Wider OAuth scope handling in client.
- More complex CORS/error handling in browser.
- Harder to evolve contract logic (validation, transforms, conflict metadata) centrally.

### 2.2 Option B: Apps Script Proxy (selected for MVP)

Pros:
- Single thin server-side boundary to encapsulate Drive operations.
- Centralized validation and contract evolution.
- Simpler browser client API (stable endpoints).
- Better control over retries/quota mapping and error normalization.

Cons:
- Adds one extra deployable artifact (Apps Script web app).

Decision: Use Apps Script Proxy for MVP.

## 3. High-Level Components

1. Browser app (existing): source of truth remains local IndexedDB.
2. Remote sync client (new module in app): invokes proxy endpoints.
3. Apps Script proxy: validates request, reads/writes Drive file(s), returns normalized responses.
4. Google Drive storage: single app-specific JSON snapshot file for MVP.

## 4. Remote Storage Strategy

MVP strategy: single JSON snapshot file + metadata envelope.

File naming:
- Primary: financial_app_snapshot_v1.json
- Optional rotation (future): financial_app_snapshot_v1_YYYYMMDD_HHMMSS.json

Location:
- App-specific folder in user's Drive (created/managed by proxy).

Write mode:
- Replace full snapshot for MVP.
- Incremental/delta sync deferred to TKT-054.

## 5. Remote Data Contract (v1)

```json
{
  "contractVersion": 1,
  "savedAt": "2026-05-27T20:00:00.000Z",
  "schemaVersion": 3,
  "deviceId": "web-<stable-id>",
  "sequence": 42,
  "checksum": "sha256:<hex>",
  "payload": {
    "ingresosList": [],
    "primasList": [],
    "compromisos": [],
    "lineaTiempoGuardada": [],
    "iaConfig": {},
    "iaUsage": {},
    "iaHistory": {}
  }
}
```

Contract rules:
1. checksum is computed over payload canonical JSON.
2. schemaVersion must map to local APP_SCHEMA_VERSION migration path.
3. sequence is monotonic per remote snapshot write.
4. savedAt is server timestamp assigned by proxy.

## 6. API Surface (Proxy)

1. GET /health
- Returns proxy status and minimal quota hints.

2. GET /snapshot
- Returns latest snapshot envelope.
- Error categories: auth_error, not_found, quota_error, transient_error, contract_error.

3. POST /snapshot
- Body: envelope candidate without server savedAt.
- Proxy validates contractVersion/schemaVersion/checksum.
- Proxy writes to Drive and returns persisted envelope metadata.

4. POST /dry-run/merge (placeholder for TKT-054)
- Accepts local+remote metadata only.
- Returns merge recommendation without writing.

## 7. Retry, Quota, and Degradation Policy

Retry policy (client side):
1. Retry only transient_error/network timeout/5xx.
2. Exponential backoff with jitter: 1s, 2s, 4s (max 3 retries).
3. No retry on auth_error, contract_error, quota_error.

Quota handling:
1. Map Drive/Apps Script quota issues to quota_error.
2. UI displays non-blocking warning and keeps local writes active.
3. Introduce cool-down window (15 min) before next automatic remote attempt.

Safe degradation:
1. Local persistence always succeeds/fails independently of remote.
2. Remote failures never block local save flows.
3. Last successful remote sync timestamp stored separately.
4. User can continue offline and retry later manually.

## 8. Security Baseline

1. No API keys in repository.
2. OAuth tokens handled by TKT-053 flow only.
3. Apps Script endpoint validates origin/session context.
4. Sensitive payload encryption deferred to TKT-055.

## 9. Observability and Audit Fields

Track locally:
1. lastRemoteSyncAt
2. lastRemoteSyncStatus (ok/error + category)
3. lastRemoteErrorMessage (sanitized)
4. lastRemoteSequence

Track in envelope:
1. deviceId
2. sequence
3. savedAt
4. checksum

## 10. Rollout Plan

1. TKT-053: GIS token flow and secure session handling in browser (no PKCE).
2. TKT-054: pull/push sync with version checks and dry-run merge path.
3. TKT-055: optional client-side encryption for remote payload.
4. TKT-056: conflict resolution UX and sync audit timeline.

## 11. Acceptance Mapping (TKT-052)

1. Target architecture defined: direct vs proxy decision documented (proxy selected).
2. Remote contract defined: schema/metadata/version/checksum envelope provided.
3. Retry/quota/degradation policy documented with explicit behavior.

## 12. Browser Validation (for this ticket)

This ticket is architecture/design only and does not ship runtime UI behavior yet.

Manual browser validation:
1. Open docs in repository and confirm this document is present and complete.
2. Confirm board marks TKT-052 as Done and checklist items checked.
3. Confirm no runtime regressions by loading app home screen after merge.
