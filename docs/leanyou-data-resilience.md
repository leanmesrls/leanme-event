# Lean Event · Resilienza dati, concorrenza, versioning e cestino

**Versione documento:** 2026-07-15  
**Stato:** architettura approvata — implementazione per fasi  
**Scope:** multi-utente simultaneo, storico versioni, backup/recovery, cestino 30 giorni — **inclusi workspace verbali** (trascrizione + documenti generati)

**Ops rapido (PowerShell + SQL Neon):** `docs/lean-event-ops-cheatsheet.md`

---

## 1. Problema attuale

| Aspetto | Stato oggi | Rischio |
|---------|------------|---------|
| Persistenza | JSON su Blob (prod) / `.lean-event-data` (locale) — **Fase A attiva** | Last-write-wins senza Neon; merge in Fase B+ |
| Concorrenza | Optimistic locking (`revision`) su entità gestite | Solo Events/assignment/workspace + PATCH API; UI merge in Fase C/D |
| Versioni | Snapshot Blob `lean-event/versions/…` | Non ancora UI cronologia (Fase B) |
| Eliminazione | Soft delete + cestino 30 gg + cron purge | Purge definitivo solo dopo retention |
| Backup | Nessuno sistematico giornaliero | **Fase C** (cron snapshot Blob) |
| **Verbali (workspace)** | Lifecycle Fase A OK (soft delete, revision, cestino) | Backup + Neon metadati in Fase B/C |
| Audit | JSONL / Vercel Logs parziale | Estensione mutazioni in Fase C |

**Obiettivo:** lavoro contemporaneo sicuro su un evento **e sui verbali**, ripristino versioni, recupero post-crash, cestino 30 giorni.

---

## 2. Soluzione consigliata (best fit LeanMe / Vercel)

### Stack target

| Layer | Tecnologia | Ruolo |
|-------|------------|--------|
| **Database transazionale** | [Neon Postgres](https://neon.tech) (serverless, integrazione Vercel) | Metadati, revisioni, cestino, lock logici, indici |
| **File & snapshot grandi** | Vercel Blob (store esistente) | Documenti allegati, export, snapshot JSON compressi |
| **Backup automatico** | Neon PITR + Cron Vercel snapshot Blob | Recovery multi-livello |
| **Notifiche concorrenza** | Polling leggero o SSE (fase 2) | “Evento aggiornato da Luana” |

**Perché Postgres e non solo Blob?**  
Blob è ottimo per file immutabili; non offre transazioni ACID, query su cestino/scadenze, né conflict detection affidabile su campi parziali. Postgres + Blob è il pattern standard per SaaS multi-tenant su Vercel.

**Alternativa minima (solo Blob, senza DB):** possibile come **fase 0** a breve termine, ma più fragile (cestino e versioni via prefissi path, purge manuale, conflitti solo su `updatedAt`). **Non consigliata oltre il pilota IEC.**

---

## 3. Modello dati unificato

### 3.1 Campi su ogni entità gestita

```typescript
interface Lean EventEntityBase {
  id: string;
  tenantId: string;
  revision: number;           // incrementa ad ogni save riuscito
  createdAt: string;
  updatedAt: string;
  createdBy: string;          // userId sessione
  updatedBy: string;
  deletedAt: string | null;   // null = attivo; valorizzato = in cestino
  deletedBy: string | null;
  purgeAfter: string | null;  // deletedAt + 30 giorni (ISO)
}
```

### 3.2 Tabella versioni (Postgres)

```sql
CREATE TABLE entity_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,  -- event | contact | venue | supplier | ...
  entity_id     TEXT NOT NULL,
  revision      INT NOT NOT NULL,
  snapshot      JSONB NOT NULL,
  changed_by    TEXT NOT NULL,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  UNIQUE (tenant_id, entity_type, entity_id, revision)
);
CREATE INDEX idx_versions_lookup ON entity_versions (tenant_id, entity_type, entity_id, revision DESC);
```

- **Policy retention (attiva in codice):** ultimi **50** revisioni per entità **oppure** tutte quelle degli ultimi **90 giorni** (si conserva se soddisfa almeno uno dei due). Prune automatico su **Neon + Blob + FS** dopo ogni insert versione.
- UI Cronologia: mostra **20** revisioni, poi “Mostra altre”.
- Criteri memorizzati per rivalutazioni: **`docs/lean-event-retention-criteria.md`** + rule `.cursor/rules/lean-event-retention.mdc`.
- Snapshot documenti pesanti: JSON metadati in Postgres, blob path in `snapshot.attachments[]`.
- Pack PLATINUM (futuro): alzare `LEAN_EVENT_VERSION_KEEP_LAST` / `KEEP_DAYS` per tenant.

### 3.3 Cestino (soft delete)

| entity_type | In cestino | Relazioni |
|-------------|------------|-----------|
| `event` | Sì | Assegnazioni ospiti → cestino cascata opzionale (config) |
| `contact` | Sì | Collegamenti evento restano storici |
| `venue` | Sì | Eventi mantengono snapshot testo sede |
| `supplier` | Sì | Link evento → storico |
| `event_assignment` | Sì | — |
| `event_supplier_link` | Sì | Documenti link → cestino |
| **`workspace` (verbale)** | **Sì — obbligatorio** | `linkedEventId` resta storico; tab evento nasconde verbali in cestino |
| `document` | Sì | File Blob spostato in `trash/` prefix, non eliminato |

**Regole cestino:**

- Retention **30 giorni** (`purgeAfter = deletedAt + 30d`).
- Job giornaliero (`purge-expired-trash`) elimina definitivamente entità scadute + blob associati.
- Ripristino: `deletedAt = null`, incremento `revision`, nuova riga in `entity_versions` (`action: restore`).
- UI: sezione **Cestino** in Leonardo (filtro per tipo, search, “Ripristina” / “Elimina definitivamente” — solo admin).

---

## 4. Concorrenza multi-utente

### 4.1 Optimistic locking (obbligatorio)

Ogni PATCH/PUT invia:

```json
{ "expectedRevision": 12, "...fields": "..." }
```

Server:

1. Legge entità corrente (esclusi `deletedAt != null` salvo restore).
2. Se `entity.revision !== expectedRevision` → **409 Conflict** + payload:

```json
{
  "error": "CONFLICT",
  "currentRevision": 13,
  "updatedAt": "...",
  "updatedBy": "luana.martuzzi@leanme.it",
  "serverSnapshot": { /* campi rilevanti o diff */ }
}
```

3. Client mostra modal: **Ricarica** | **Sovrascrivi** (solo se capability admin) | **Unisci** (fase 2).

### 4.2 Granularità write

| Risorsa | Strategia |
|---------|-----------|
| Anagrafica evento | Lock ottimistico su intero evento |
| Ospite (assignment) | Lock per `assignmentId` — due utenti su ospiti diversi: nessun conflitto |
| Fornitore evento (link) | Lock per `linkId` |
| Documento | Lock per `documentId` + upload immutabile (nuova versione doc) |
| Allotment / hotelBlocks | Lock su evento (sezione critica — warning UI se altri online) |

### 4.3 Presenza (fase 2)

Tabella `entity_presence` (heartbeat ogni 30s, TTL 90s):

- “Luana · tab Ospiti · 2 min fa”
- Non blocca editing (informativo); opzionale lock pessimista solo su pack enterprise.

### 4.4 Sync UI

- Polling ogni **45s** sulla scheda evento aperta (`GET /events/:id?fields=revision,updatedAt`).
- Banner se `revision` server > client: “Dati aggiornati — ricarica o confronta”.

---

## 5. Backup e disaster recovery

### Livello 1 — Continuo (Neon)

- **Point-in-Time Recovery (PITR)** Neon Pro: ripristino DB a qualsiasi secondo negli ultimi **7–30 giorni**.
- Costo: incluso nel piano Neon (~$19/mese Pro) — **consigliato per produzione IEC**.

### Livello 2 — Snapshot Blob giornaliero

Cron Vercel (`0 3 * * *` UTC):

```
leanyou-backups/{YYYY-MM-DD}/{tenantId}/{entityType}/*.json.gz
```

- Copia incrementale prefissi: `lean-event/events/`, `lean-event/contacts/`, `lean-event/event-assignments/`, **`lean-event/workspaces/`** (JSON con transcript + HTML documenti), allegati evento.
- Retention snapshot: **90 giorni** (poi lifecycle delete su prefix backup).

### Livello 3 — Export tenant settimanale

- ZIP criptato (AES-256, chiave in Vercel env) per tenant → Blob `leanyou-exports/{tenantId}/weekly/`.
- Downloadabile da admin Lean Event / LMI per compliance e archivio cliente.

### Livello 4 — Audit immutabile

Estendere `audit-log` verso:

- Postgres `audit_events` append-only **oppure**
- Log Drain Vercel → Datadog / Axiom (retention 1 anno).

Ogni `create | update | delete | restore | purge` su entità gestita.

### Recovery playbook

| Scenario | Azione |
|----------|--------|
| Utente sovrascrive per errore | Ripristino da `entity_versions` (UI “Cronologia”) |
| Eliminazione accidentale | Cestino entro 30 giorni |
| Bug deploy corrompe dati | Neon PITR + restore snapshot Blob del giorno precedente |
| Perdita regione / disaster | Export settimanale + backup Blob cross-region (fase 3) |

---

## 6. Documenti allegati

Pattern **immutabile**:

```
leanyou/documents/{tenantId}/{entityType}/{entityId}/{documentId}/v{version}/{filename}
```

- Nuovo upload = nuova versione file; metadati in Postgres.
- Delete = sposta path sotto `leanyou/trash/...` con stessa struttura + record cestino.
- Antivirus scan (fase 3) su upload.

---

## 7. API nuove (contratto)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/lean-event/trash` | Lista cestino tenant (paginata) |
| POST | `/api/lean-event/trash/{type}/{id}/restore` | Ripristino |
| DELETE | `/api/lean-event/trash/{type}/{id}` | Purge immediata (admin) |
| GET | `/api/lean-event/entities/{type}/{id}/versions` | Storico revisioni |
| POST | `/api/lean-event/entities/{type}/{id}/versions/{rev}/restore` | Ripristina revisione |
| PATCH | `/api/lean-event/{type}/{id}` | Richiede `expectedRevision` |

---

## 8. Piano di implementazione

### Fase A — Fondamenta ✅ chiusa (2026-07-15)

- [x] Aggiungere `revision`, `deletedAt`, `deletedBy`, `purgeAfter` ai tipi TypeScript
- [x] Wrapper save con versioning + soft delete in `entity-lifecycle.ts` / domain layer
- [x] Optimistic locking su **evento**, **assignment**, **contact/venue/supplier**, **workspace**
- [x] Soft delete per eventi, contatti, fornitori, sedi, assignment, **workspace (verbali)**
- [x] Snapshot versione su Blob/filesystem: `lean-event/versions/{tenantId}/...`
- [x] API + UI cestino base (`/leonardo/cestino`) incluso tipo Verbale
- [x] Cron purge 30 giorni: `vercel.json` → `/api/lean-event/cron/purge-trash` (`0 3 * * *`)
- [x] Regole **safe schema change** (§14) + Cursor rule `.cursor/rules/lean-event-data-schema.mdc`

### Fase B — Postgres + Cronologia (implementazione ✅; smoke ✅ 2026-07-16)

- [x] Schema SQL Neon: `docs/sql/001_lean_event_schema.sql`
- [x] Provisioning Neon + `LEAN_EVENT_DATABASE_URL` (locale + Vercel)
- [x] Client Postgres (`@neondatabase/serverless`) + **dual-write** su mutazioni
- [x] Script migrazione FS → Neon: `npm run lean-event:migrate-neon`
- [x] Migrazione Blob produzione → Neon + purge orfani locali
- [x] Cutover letture: flag `LEAN_EVENT_READ_FROM_NEON=1` (Neon first, fallback Blob)
- [x] Produzione: `LEAN_EVENT_READ_FROM_NEON=1` su Vercel + redeploy
- [x] UI Cronologia versioni in scheda (confronto/ripristino revisioni)
- [x] Smoke test produzione con letture Neon attive

### Fase C — Resilienza produzione (chiusura solidità · 2026-07-16)

- [x] Schema documenti + audit + indice assignment/contactId: `docs/sql/002_lean_event_documents_audit.sql`
- [x] Cron backup Blob giornaliero: `/api/lean-event/cron/backup-blob` (`30 2 * * *`)
- [x] Export settimanale tenant: `/api/lean-event/cron/export-tenants` (`0 4 * * 0`)
- [x] Audit write su Neon (`lean_event_audit_events`) per mutazioni entità + documenti + import + restore versioni
- [x] API registry documenti: `GET/POST /api/lean-event/documents`, `GET/DELETE/POST restore /api/lean-event/documents/[id]`
- [x] Import massivo fornitori + eventi (`POST .../suppliers/import`, `POST .../events/import`) + UI + modelli Excel
- [x] Polling revision + banner/dialog conflitto su contatto, sede, fornitore, evento
- [x] Smoke test produzione formale (`docs/lean-event-smoke-checklist.md` — firmata 2026-07-16, Luana Martuzzi)
- [x] `event_supplier_link` + `event_chat` su Neon (dual-write, soft delete, migrate collections)
- [x] Blob privati + download auth (travel / chat / supplier docs / documents registry)
- [x] Document download API + purge documenti nel cron cestino
- [x] Indici scala 003 + script `lean-event:apply-neon-001/003`
- [x] Backup Blob: prefissi event-assignments / event-suppliers / travel / chat
- [x] UI liste documenti dedicate (`/leonardo/documenti`)

Patto: `docs/lean-event-commercial-pact.md`  
Integrità: `docs/lean-event-integrity-status.md`  
Documenti: `docs/lean-event-document-architecture.md`

### Fase D — Presenza & merge avanzato (opzionale)

- [ ] Heartbeat presenza (`lean_event_entity_presence`)
- [ ] Merge campo-per-campo su conflitto
- [ ] SSE live updates

---

## 9. Sicurezza

- Tutte le operazioni scoped `session.tenantId` (invariato).
- Restore/purge definitivo: capability `admin` o `data_recovery`.
- Backup export cifrati; chiavi solo in env Vercel.
- Log accessi a ripristini versioni (compliance).
- GDPR: purge cestino automatico a 30 giorni; export su richiesta cliente.

---

## 10. Costi indicativi (IEC, uso tipico)

| Voce | Stima mensile |
|------|----------------|
| Neon Postgres Pro | ~$19 |
| Vercel Blob (storage + backup prefix) | ~€0–5 |
| Cron Vercel (Pro) | incluso |
| **Totale** | **~$20–25/mese** |

ROI: elimina rischio perdita eventi/ospiti multi-giorno — accettabile per piattaforma commerciale CORE→PLATINUM.

---

## 11. Riferimenti codice attuale

- Storage entità: `lib/lean-event/*-storage.ts`, `entity-blob-storage.ts`
- **Verbali:** `lib/lean-event/workspaces.ts`, soft delete + versioni + cestino
- Purge: `lib/lean-event/purge-trash.ts` + cron Vercel
- Schema Neon: `docs/sql/001_lean_event_schema.sql`
- Regole schema: §14 + `.cursor/rules/lean-event-data-schema.mdc`
- Audit parziale: `lib/lean-event/audit-log.ts`
- UI liste: `components/lean-event/leonardo-ui.ts` (`LEONARDO_LIST_UX_STANDARD`)

---

## 12. Decisione

**Soluzione migliore per Lean Event Leonardo:**  
**Neon Postgres (metadati + versioni + cestino + concorrenza) + Vercel Blob (file + snapshot backup) + Cron backup + soft delete 30 giorni.**

**Patto commerciale 2026-07-16:** non più prototipo — piattaforma **vendibile a moduli** con impegno **zero perdita dati**. Vedi `docs/lean-event-commercial-pact.md`.

## Requisito prodotto — tutto su DB (produzione multi-tenant)

**Target non negoziabile:** anagrafiche, eventi, ospiti, verbali (testo/HTML), preventivi, stampati metadati, archivi email metadati → **Neon Postgres**.  
**Blob:** solo file binari (PDF, audio/video, cover, allegati).  

Scala attesa: molti tenant, molti utenti concorrenti, migliaia di persone/eventi/documenti.  
Schema base: `docs/sql/001_lean_event_schema.sql` (`tenant_id` in PK, `revision`, soft delete, versioni).  
Cursor rule: `.cursor/rules/lean-event-db-target.mdc`.

**Stato 2026-07-16:** Neon allineato a Blob produzione. Dual-write + cutover + Fase C + **smoke prod firmato**. **Prossimo prodotto:** UI documenti, import async a scala, poi moduli faculty/attestati.

---

## 13. Verbali (workspace Leonardo) — requisito non negoziabile

I verbali contengono **ore di lavoro** (upload audio/video, Whisper, generazione OpenAI). Non possono essere trattati come dati secondari.

### Cosa proteggere

| Contenuto | Dove oggi | In Neon (Fase B) |
|-----------|-----------|------------------|
| Metadati (titolo, data, partecipanti, `linkedEventId`) | Campi root JSON | Riga `workspaces` + indici |
| Trascrizione Whisper | `transcript` nel JSON | Colonna `TEXT` o Blob ref se > 1 MB |
| Documenti generati (7 HTML) | `documents` nel JSON | JSONB + opz. Blob per export PDF futuro |
| Stato pipeline | `status`, `errorMessage` | Colonne |

**Source of truth:** resta un JSON per workspace su Blob (`lean-event/workspaces/...`); Postgres tiene metadati, revisioni e cestino queryable. Non duplicare il verbale dentro l’evento.

### Gap attuale (lean-event)

- ~~`LeonardoWorkspace` **senza** `revision`, `deletedAt`, `purgeAfter`~~ → **Fase A applicata (2026-07-15)**
- ~~`DELETE /api/lean-event/workspaces/{id}` → **elimina il file Blob**~~ → soft delete + cestino 30 gg
- Snapshot in `lean-event/versions/.../workspace/` ad ogni salvataggio
- Cestino UI: tipo `workspace` con ripristino
- Cron purge: hard delete dopo 30 giorni in cestino
- Cron backup: prefisso workspaces **da includere** (Fase C)

### Separazione leanme.site ↔ lean-event

| Ambiente | Repo / deploy | Prefisso Blob verbali |
|----------|---------------|------------------------|
| demo.leanme.it (site) | `leanme-site` | `leanyou/workspaces/` (legacy) |
| event.leanme.it | `leanme-event` | `lean-event/workspaces/` |

I verbali creati su **leanme.site non compaiono automaticamente** su event.leanme.it: store e prefissi Blob distinti. Perdita su site (es. dev locale senza Blob, redeploy senza `BLOB_READ_WRITE_TOKEN`, cancellazione `.lean-event-data` / data dir) **non si propaga** a lean-event, ma i dati site vanno recuperati dal Blob site o da backup.

**Prima del go-live IEC su event.leanme.it:** script one-shot di migrazione `leanyou/workspaces/` → `lean-event/workspaces/` per tenant IEC (se i verbali devono essere visibili sulla nuova piattaforma).

### Ordine implementazione verbali

1. ~~**Fase A:** lifecycle + soft delete + version snapshot + cestino `workspace`~~ ✅
2. **Fase B:** riga Neon `entity_type = workspace` + migrazione JSON esistenti
3. **Fase C:** backup giornaliero prefisso `lean-event/workspaces/` incluso nell’export tenant settimanale

---

## 14. Safe schema change (regole fisse)

I dati in produzione **non** vengono riscritti dal deploy. Un deploy aggiorna solo il codice. Ogni modifica a `types/lean-event.ts` o allo storage deve rispettare queste regole.

### 14.1 Deploy ≠ wipe

| Operazione | Effetto su Blob / tenant |
|------------|--------------------------|
| Push + redeploy Vercel | Nessuna cancellazione JSON |
| Aggiunta campo nel tipo TS | Record vecchi ok se c’è default in `normalize*` |
| Rename / remove / type change | Rischio dati “invisibili” se **non** segui §14.2–14.4 |
| Rimozione `BLOB_READ_WRITE_TOKEN` | App usa `/tmp` — **non** toccare in prod |
| Cambio `tenantId` in env | Path orfani — richiede migrazione esplicita |

### 14.2 Tipi di change consentiti

| Tipo | Procedura obbligatoria |
|------|------------------------|
| **Aggiungi campo** | Opzionale + default in `normalize*` / `withLifecycleDefaults`. Mai `required` senza backfill. |
| **Rinomina campo** | Shim dual-read (vecchio + nuovo) ≥ 1 release → script backfill Blob → rimuovi shim. |
| **Rimuovi campo** | Smetti di esporre in UI/API; **non** strippare al save finché non deciso esplicitamente. Le versioni restano leggibili. |
| **Cambia tipo/semantica** | Come rename + migrazione; vietato deploy breaking senza script. |
| **Nuova entità gestita** | Lifecycle completo (revision, soft delete, versioni, cestino, purge) **prima** del go-live feature. |

### 14.3 Checklist prima del merge

1. Aggiornare `normalize*` / lifecycle defaults.
2. Se rename/breaking: shim **o** script migrazione documentato (tenant / prefisso Blob).
3. Snapshot in `lean-event/versions/` restano deserializzabili (non rompere letture revisioni vecchie).
4. Aggiornare questa sezione o `docs/sql/` se cambia lo schema Neon.
5. Verificare su locale con copia dati (o tenant demo) che elenco + dettaglio + save non perdono campi.

### 14.4 Cosa non fare mai

- Hard-delete di entità gestite fuori dal flusso soft delete → cestino → purge.
- Assumere che TypeScript “ripulisca” i JSON su Blob.
- Sincronizzare o cancellare Blob di `leanme-site` da questo repo.
- Lanciare migrazioni Neon in produzione senza dry-run su branch / DB staging.

### 14.5 Cursor rule

Implementazione agent: `.cursor/rules/lean-event-data-schema.mdc` (globs su tipi e `lib/lean-event`).
