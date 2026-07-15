# Lean Event · Resilienza dati, concorrenza, versioning e cestino

**Versione documento:** 2026-07-14  
**Stato:** architettura approvata — implementazione per fasi  
**Scope:** multi-utente simultaneo, storico versioni, backup/recovery, cestino 30 giorni

---

## 1. Problema attuale

| Aspetto | Stato oggi | Rischio |
|---------|------------|---------|
| Persistenza | JSON per entità (filesystem locale / Vercel Blob) | Last-write-wins, nessun merge |
| Concorrenza | PATCH read → merge → write | Sovrascrittura silenziosa |
| Versioni | Solo `updatedAt` | Nessun ripristino punto-in-tempo |
| Eliminazione | `delete` fisico del file | Irrecuperabile |
| Backup | Nessuno sistematico su entità evento/rubrica | Perdita dati su crash o errore umano |
| Audit | JSONL login/workspace (non su Vercel FS) | Non traccia ogni modifica entità |

**Obiettivo:** lavoro contemporaneo sicuro su un evento, ripristino versioni, recupero post-crash, cestino 30 giorni.

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

- **Policy retention:** ultimi **50 revisioni** per entità + tutte le revisioni degli ultimi **90 giorni** (configurabile per tenant pack PLATINUM).
- Snapshot documenti pesanti: JSON metadati in Postgres, blob path in `snapshot.attachments[]`.

### 3.3 Cestino (soft delete)

| entity_type | In cestino | Relazioni |
|-------------|------------|-----------|
| `event` | Sì | Assegnazioni ospiti → cestino cascata opzionale (config) |
| `contact` | Sì | Collegamenti evento restano storici |
| `venue` | Sì | Eventi mantengono snapshot testo sede |
| `supplier` | Sì | Link evento → storico |
| `event_assignment` | Sì | — |
| `event_supplier_link` | Sì | Documenti link → cestino |
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

- Copia incrementale prefissi: `leanyou/events/`, `leanyou/contacts/`, `leanyou/event-assignments/`, documenti.
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
| GET | `/api/lean-event/{type}/{id}/versions` | Storico revisioni |
| POST | `/api/lean-event/{type}/{id}/versions/{rev}/restore` | Ripristina revisione |
| PATCH | `/api/lean-event/{type}/{id}` | Richiede `expectedRevision` |

---

## 8. Piano di implementazione

### Fase A — Fondamenta (1–2 sprint) ⚡ priorità

- [x] Aggiungere `revision`, `deletedAt`, `deletedBy`, `purgeAfter` ai tipi TypeScript
- [x] Wrapper save con versioning + soft delete in `entity-lifecycle.ts` / domain layer
- [x] Optimistic locking su **evento** e **assignment ospite** (409 + UI conflitto)
- [x] Soft delete al posto di delete fisico per eventi, contatti, fornitori
- [x] Snapshot versione su Blob/filesystem: `leanyou/versions/{tenantId}/...`
- [x] API + UI cestino base (`/leonardo/cestino`)
- [ ] Job purge automatico 30 giorni (Fase B)

### Fase B — Postgres + Cestino UI (2–3 sprint)

- [ ] Schema Neon + migrazione entità da JSON
- [ ] UI Cestino Leonardo + Cron purge 30 giorni
- [ ] UI Cronologia versioni in scheda popup (confronto diff base)

### Fase C — Resilienza produzione (1 sprint)

- [ ] Cron backup Blob giornaliero
- [ ] Export settimanale tenant
- [ ] Estensione audit su tutte le mutazioni
- [ ] Polling revision + banner conflitto

### Fase D — Presenza & merge avanzato (opzionale)

- [ ] Heartbeat presenza
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
- Delete hard: `deleteJsonFile` / `entityBlob.delete`
- Audit parziale: `lib/lean-event/audit-log.ts`
- UI liste resilienti: `components/lean-event/leonardo-ui.ts` (`LEONARDO_LIST_UX_STANDARD`)

---

## 12. Decisione

**Soluzione migliore per Lean Event Leonardo:**  
**Neon Postgres (metadati + versioni + cestino + concorrenza) + Vercel Blob (file + snapshot backup) + Cron backup + soft delete 30 giorni.**

Implementazione incrementale: Fase A subito (senza migrazione DB) per locking e soft delete; Fase B migrazione Postgres per cestino e versioning queryable.
