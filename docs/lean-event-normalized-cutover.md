# Lean Event · Cutover normalizzato (JSONB → tabelle + FK)

**Decisione:** 2026-07-21 — **cutover totale**: abbandonare `lean_event_entities.payload` come source of truth.  
**Stato:** N4 chiuso (2026-07-22) — SoT + read tipizzati; mirror JSONB spento.  
**Patto:** zero perdita — `docs/lean-event-commercial-pact.md`.

---

## 1. Target

| Prima | Dopo |
|-------|------|
| Una riga `lean_event_entities` + JSONB | Tabella tipizzata per entità + child tables |
| Relazioni in `payload.eventId` … | **FOREIGN KEY** composite `(tenant_id, …)` |
| Filtri via expression index / L2 | Colonne native + indici B-tree |

### Eccezione JSONB (unica)

- `workspaces.structured` — output AI schemaless → resta `JSONB`.  
- Tutto il resto: colonne o child table.

### Soft delete + FK

- Soft delete **non** rimuove la riga → le FK restano valide.  
- Hard delete (purge cestino): ordine figli → padre; `ON DELETE RESTRICT` di default.  
- Non usiamo `ON DELETE CASCADE` sul dominio (evita wipe accidentali).

### Multi-tenant

- PK tipica: `(tenant_id, id)`.  
- FK tipica: `(tenant_id, event_id) REFERENCES lean_event_events (tenant_id, id)`.

---

## 2. Fasi

| Fase | Cosa | Gate |
|------|------|------|
| **N0** | Doc + DDL `006` | Schema applicato su Neon |
| **N1** | ETL `entities` → tabelle; verify conteggi | Diff = 0 su id/revision |
| **N2** | Dual-write tipizzato (+ mirror JSONB) | `NORMALIZED_SOT=1` — ✅ |
| **N3** | Letture tipizzate | `READ_NORMALIZED=1` — ✅ |
| **N4** | Stop mirror JSONB | `LEGACY_ENTITY_MIRROR=0` — ✅ locale + Vercel production |
| **N4** | Stop write JSONB SoT; `entities` solo archivio/legacy | ✅ SoT = tabelle tipizzate |
| **N5** | (Dopo stabilità) deprecare / archiviare `lean_event_entities` | Opzionale — non droppare finché non firmato |

Script:

- Apply: `npm run lean-event:apply-neon-006`
- Migrate: `npm run lean-event:migrate-normalized`
- Verify: `npm run lean-event:verify-normalized`
- Smoke: `npm run lean-event:smoke-normalized`
- FK documenti: `npm run lean-event:apply-neon-007`
- Flag Vercel: `npm run lean-event:sync-vercel-normalized`

---

## 3. Mappa tabelle

| Dominio | Tabella |
|---------|---------|
| Sede | `lean_event_venues` |
| Contatto | `lean_event_contacts` + `contact_emails` / `phones` / `tags` / `privacy_consents` |
| Fornitore | `lean_event_suppliers` + `supplier_agreements` |
| Evento | `lean_event_events` + venue cols, registration, ecm, hotel tree, sponsors, program, PM |
| Assignment | `lean_event_assignments` → FK event+contact + hospitality/travels/nights |
| Link fornitore | `lean_event_event_supplier_links` → FK event+supplier |
| Workspace | `lean_event_workspaces` → FK event opzionale |
| Chat evento | `lean_event_event_chat_threads` + `messages` |
| Teresa | `lean_event_teresa_chat_threads` + `messages` |
| Documenti / audit / versions | restano tabelle già esistenti (allineare FK logiche) |

DDL: `docs/sql/006_lean_event_normalized.sql`.

---

## 4. Compatibilità codice

- TypeScript domain objects (`types/lean-event.ts`) restano la shape API/UI.  
- Mapper `lib/lean-event/normalized/*` row ↔ domain.  
- Con `LEAN_EVENT_LEGACY_ENTITY_MIRROR=0` non si aggiorna più `lean_event_entities` in write path.

Env:

| Var | Significato |
|-----|-------------|
| `LEAN_EVENT_NORMALIZED_SOT=1` | Write path primario = tabelle tipizzate |
| `LEAN_EVENT_READ_NORMALIZED=1` | Read path primario = tabelle tipizzate |
| `LEAN_EVENT_LEGACY_ENTITY_MIRROR=0` | N4: stop mirror JSONB (rollback: rimetti `1`) |

---

## 5. Rollback

1. Impostare `LEAN_EVENT_LEGACY_ENTITY_MIRROR=1` e/o disabilitare `READ_NORMALIZED` / `NORMALIZED_SOT`.  
2. Ripristinare letture da `lean_event_entities` / Blob se necessario.  
3. Tabelle `lean_event_*` tipizzate restano; non droppare finché verify non è firmato.
