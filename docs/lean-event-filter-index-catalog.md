# Lean Event · Catalogo filtri & indici (sostenibile)

**Versione:** 2026-07-21  
**Principio:** `payload` JSONB = source of truth del documento. I filtri a scala vivono su un livello di accesso dichiarato (L1 → L2 → L3 → L4), non su scan ad-hoc del blob.

Vedi anche: `docs/sql/001_*.sql` … `005_*.sql`, `docs/leanyou-data-resilience.md`.

---

## 1. Escalation

| Livello | Quando | Come |
|---------|--------|------|
| **L0 App** | Volume basso / prototipo | Lista completa → filtro in JS (stato attuale molte liste) |
| **L1 Expression index** | Filtro UI/API selettivo su una chiave | `(payload->>'campo')` + `WHERE entity_type=… AND deleted_at IS NULL` |
| **L2 Generated column** | Filtro/sort tipizzato ricorrente (bool, date) | Colonna `STORED` + indice (spesso partial) |
| **L3 Projection / search table** | Facet combinati a scala commerciale | Tabella denormalizzata aggiornata nella stessa write |
| **L4 Full-text / GIN** | Solo testo libero | `tsvector` o GIN su sottoinsieme cercabile |

### Regola di release

1. Nuovo filtro in UI → riga in questo catalogo.  
2. Se il volume può superare ~10–20k righe/tenant → almeno L1 (o L2 se tipizzato).  
3. Migrazione in `docs/sql/00N_….sql` + `npm run lean-event:apply-neon-00N`.  
4. Query ops in `docs/lean-event-ops-cheatsheet.md`.  
5. **Vietato:** GIN globale su tutto il `payload` come unica strategia; indici “preventivi” non usati dal prodotto.

---

## 2. Indici Neon esistenti (`lean_event_entities`)

| Indice | Livello | Chiave / scope |
|--------|---------|----------------|
| `idx_lean_event_entities_tenant_type` | base | `(tenant_id, entity_type)` active |
| `idx_lean_event_entities_trash` | base | trash `purge_after` |
| `idx_lean_event_entities_updated` | base | `(tenant_id, entity_type, updated_at DESC)` |
| `idx_lean_event_events_linked` | L1 | workspace `linkedEventId` |
| `idx_lean_event_assignments_event` | L1 | assignment `eventId` |
| `idx_lean_event_assignments_contact` | L1 | assignment `contactId` |
| `idx_lean_event_supplier_links_event` | L1 | event_supplier_link `eventId` |
| `idx_lean_event_supplier_links_supplier` | L1 | event_supplier_link `supplierId` |
| `idx_lean_event_chat_event` | L1 | event_chat `eventId` |
| `idx_lean_event_contacts_email` | L1 | contact `lower(email)` |
| `idx_lean_event_*_country` / region | L1 | geo 004 |
| `idx_lean_event_events_favorite` | **L2** | event `is_favorite = true` (005) |
| `idx_lean_event_events_start_date` | L1 | event `startDate` (005) |

Documenti: indici su colonne di `lean_event_documents` (già SQL-scoped).

---

## 3. Catalogo filtri prodotto

| entity_type | Campo filtro/sort | Dove oggi | Livello target | Stato |
|-------------|-------------------|-----------|----------------|-------|
| event | testo (title, cdc, venue, REF) | UI client | L4 futuro / L0 ok | L0 |
| event | sort `startDate` | UI client | L1 | indice 005; sort ancora client |
| event | **`isFavorite`** | UI lista + PATCH | **L2** | payload + colonna `is_favorite` + partial index |
| event | `status` | display | L1 se chip filtro | gap |
| contact | testo / tag | UI client | L1 email ok; tags GIN futuro | L0 + email idx |
| contact | country / region | ops / futuro UI | L1 | indici 004 |
| supplier | `categoryId` | UI client | L1 | gap |
| assignment | `eventId` / `contactId` | API | L1 | **SQL-scoped** (usa indici 001/002) |
| assignment | `roleCategory` | UI Guests | L1 | gap |
| event_supplier_link | `eventId` | API | L1 | **SQL-scoped** (usa indice 003) |
| documents | kind / person / event | API SQL | colonne | fatto |

---

## 4. Preferiti evento (L2)

- Campo documento: `payload.isFavorite` (boolean, default `false`).  
- Colonna generata: `lean_event_entities.is_favorite`.  
- Indice partial: solo `entity_type = 'event' AND is_favorite AND deleted_at IS NULL`.  
- Scope: **flag a livello evento/tenant** (non per-utente). Preferiti per-utente = modello diverso (join), fuori scope.  
- UI: stellina in lista Eventi + chip “Solo preferiti” (filtro client finché la lista resta full-load; SQL ready via `is_favorite`).

Apply: `npm run lean-event:apply-neon-005`

---

## 5. Prossimi gap (priorità)

1. L1 `supplier.categoryId` quando la rubrica fornitori scala.  
2. L1 `assignment.roleCategory` (+ eventuale composito con `eventId`).  
3. L2 `start_date` date tipizzata se sort/range SQL diventa hot path.  
4. L3 `contact_search` solo se facet combinati diventano lenti a decine di k.
