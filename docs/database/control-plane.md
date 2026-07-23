# Control Plane Database

Holds Tenant Registry, provisioning state, module catalog, platform audit, job metadata (Inngest ids), health, **platform product releases** and **platform announcements** (Info + campanella).

Never holds customer events/contacts/documents content.

Not Vercel Blob. Not JSON files as SoT.

## Platform releases (`lean_event_platform_releases`)

Single Source of Truth for product version history shown in **Menu account → Info** and derived notification entries in the bell.

- Schema: `platform/registry-schema/cp_002_platform_releases.sql`
- Apply: `npm run lean-event:apply-control-plane`
- Seed / upsert release notes: `npm run lean-event:seed-control-plane-releases`
- Runtime read: `lib/lean-event/releases.ts` via Control Plane client
- API for UI campanella: `GET /api/leanyou/product-notifications`

Do **not** store release SoT in JSON files under `data/`.

## Neon convention (frozen)

- Database name: **`lean_event_control_plane`** (unique Control Plane DB).
- Lives in the **existing official Lean.Event Neon project** (no second project by default).
- **`neondb`** is not the Control Plane — it is only the cutover/migration source for legacy shared data.
- Env: `LEAN_EVENT_CONTROL_PLANE_DATABASE_URL`

See: `docs/operations/provisioning-reuse-inventory.md` §0 · ADR `0005`.
