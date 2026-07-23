# Lean.Event — Architecture Mandate (v1.0)

**Status:** Approved · binding  
**Product name:** Lean.Event  
**Approved:** 2026-07-22  

This document is the official architectural mandate for Lean.Event.  
It supersedes provisional product names (`Leonardo`, `LeanYou`) for the product, shell, routes, Core, and infrastructure.

## Mission

Lean.Event is an enterprise commercial product. Architecture must be definitive from v1.0. Features may ship progressively; foundations must not.

## Non-negotiable foundations

1. Control Plane dedicated (no customer operational data).
2. One Postgres database per tenant.
3. **Document storage in the tenant Postgres DB only** (metadata + versions + BYTEA chunks). No Object Storage / Vercel Blob as system of record.
4. Tenant Registry + Database Connection Resolver (mandatory, fail-closed).
5. Storage Resolver (mandatory, fail-closed) — Postgres-backed; Blob only as temporary legacy read during cutover.
6. AI Gateway as the only AI entry point (OpenAI first provider).
7. Assistant Registry with **technical profile IDs** (no commercial agent names in architecture).
8. Domain Events operational.
9. Async jobs via **Inngest** behind an application contract.
10. Versioned APIs: `/api/v1/lean-event`, `/api/v1/platform`.
11. Module Registry + commercial packs (CORE / PRO / AI / PLATINUM).
12. Build Information with real data.
13. Hierarchical documentation under `docs/` (product only).
14. No shared domain DB as primary isolation at completion; no shared Object Storage.
15. No permanent legacy aliases.
16. Blob stores/tokens may be decommissioned only after inventory → migration → hash verify → **explicit human approval**.

## Naming

| Context | Form |
|---------|------|
| Folders, routes, packages, files | `lean-event` |
| JS/TS variables & functions | `leanEvent` |
| Classes, types, components | `LeanEvent` |
| Env / constants | `LEAN_EVENT` |
| SQL | `lean_event_` |
| UI / docs copy | `Lean.Event` |

Event TypeScript type: **`TenantEvent`**.

Hub route: **`/lean-event/{tenantSlug}`**.

AI routes: functional only, e.g. `/lean-event/{tenantSlug}/ai/verbali`.

## Agent commercial names

Names such as Leonardo, Teresa, Marconi, Vespucci, Galileo, Angela, Olivetti are **display/configuration only** via Assistant Registry.  
They must not appear in technical folders, routes, APIs, types, tables, env keys, job types, or domain events.

## Safety baseline

- Backup folder: `.lean-event-data/architecture-backups/20260722-145925/`
- Git tag: `safety/pre-architecture-v1-20260722-145925`

## Related

- Design principles: `docs/design/lean-event-design-principles.md`
- Naming: `docs/design/naming-conventions.md`
- ADR index: `docs/adr/README.md`
