# Lean Event · Criteri di retention e sostenibilità (memorizzati)

**Decisione:** 2026-07-16  
**Stato:** attiva in codice  
**Rivalutare:** quando un tenant supera ~1k eventi/contatto medi, o storage Blob versioni > soglia costo, o richiesta pack PLATINUM.

Costanti runtime: `lib/lean-event/entity-lifecycle.ts`  
Implementazione prune: `lib/lean-event/entity-db.ts` (Neon), `lib/lean-event/version-storage.ts` (Blob + FS)  
Cursor rule: `.cursor/rules/lean-event-retention.mdc`

---

## 1. Revisioni entità (Cronologia)

| Criterio | Valore | Costante |
|----------|--------|----------|
| Conserva ultime N | **50** | `LEAN_EVENT_VERSION_KEEP_LAST` |
| Conserva ultimi D giorni | **90** | `LEAN_EVENT_VERSION_KEEP_DAYS` |
| Regola prune | Elimina solo se **oltre N** *e* **più vecchia di D giorni** | `shouldPruneVersion` / SQL Neon |
| Store prune | Neon **+** Blob **+** FS locale | dopo ogni `saveEntityVersionSnapshot` |
| UI Cronologia | Prime **20**, poi “Mostra altre” | `LEAN_EVENT_VERSION_UI_PAGE_SIZE` |

**Perché OR (non AND sul keep):**  
Un contatto editato spesso tiene le ultime 50 anche oltre 90 giorni.  
Un contatto editato raramente tiene lo storico recente anche oltre 50 se entro 90 giorni.

**Non negoziabile finché non rivalutato:** non abbassare sotto 20/30 senza decisione prodotto esplicita.

### Rivalutazione futura (checklist)

- [ ] Misurare `COUNT(*)` su `lean_event_entity_versions` per tenant
- [ ] Misurare storage Blob sotto `lean-event/versions/`
- [ ] Feedback utente su “Ripristina revisione” (serve >50?)
- [ ] Pack PLATINUM: alzare N/D per tenant senza cambiare modello

---

## 2. Eventi collegati a un contatto (assignment)

| Criterio | Valore | Note |
|----------|--------|------|
| Tetto sui **dati** | **Nessuno** | Storico completo incluso eventi passati |
| UI default | **8** righe + “Mostra altri” | `LEAN_EVENT_CONTACT_EVENTS_UI_PAGE_SIZE` |
| Ordinamento | Prima in corso/futuri (`endDate >= oggi`), poi passati (data desc) | `listAssignmentsForContactWithEvents` |

**Perché nessun tetto dati:** nel tempo ogni persona può partecipare a molti eventi; tagliare i link rompe tracciabilità ospiti/report.

### Rivalutazione futura

- [ ] Se liste >100 assignment/contatto: aggiungere filtro anno / search nella scheda
- [ ] Indice Neon su `(payload->>'contactId')` per assignment se le liste diventano lente
- [ ] Non introdurre hard-delete assignment “vecchi” senza soft-delete + cestino

---

## 3. Cestino (invariato)

| Criterio | Valore |
|----------|--------|
| Soft delete retention | **30 giorni** (`LEONYOU_TRASH_RETENTION_DAYS`) |
| Purge | Cron giornaliero `/api/lean-event/cron/purge-trash` |

---

## 4. Cosa non confondere

| Layer | Limite? |
|-------|---------|
| Assignment contatto↔evento | No (solo UI pagina) |
| Snapshot revisioni | Sì (50 OR 90g) |
| File binari Verbali/PDF | Blob; backup in Fase C |
| Entità operative (contatti, eventi) | Soft delete 30g, non prune “per età” automatico |

---

## 5. Link

- Architettura fasi: `docs/leanyou-data-resilience.md` §3.2  
- Ops SQL: `docs/lean-event-ops-cheatsheet.md` (sezione Retention)  
- Schema: `docs/sql/001_lean_event_schema.sql`
