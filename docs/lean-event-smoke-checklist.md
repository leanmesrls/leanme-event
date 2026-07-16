# Lean Event · Smoke checklist produzione

**Ambiente:** https://event.leanme.it  
**Prerequisito env:** `LEAN_EVENT_READ_FROM_NEON=1`, `LEAN_EVENT_DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `LEAN_EVENT_SESSION_SECRET`, `LEAN_EVENT_TENANTS_JSON`, `CRON_SECRET`

Usare dopo ogni deploy che tocca storage/auth/cron. Firmare riga per riga.

| # | Check | OK |
|---|--------|----|
| 1 | Login tenant demo / cliente | ☑ |
| 2 | Apri contatto esistente → salva nota → revision +1, Cronologia mostra snapshot | ☑ |
| 3 | Soft-delete contatto → compare in Cestino → ripristina | ☑ |
| 4 | Cronologia → ripristina revisione precedente → audit `version_restore` (Neon) | ☑ |
| 5 | Due tab stesso evento: salva su A, poi salva su B → dialog conflitto / banner stale | ☑ |
| 6 | Import Excel fornitori (modello) → contatore creati/saltati | ☑ |
| 7 | Import Excel eventi → evento compare in elenco | ☑ |
| 8 | `POST /api/lean-event/documents` (CV di test) → `GET` lista con filtri | ☑ |
| 9 | Soft-delete documento → restore | ☑ |
| 10 | Cron (con secret): `GET /api/lean-event/cron/backup-blob` → 200 + manifest Blob | ☑ |
| 11 | Cron: `GET /api/lean-event/cron/export-tenants` → 200 + export per tenant | ☑ |
| 12 | Query Neon: riga in `lean_event_audit_events` dopo un salvataggio | ☑ |
| 13 | Query Neon: entity dopo edit allineata a UI (revision) | ☑ |

**Stato:** firmata e chiusa  
**Firma operativa:** Luana Martuzzi · data 16/07/2026  
**Deploy di riferimento:** `bc89286` (Phase C solidity) su https://event.leanme.it

Note recovery: i backup Blob sono inventari/manifest sotto `lean-event/backups/YYYY-MM-DD/`; l’export tenant settimanale è sotto il prefisso documentato in `lib/lean-event/tenant-export.ts`.
