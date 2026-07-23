# Lean Event — rilasci prodotto (Info + campanella)

Fonte unica (SoT): tabella Control Plane Neon **`lean_event_platform_releases`**  
Database: `lean_event_control_plane` · env `LEAN_EVENT_CONTROL_PLANE_DATABASE_URL`.

Schema: [`platform/registry-schema/cp_002_platform_releases.sql`](../platform/registry-schema/cp_002_platform_releases.sql)

Non usare file JSON sotto `data/` come source of truth dei rilasci.

## Setup

```bash
npm run lean-event:apply-control-plane
npm run lean-event:seed-control-plane-releases
```

## Workflow a ogni pubblicazione

1. Bump `package.json` → `version` (e/o env `LEAN_EVENT_PRODUCT_VERSION` su Vercel).
2. Upsert una riga in `lean_event_platform_releases` (via seed script o SQL Neon Console), con:
   - `version`, `published_at`, `title`, `summary`
   - `highlights` (array JSON breve)
   - `technical_refs` (path schema/API/docs)
   - `changes_from_previous` (poche righe: differenza vs release precedente)
   - `architecture_version` (es. `1.0.0`)
3. Aggiorna lo seed script `scripts/seed-control-plane-releases.mjs` se vuoi riproducibilità locale/CI.
4. Deploy.

Effetti automatici:

- **Menu account → Info**: versione corrente online + storico con delta e refs tecnici.
- **Campanella Notifiche**: notifica `release-{version}` (priorità high) da `GET /api/leanyou/product-notifications`.

Messaggi campanella non legati a una versione → tabella Control Plane `lean_event_platform_announcements` (`npm run lean-event:seed-control-plane-announcements`). Non JSON, non Blob.
