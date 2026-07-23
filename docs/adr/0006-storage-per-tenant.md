# ADR 0006 — Storage documentale per tenant (Neon-only)

## Status

**Accepted (emended 2026-07-22)** — supersedes the prior “object-storage per tenant” decision.

## Context

Lean.Event ships as an enterprise commercial product. Document binaries and domain data must share one durable system of record per tenant for backup, audit, export, and integrity (SHA-256).

A mixed Neon + Vercel Blob architecture was introduced provisionally and is **rejected** as the definitive model.

## Decision

1. **Every tenant has a dedicated Postgres database** (see ADR 0005).
2. **Document binaries live in that tenant database**:
   - `lean_event_documents` — metadata / links only (no BYTEA)
   - `lean_event_document_versions` — immutable version descriptors (no BYTEA)
   - `lean_event_document_chunks` — binary payload (BYTEA chunks)
3. **No Object Storage / Vercel Blob / S3 / R2 as runtime system of record.**
4. The **Storage Resolver** resolves tenant document access against **Postgres**. Application/domain code must not treat Blob as the write path.
5. During cutover only, **read-only Blob fallback** may remain for legacy paths until inventory → migration → hash verify → **explicit human approval** to decommission.

## Motivation

- Single backup/restore engine (Postgres)
- Integrity (SHA-256) and append-only versions in-DB
- No dual-write / orphan risk between DB and object store
- Commercial export/exit of a tenant = DB dump (+ optional binary export from chunks)

## Alternatives considered

| Alternative | Outcome |
|-------------|---------|
| Vercel Blob store per tenant | Rejected as SoT — kept only as temporary legacy source |
| Shared Blob with prefixes | Rejected (isolation + ops) |
| JSON-in-Blob as entity SoT | Rejected — typed Neon tables remain SoT for domain |
| Inline BYTEA on `document_versions` | Rejected — chunks only |

## Consequences

- Schema `008` required on every tenant DB.
- Migration ledger (`lean_event_blob_migration_ledger`) tracks Blob → Postgres cutover.
- Blob tokens/stores must not be deleted until the decommission gate is signed.
- CI gate R03 will forbid new `@vercel/blob` imports in application code after cutover.

## Verification

- Document store tests T01–T12
- Migration ledger + SHA-256 verify
- Architecture naming / R03 gates
