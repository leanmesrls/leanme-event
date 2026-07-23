# Lean.Event — Naming Conventions

| Context | Form | Example |
|---------|------|---------|
| Product display | Lean.Event | UI copy, docs |
| Paths / packages | lean-event | `/lean-event/{slug}`, `components/lean-event` |
| Functions / vars | leanEvent | `leanEventHubPath` |
| Types / components | LeanEvent | `LeanEventShell` |
| Env / constants | LEAN_EVENT | `LEAN_EVENT_SESSION_SECRET` |
| SQL | lean_event_ | `lean_event_events` |
| Domain event type | TenantEvent | TypeScript event entity |

## Forbidden in technical architecture

- `Leonardo`, `LeanYou`, `leanyou` as product identifiers
- Commercial agent names in folders, routes, APIs, tables, types, env keys, job types

## AI technical IDs (examples)

- `meeting-minutes-assistant`
- `customer-support-assistant`
- `marketing-content-assistant`
- `graphic-content-assistant`

Display names are configured in Assistant Registry only.
