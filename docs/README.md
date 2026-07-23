# Lean.Event — Start here

**Product:** Lean.Event  
**Repo:** leanme-event  
**Dev:** http://localhost:3012  
**Prod target:** https://events.leanme.it  

## Read in this order

1. [Architecture Mandate](./design/lean-event-architecture-mandate.md)
2. [Design Principles](./design/lean-event-design-principles.md)
3. [Naming Conventions](./design/naming-conventions.md)
4. [Architecture Overview](./architecture/overview.md)
5. [ADR index](./adr/README.md)
6. Module docs under `modules/`
7. Operations / runbooks

## Structure

| Path | Content |
|------|---------|
| `design/` | Constitution, principles, naming, reviews |
| `architecture/` | System design |
| `modules/` | Per-module docs |
| `database/` | Control Plane + tenant DBs |
| `api/` | Versioned API contracts |
| `deployment/` | Environments, Vercel, build, [Architecture Deployment Plan](./deployment/architecture-deployment-plan.md) |
| `operations/` | Human ops procedures |
| `security/` | Security model |
| `adr/` | Architecture Decision Records |
| `runbooks/` | Incident / DR procedures |
| `roadmap/` | Product features only (not architecture migration) |
| `legacy/` | Temporary cutover notes (must expire) |

## Site LeanMe docs

Site content lives outside this product tree (see `docs-site/` if present). Do not mix brand-site pages into Lean.Event product docs.

## Safety baseline (2026-07-22)

- Backup: `.lean-event-data/architecture-backups/20260722-145925/`
- Git tag: `safety/pre-architecture-v1-20260722-145925`
