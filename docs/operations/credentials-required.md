# Credentials required — Lean.Event (Neon-only document store)

> **Riuso obbligatorio:** prima di creare risorse, seguire `docs/operations/provisioning-reuse-inventory.md`.  
> Non creare un nuovo progetto Neon/Vercel se quello Lean.Event esiste già.

## Required (runtime definitivo)

| Variable | Purpose |
|----------|---------|
| `LEAN_EVENT_CONTROL_PLANE_DATABASE_URL` | Control Plane Postgres |
| `LEAN_EVENT_TENANT_<SLUG>_DATABASE_URL` | Dedicated DB URL per tenant |
| `LEAN_EVENT_DATABASE_URL` | Legacy/shared bridge during cutover (neondb or active tenant) |
| `LEAN_EVENT_SESSION_SECRET` | Session signing |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Async jobs |
| `OPENAI_API_KEY` | AI Gateway provider |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

## Cutover-only (do not delete yet)

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Often equals demo store today — **not** sufficient for legacy `leanme-event` |
| `LEAN_EVENT_TENANT_IEC_BLOB_TOKEN` | Store `lean-event-iec` (empty) — keep until decommission approval |
| `LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN` | Store `lean-event-demo` (empty) — keep until decommission approval |
| `LEAN_EVENT_LEGACY_BLOB_TOKEN` | **Required for full inventory** of store `leanme-event` (`store_FYsZWRl3jhb4pwv1`) — copy RW token from Vercel Storage dashboard; do not overwrite tenant tokens |
| `LEAN_EVENT_BLOB_LEGACY_READ` | Optional: set `0` to disable Blob read fallback after migration |

## Optional (automation)

| Variable | Purpose |
|----------|---------|
| `NEON_API_KEY` + `NEON_PROJECT_ID` | Auto-create tenant databases |
| `VERCEL_TOKEN` | Ops only — **not** for new Blob stores as SoT |

## Operator actions (document cutover)

1. **Restore legacy Blob token** from Vercel → Storage → **`leanme-event`** (`store_FYsZWRl3jhb4pwv1`) into `LEAN_EVENT_LEGACY_BLOB_TOKEN`.
2. Run inventory: `node --env-file=.env.local scripts/inventory-blob-stores.mjs --out=tmp/blob-inventory.json`
3. Migrate binaries: `node --env-file=.env.local scripts/migrate-blob-inventory-to-postgres.mjs --inventory=tmp/blob-inventory.json --write`
4. Verify ledger + SHA-256; **do not delete Blob** until explicit approval.

## Stato operativo (2026-07-22 evening)

| Voce | Stato |
|------|--------|
| Control Plane / tenant DB | SET |
| Schema `008` documenti | Applied on demo/iec/neondb |
| Blob stores iec/demo | Reachable tokens; **0 objects** |
| Blob store legacy `leanme-event` | **Blocked** — production/env tokens point to demo store; dashboard RW token still required |
| Document runtime | Postgres writes; Blob read fallback only |
| Blob decommission | **Not authorized** |
