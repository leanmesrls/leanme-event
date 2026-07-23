# Tenant Database

One Postgres database per tenant. Canonical migrations in `platform/migrations/tenant/`.

`tenant_id` column remains as logical defense-in-depth.

## Neon convention (frozen)

- Naming: **`lean_event_t_<slug>`** (example: `lean_event_t_iec`).
- Location: **same** official Lean.Event Neon project as the Control Plane (unless a future Enterprise decision says otherwise).
- Do not put operational tenant data in `lean_event_control_plane` or keep it long-term in shared `neondb`.
- Env ref pattern: `LEAN_EVENT_TENANT_<SLUG>_DATABASE_URL`

See: `docs/operations/provisioning-reuse-inventory.md` §0 · ADR `0005`.
