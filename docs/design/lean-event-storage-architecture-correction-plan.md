# LEAN.EVENT — STORAGE ARCHITECTURE CORRECTION PLAN

**Stato:** principio generale **approvato** · vincoli documentali sotto raffinati (nessuna implementazione)  
**Data:** 2026-07-22 (rev. vincoli documentali)  
**Tipo:** correzione mirata — elimina Object Storage / Vercel Blob  
**Vincolo:** preservare il modello relazionale Neon già progettato e tutta l’architettura SaaS introdotta (Control Plane, Registry, DB per tenant, Inngest, AI Gateway, Domain Events, Module Registry)

---

## Premessa (allineamento)

Obiettivo della piattaforma: **un unico sistema dati** per tenant.

| Proprietà | Target |
|-----------|--------|
| Persistenza | Solo **Neon/PostgreSQL** (DB dedicato per tenant) |
| Relazionale | Tabelle + FK + colonne tipizzate (no JSON come SoT dove esistono entità tipizzate) |
| Interrogabile | Tutto via SQL |
| Versionabile / auditabile | Nel DB tenant |
| Documentale | Nel DB tenant (binari inclusi) |
| Backup / migrazione | Un solo motore (Postgres) |
| Provider esterni di storage | **Nessuno** (né Blob, né S3/R2) |

Questa correzione **non annulla** il lavoro SaaS di oggi.  
Elimina **solo** la dipendenza da Object Storage.

> **Nota di coerenza documentale:** alcuni ADR/mandate scritti oggi citano ancora “Blob per tenant” (es. Mandate §3, ADR 0006). Dopo approvazione di questo piano, quelle sezioni vanno emendate. Il modello relazionale tipizzato (`006`), Control Plane e DB per tenant restano il nucleo da preservare.

---

## 0. Conferme esplicite (vincoli approvati)

| # | Vincolo | Conferma |
|---|---------|----------|
| **1** | Tutti i dati di dominio già modellati in tabelle/colonne tipizzate (`006` e correlate) **restano invariati** | **CONFERMATO** — nessuna alterazione di schema dominio per questa correzione |
| **2** | `lean_event_documents` = solo identità, classificazione, collegamenti, metadati strutturati | **CONFERMATO** — **zero BYTEA** su questa tabella |
| **3** | `lean_event_document_versions` = versioni immutabili + hash, MIME, size, autore, timestamp, riferimenti audit | **CONFERMATO** — **zero BYTEA** su questa tabella |
| **4** | `lean_event_document_chunks` = solo contenuto binario a chunk (**no JSON** come archivio contenuto) | **CONFERMATO** — unica sede del file |
| **5** | File ricostruibile in modo deterministico e verificabile con SHA-256 | **CONFERMATO** — concat chunk ordinati + hash versione |
| **6** | Soft delete **non** cancella fisicamente file/versioni/chunk | **CONFERMATO** — solo flag; hard delete solo purge esplicito post-retention e senza legal hold |
| **7** | Retention, legal hold, versionamento, audit per tipologia documentale (`kind`) | **CONFERMATO** — policy per `kind` + `legal_hold` |
| **8** | Nessuna modifica distruttiva delle versioni già archiviate | **CONFERMATO** — append-only; UPDATE/DELETE su version/chunk vietati in runtime |
| **9** | Download, anteprima, migrazione legacy coperti da test automatici | **CONFERMATO** — gate obbligatorio pre-cutover |
| **10** | Vercel Blob/token rimossi solo dopo inventario → migrazione → verify hash → **approvazione esplicita** | **CONFERMATO** — decommission gate separato |

---

## 1. Elenco preciso di ciò che oggi è relativo a Blob

### 1.1 Infrastruttura Vercel già creata (ops)

| Risorsa | ID / nome | Stato |
|---------|-----------|--------|
| Store legacy | `leanme-event` (`store_FYsZWRl3jhb4pwv1`) | Attivo; ~55 file; usabile solo come **sorgente storica** da migrare fuori |
| Store tenant | `lean-event-iec` (`store_7bGNqoq2zpBTCU79`) | Creato oggi; vuoto |
| Store tenant | `lean-event-demo` (`store_vHENpsMK4FzAgyE5`) | Creato oggi; collegato al progetto; vuoto |

### 1.2 Variabili / refs Blob

| Voce | Ruolo attuale |
|------|----------------|
| `BLOB_READ_WRITE_TOKEN` | Token store (legacy o development) |
| `LEAN_EVENT_TENANT_IEC_BLOB_TOKEN` | Token store iec |
| `LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN` | Token store demo |
| `lean_event_tenants.storage_ref` | Ref env verso token Blob (Control Plane) |
| `BLOB_STORE_ID` / OIDC (Vercel) | Auth alternativa verso store |

### 1.3 Codice architetturale introdotto oggi (Blob-oriented)

| Path | Ruolo |
|------|--------|
| `core/infrastructure/storage/storage-resolver.ts` | Resolver fail-closed che importa `@vercel/blob` |
| `contracts/document-store.ts` | Contratto `LeanEventDocumentStore` (upload/download/list/delete) orientato a path object-storage |
| `contracts/tenant-context.ts` → `storageRef` | Campo tenant legato a storage esterno |
| `docs/adr/0006-storage-per-tenant.md` | ADR object-storage per tenant |
| Mandate / deployment plan / credentials / provisioning inventory | Sezioni Blob |

### 1.4 Runtime preesistente che usa Blob (da riallineare, non “nuovo di oggi”)

| Area | File tipici | Contenuto su Blob |
|------|-------------|-------------------|
| Entità JSON legacy | `entity-blob-storage.ts`, `event-storage.ts`, `contact-storage.ts`, `venue-storage.ts`, `supplier-storage.ts`, `event-assignment-storage.ts`, … | JSON path `lean-event/{collection}/{tenantId}/…` |
| Workspace | `workspace-blob-storage.ts` | JSON workspace |
| Versioni | `version-storage.ts` | Snapshot versioni |
| Documenti registry | `documents.ts` | Metadati Neon + binario Blob (`blob_path`) |
| Allegati chat | `chat-attachment-storage.ts` | File allegati |
| Travel docs | `travel-document-storage.ts` | Documenti viaggio |
| Supplier docs | `supplier-document-storage.ts` | Accordi/file fornitore |
| Cover venue | `venue-cover-storage.ts` | Immagini cover |
| Backup / export | `backup-blob.ts`, `tenant-export.ts` | Snapshot/export |

### 1.5 Schema SQL già presente (metadati documenti)

- `docs/sql/002_lean_event_documents_audit.sql` → `lean_event_documents` con **`blob_path`** + `sha256`, soft delete, meta  
- `docs/sql/007_lean_event_documents_fk.sql` → FK verso events/contacts/suppliers/workspaces  
- `lean_event_audit_events` → audit append-only  

**Riutilizzabile:** la tabella metadati e le FK.  
**Da correggere:** la dipendenza da `blob_path` / Object Storage.

### 1.6 Script ops Blob (eliminabili o da non usare più)

- `scripts/fix-blob-env-refs.mjs`
- `scripts/restore-legacy-blob-token.mjs`
- `scripts/restore-legacy-blob-from-vercel.mjs`
- `scripts/promote-blob-token-to-tenant.mjs`
- `scripts/check-blob-token-identity.mjs`
- `scripts/migrate-blob-tenant-store.mjs`
- `scripts/list-blob-tenants.mjs`, `list-blob-entities.mjs`, `compare-neon-blob.mjs`
- `scripts/capture-vercel-env-var.mjs` (se usato solo per Blob)

### 1.7 Cosa NON fare ora

- Nessuna nuova migrazione Blob→Blob  
- Nessun nuovo store / token  
- Nessuna modifica codice finché questo piano non è approvato  

---

## 2. Ciò che rimane valido e NON deve essere modificato (nel senso di “non demolire”)

Da **preservare e rafforzare**:

| Blocco | Motivo |
|--------|--------|
| Control Plane DB `lean_event_control_plane` | Registry piattaforma, no dati operativi cliente |
| Tenant Registry + seed iec/demo | Identità tenant, pack, moduli, AI profiles |
| Database Connection Resolver fail-closed | Isolamento DB per tenant |
| DB dedicati `lean_event_t_<slug>` | Isolamento infrastrutturale |
| Schema tipizzato `001–007` / normalizzato `006` | SoT relazionale eventi, contatti, assignment, workspace, … |
| ETL dati strutturati `neondb` → DB tenant (es. demo) | Cutover dati già fatto dove applicabile |
| Inngest + job contract | Job lunghi (export, generazione PDF, import) |
| AI Gateway + Assistant Registry | Indipendenza provider AI |
| Domain Events + Module Registry | Estendibilità commerciale |
| API versionate / Build Info / naming Lean.Event | Vendibilità e manutenibilità |
| Soft delete, revision, audit events | Integrità commerciale |
| Lifecycle entità tipizzate | Zero perdita |

Da **emendare solo localmente** (non demolire):

- `storage_ref` nel Control Plane → riassegnare significato o rimuovere dopo cutover documentale DB-only  
- Storage Resolver → sostituire adapter Blob con adapter Postgres (stesso concetto fail-closed, backend diverso)  
- `lean_event_documents` → estendere per contenere il binario nel DB  

---

## 3. Piano tecnico per eliminare Blob (senza toccare il relazionale tipizzato)

### Fase A — Freeze Blob (immediata, già richiesta)

1. Stop provisioning/migrazione Blob.  
2. Nessun nuovo codice che importi `@vercel/blob`.  
3. Documentare questo piano e ottenere approvazione.

### Fase B — Emendamento architetturale (docs/ADR)

1. Emendare Mandate: rimuovere “One Blob storage per tenant”; sostituire con “Document archive in tenant Postgres”.  
2. Superare / sostituire ADR 0006 (object storage) con ADR “Document store on Postgres”.  
3. Aggiornare deployment plan, credentials, provisioning inventory: Blob = **legacy da decommissionare**, non target.  
4. Aggiornare `lean-event-document-architecture.md` al modello DB-only.

### Fase C — Schema documentale Neon (tenant DB)

1. Applicare migrazione SQL documentale (sezione 5) su foundation tenant.  
2. Mantenere FK e kind esistenti.  
3. Deprecare `blob_path` (nullable → drop dopo cutover).

### Fase D — Adapter Document Store su Postgres

1. Nuova implementazione del contratto documenti che legge/scrive **solo** tabelle Neon del tenant risolto dal Connection Resolver.  
2. API download/upload streamano da/verso Postgres (non URL Blob).  
3. Job Inngest per: generazione PDF, export ZIP, import massivi, backfill.

### Fase E — Cutover contenuti

| Sorgente | Destinazione | Note |
|----------|--------------|------|
| JSON entità su Blob | Tabelle tipizzate già in `006` | Completare SoT Neon; **non** salvare JSON grezzo come file BYTEA se esiste tabella tipizzata |
| Documenti binari su Blob | `lean_event_documents` + content/chunks | Inclusi CV, attestati, travel, supplier, cover, chat attachment |
| Workspace JSON su Blob | `lean_event_workspaces` (+ documenti collegati) | `structured` può restare JSONB solo dove schemaless AI (eccezione già prevista) |
| Versioni su Blob | `lean_event_entity_versions` / document versions | Già modello Neon dove presente |

### Fase F — Decommission Blob

1. Verify conteggi documenti (Neon vs legacy Blob) = 0 delta.  
2. Rimuovere env token Blob, `storage_ref` Blob-oriented, script Blob.  
3. Eliminare store `lean-event-iec` / `lean-event-demo` (vuoti) e, dopo retention, legacy `leanme-event`.  
4. Rimuovere dependency `@vercel/blob` dal runtime Lean.Event.  
5. Gate CI: forbid import `@vercel/blob` in `lib/lean-event`, `core/`, `app/api`.

---

## 4. Proposta archiviazione documentale 100% PostgreSQL/Neon

### Principi

1. **Un documento = una riga metadati** in `lean_event_documents` (query, filtri, ACL, retention).  
2. **Il contenuto binario = righe tipizzate** nel medesimo DB tenant (non URL esterni).  
3. **Versioni immutabili** del contenuto (append-only).  
4. **Integrità** con SHA-256 obbligatorio.  
5. **Audit** su create/update/download/delete/purge.  
6. **Soft delete** + `purge_after` allineati alle policy già definite.  
7. **Nessun Object Storage** nel path runtime.

### Pattern consigliato (enterprise, scalabile)

```
lean_event_documents          ← metadati + puntatore alla versione corrente
lean_event_document_versions  ← versione immutabile (hash, mime, bytes, compression)
lean_event_document_chunks    ← payload binario a chunk (BYTEA)  [per file grandi]
```

Per file piccoli (soglia configurabile, es. ≤ 1–2 MB) si può salvare in **una sola riga** `payload BYTEA` sulla version senza chunking.  
Per file grandi (PDF multi-MB, audio verbali, ZIP export) usare **chunking**.

### Accesso applicativo

- Upload HTTP → valida mime/size → calcola hash → INSERT version (+ chunks) in transazione → aggiorna documento.  
- Download HTTP → SELECT metadati + stream chunks in ordine (API route autenticata, fail-closed sul tenant DB).  
- Liste UI → **solo metadati** (mai SELECT del BYTEA nelle liste).  
- Export ZIP / attestati massivi → **Inngest**, scrittura temporanea in tabella export o stream a pacchetti.

---

## 5. Schema SQL definitivo (tenant DB)

> File previsto post-approvazione: `docs/sql/008_lean_event_documents_postgres_store.sql`  
> **Non altera** tabelle dominio tipizzate (`lean_event_events`, `contacts`, …).  
> Evoluzione di `lean_event_documents` (002): depreca `blob_path`; aggiunge versioni + chunks.

### 5.1 DDL

```sql
-- ============================================================
-- 008_lean_event_documents_postgres_store.sql  (DEFINITIVO)
-- ============================================================

-- A) Metadati documento — NESSUN BYTEA
-- Evoluzione: rendere blob_path nullable (transizione), poi DROP in 009.

ALTER TABLE lean_event_documents
  ALTER COLUMN blob_path DROP NOT NULL;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'standard';

-- retention_class tipica: permanent | standard | privacy_short | contractual
-- (policy applicativa per kind; colonna consente override per documento)

COMMENT ON TABLE lean_event_documents IS
  'Document identity/classification/links/metadata only. Binary lives in chunks.';

-- B) Versioni immutabili — NESSUN BYTEA
CREATE TABLE IF NOT EXISTS lean_event_document_versions (
  tenant_id           TEXT NOT NULL,
  id                  TEXT NOT NULL,
  document_id         TEXT NOT NULL,
  version             INT NOT NULL CHECK (version >= 1),
  filename            TEXT NOT NULL,
  mime                TEXT NOT NULL,
  bytes               BIGINT NOT NULL CHECK (bytes >= 0),
  sha256              TEXT NOT NULL,
  compression         TEXT NOT NULL DEFAULT 'none'
                        CHECK (compression IN ('none', 'gzip')),
  chunk_count         INT NOT NULL CHECK (chunk_count >= 1),
  chunk_size          INT NOT NULL CHECK (chunk_size > 0),
  created_at          TIMESTAMPTZ NOT NULL,
  created_by          TEXT,
  source              TEXT NOT NULL DEFAULT 'upload'
                        CHECK (source IN ('upload', 'generated', 'migration', 'restore')),
  note                TEXT,
  audit_event_id      BIGINT,   -- riferimento riga lean_event_audit_events.id (best-effort)
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, document_id, version),
  CONSTRAINT fk_doc_version_document
    FOREIGN KEY (tenant_id, document_id)
    REFERENCES lean_event_documents (tenant_id, id)
    ON DELETE RESTRICT
);

COMMENT ON TABLE lean_event_document_versions IS
  'Immutable version descriptors. No binary payload. Append-only.';

-- C) Chunk binari — UNICA sede del file (BYTEA puro, mai JSON)
CREATE TABLE IF NOT EXISTS lean_event_document_chunks (
  tenant_id           TEXT NOT NULL,
  version_id          TEXT NOT NULL,
  chunk_index         INT NOT NULL CHECK (chunk_index >= 0),
  bytes               INT NOT NULL CHECK (bytes > 0),
  sha256              TEXT NOT NULL,
  payload             BYTEA NOT NULL,
  PRIMARY KEY (tenant_id, version_id, chunk_index),
  CONSTRAINT fk_doc_chunk_version
    FOREIGN KEY (tenant_id, version_id)
    REFERENCES lean_event_document_versions (tenant_id, id)
    ON DELETE RESTRICT
    -- RESTRICT (non CASCADE): soft delete non deve far sparire i chunk;
    -- hard delete solo via procedura purge esplicita.
);

COMMENT ON TABLE lean_event_document_chunks IS
  'Binary file chunks only. Deterministic order by chunk_index.';

-- D) Policy kind (opzionale ma consigliata) — configurazione retention/audit per tipologia
CREATE TABLE IF NOT EXISTS lean_event_document_kind_policies (
  tenant_id             TEXT NOT NULL,
  kind                  TEXT NOT NULL,
  retention_class       TEXT NOT NULL DEFAULT 'standard',
  soft_delete_days      INT,          -- NULL = usa default piattaforma
  allow_auto_purge      BOOLEAN NOT NULL DEFAULT TRUE,
  require_download_audit BOOLEAN NOT NULL DEFAULT FALSE,
  allow_preview         BOOLEAN NOT NULL DEFAULT TRUE,
  max_versions_keep     INT,          -- NULL = illimitato finché non soft-deleted
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, kind)
);
```

### 5.2 Indici

```sql
-- documents (oltre indici già in 002)
CREATE INDEX IF NOT EXISTS idx_lean_event_documents_kind_status
  ON lean_event_documents (tenant_id, kind, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_legal_hold
  ON lean_event_documents (tenant_id)
  WHERE legal_hold = TRUE;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_purge
  ON lean_event_documents (tenant_id, purge_after)
  WHERE deleted_at IS NOT NULL AND legal_hold = FALSE;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_sha256
  ON lean_event_documents (tenant_id, sha256)
  WHERE deleted_at IS NULL AND sha256 IS NOT NULL;

-- versions
CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_doc
  ON lean_event_document_versions (tenant_id, document_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_sha256
  ON lean_event_document_versions (tenant_id, sha256);

CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_created
  ON lean_event_document_versions (tenant_id, created_at DESC);

-- chunks: PK copre (tenant_id, version_id, chunk_index) — sufficiente per ricostruzione ordinata
```

### 5.3 Vincoli (DB + runtime)

| Vincolo | Dove |
|---------|------|
| PK/FK composite `(tenant_id, …)` | tutte le tabelle |
| `ON DELETE RESTRICT` documento←version←chunk | impedisce cancellazione accidentale a cascata |
| UNIQUE `(tenant_id, document_id, version)` | no versioni duplicate |
| `chunk_count >= 1` | ogni versione ha almeno un chunk |
| `sha256` NOT NULL su version e chunk | integrità obbligatoria |
| **Nessun BYTEA** su `documents` / `versions` | solo `chunks.payload` |
| Soft delete | solo `documents.deleted_at` (+ `purge_after`); **nessun DELETE** |
| Legal hold | se `legal_hold = TRUE` → purge vietato |
| Immutabilità versioni | runtime: vietati UPDATE su `document_versions` e `document_chunks` (solo INSERT); eventuale trigger `RAISE` su UPDATE/DELETE |
| Domini tipizzati | FK 007 verso events/contacts/suppliers/workspaces **invariate** |
| `meta` JSONB su documents | solo attributi non strutturali (templateVersion, lingua); **mai** contenuto file |

### 5.4 Ricostruzione deterministica + SHA-256

```
file_bytes = concat(chunk[0].payload || chunk[1].payload || … || chunk[n-1].payload)
             in ordine chunk_index ASC
assert sha256(file_bytes) == document_versions.sha256
assert sum(chunk.bytes) == document_versions.bytes
assert count(chunks) == document_versions.chunk_count
```

Compressione: se `compression = 'gzip'`, lo SHA-256 è calcolato sul **contenuto logico decompresso** (byte del file originale); i chunk memorizzano il flusso già compresso **oppure** si memorizza uncompressed nei chunk e si documenta la scelta.  
**Scelta definitiva raccomandata:** chunk = byte del file originale (compression=`none` di default); gzip solo come ottimizzazione esplicita futura con hash sul decompresso.

---

## 6. Flusso upload

```text
1. Auth + resolve tenant DB (Connection Resolver fail-closed)
2. Validare: kind, mime allow-list, max size pack, filename safe
3. Leggere body → calcolare sha256 + bytes
4. Spezzare in chunk (default 512 KiB; ultimo chunk può essere più corto)
5. BEGIN
   a. Se nuovo documento: INSERT lean_event_documents (status=ready|generating, current_version=1, …)
      Se replace: leggere documents.revision (optimistic lock), newVersion = current_version+1
   b. INSERT lean_event_document_versions (immutabile; chunk_count, sha256, mime, bytes, created_by, source, audit_event_id)
   c. INSERT lean_event_document_chunks × N (payload BYTEA, sha256 chunk, chunk_index)
   d. UPDATE lean_event_documents
        SET current_version, filename, mime, bytes, sha256, revision=revision+1, updated_at/by
      WHERE revision = expected
   e. INSERT lean_event_audit_events (document.create | document.upload_version)
6. COMMIT
7. In caso di conflitto revision → 409 e retry client
```

Regole:

- Mai UPDATE di una version/chunk esistente.  
- Upload async (file grandi / PDF generati): `status=generating` → Inngest completa b–e → `status=ready|failed`.

---

## 7. Flusso download / anteprima

```text
1. Auth + ACL (tenant, ruolo, ownership personId se area partecipante)
2. Load documents (metadati). Se deleted_at NOT NULL e non ruolo admin/trash → 404
3. Resolve version = ?version || current_version
4. Load document_versions row (mime, bytes, sha256, chunk_count)
5. Policy kind: require_download_audit → write audit document.download
6. Stream:
   FOR chunk_index IN 0..chunk_count-1:
     SELECT payload FROM chunks ORDER BY chunk_index
     write HTTP body
7. Headers: Content-Type=mime, Content-Length=bytes,
   Content-Disposition=attachment|inline (preview),
   X-Content-Sha256=sha256
8. Opzionale ?verify=1: bufferizza, ricalcola sha256, 500 se mismatch + audit integrity_fail
```

Anteprima:

- Consentita solo se `kind_policies.allow_preview` e mime safe (pdf/image).  
- Stesso stream, `Content-Disposition: inline`.  
- **Mai** SELECT chunks nelle liste UI.

---

## 8. Flusso versionamento

| Operazione | Comportamento |
|------------|---------------|
| Prima upload | version=1, current_version=1 |
| Replace file | version=n+1 append-only; current_version=n+1 |
| Update solo metadati (title, links) | `documents.revision++`; **nessuna** nuova version binaria |
| Soft delete | `deleted_at` / `deleted_by` / `purge_after`; versioni e chunk **intatti** |
| Restore | clear `deleted_at` / `purge_after` |
| Legal hold on/off | flag su documents; blocca purge |
| Purge (hard) | Solo job esplicito: `deleted_at` set, `purge_after` scaduto, `legal_hold=false`, policy kind `allow_auto_purge`; DELETE chunks → versions → document in transazione + audit |
| Lettura storica | download `?version=k` |

Immutabilità enforced:

1. Repository layer rifiuta update/delete su versions/chunks.  
2. Trigger Postgres opzionale `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION`.  
3. Test automatici che tentano UPDATE e si aspettano fallimento.

---

## 9. Strategia migrazione dai Blob legacy

### 9.1 Gate obbligatori (in ordine)

1. **Inventario** path Blob per tenant/collection (conteggi + size + sha se già noto).  
2. **Migrazione** verso chunks Neon (job Inngest per tenant).  
3. **Verifica hash** 100% file migrati (o sample + full async con report).  
4. **Approvazione esplicita umana** al decommission.  
5. Solo allora: rimozione token/env/store Blob.

### 9.2 Cosa migrare dove

| Sorgente Blob | Destinazione Neon | Note |
|---------------|-------------------|------|
| `lean-event/documents/...` binari | documents + versions + chunks | path legacy in `meta.legacyBlobPath` |
| travel / supplier / chat / cover binari | stesso modello documentale (`kind` appropriato) | |
| JSON entità (`events/`, `contacts/`, …) | **tabelle tipizzate 006** (già ETL dove fatto) | **non** come chunks JSON |
| workspace JSON | `lean_event_workspaces` | non come archivio BYTEA se tipizzabile |
| versions JSON entità | `lean_event_entity_versions` | distinto dalle versioni file |

### 9.3 Algoritmo migrazione file

```text
per ogni blob file legacy:
  1. GET bytes da Blob (solo fase migrazione; token legacy temporaneo)
  2. sha256 = hash(bytes)
  3. se esiste già documents.sha256 uguale + stesso kind/link → skip idempotente
  4. INSERT document + version(source='migration') + chunks
  5. audit document.migration_import
  6. registrare riga lean_event_blob_migration_ledger
       (tenant_id, legacy_path, document_id, version, sha256, status)
```

Ledger (tabella temporanea di cutover, cancellabile dopo decommission):

```sql
CREATE TABLE IF NOT EXISTS lean_event_blob_migration_ledger (
  tenant_id     TEXT NOT NULL,
  legacy_path   TEXT NOT NULL,
  document_id   TEXT,
  version_id    TEXT,
  sha256        TEXT,
  bytes         BIGINT,
  status        TEXT NOT NULL CHECK (status IN ('pending','done','failed','skipped')),
  error         TEXT,
  migrated_at   TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, legacy_path)
);
```

### 9.4 Decommission Blob (solo dopo approvazione)

- Verify: `failed=0`, hash match = 100% (o eccezioni firmate).  
- Rimuovere uso runtime `@vercel/blob`.  
- Rimuovere env `*_BLOB_TOKEN` / `BLOB_READ_WRITE_TOKEN` dal percorso Lean.Event.  
- Eliminare store vuoti iec/demo; legacy dopo retention ops.  
- Emendare Mandate/ADR 0006.

---

## 10. Test di integrità e non regressione (obbligatori)

### 10.1 Unit / integration (DB tenant di test)

| ID | Test |
|----|------|
| T01 | Upload → N chunks → download bytes identici |
| T02 | `sha256(download) == versions.sha256` |
| T03 | `sum(chunk.bytes) == versions.bytes` e `count == chunk_count` |
| T04 | Second upload crea version=2; version=1 immutata |
| T05 | UPDATE su `document_versions` fallisce (trigger/repo) |
| T06 | UPDATE/DELETE su `document_chunks` fallisce |
| T07 | Soft delete: documento non listato; chunks ancora presenti |
| T08 | Soft delete + legal_hold: purge job non elimina |
| T09 | Purge solo se deleted + purge_after scaduto + !legal_hold |
| T10 | Liste documenti non selezionano `payload` (assert query / explain contract) |
| T11 | Anteprima mime safe ok; mime non safe → download only |
| T12 | Domain tables `006` invariate (smoke schema) |

### 10.2 Migrazione legacy

| ID | Test |
|----|------|
| M01 | Inventario conta path > 0 → ledger pending |
| M02 | Migrazione idempotente (second run = skipped/done, no dup) |
| M03 | Hash post-migrazione = hash pre-migrazione per ogni file |
| M04 | Report `failed` blocca decommission automatico |

### 10.3 Non regressione dominio

| ID | Test |
|----|------|
| R01 | CRUD evento/contatto/assignment su tabelle tipizzate invariato |
| R02 | Connection Resolver fail-closed invariato |
| R03 | Nessun import `@vercel/blob` in `lib/lean-event` / `core` / `app/api` (CI gate post-cutover) |
| R04 | Architecture naming tests ancora green |

### 10.4 Gate pre-rimozione Blob

Checklist firmata:

- [x] Schema 008 + runtime store + API (implementati; Blob non rimosso)  
- [ ] Inventario completo (oltre i prefix binari attesi)  
- [ ] Migrazione `done` (dry-run demo/iec: 0 file sotto prefix attesi)  
- [ ] Verify hash 100% (o waiver firmato)  
- [x] Test T01–T12 green; M01–M04 smoke/ledger; R03 post-cutover  
- [ ] **Approvazione esplicita** decommission  

---

## 11–14. Performance, backup, limiti, ottimizzazioni

Restano valide le sezioni del piano originale, con queste correzioni rispetto alla bozza precedente:

- **Niente storage inline** su `document_versions` (solo chunks).  
- Soft delete **non** usa `ON DELETE CASCADE` sui chunk.  
- Purge è l’unico hard-delete e rispetta legal hold + policy per `kind`.  
- Backup unificato = `pg_dump`/PITR del DB tenant (include chunks).

---

## Riepilogo decisioni (stato)

| # | Decisione | Stato |
|---|----------|--------|
| D1 | Persistenza unica Neon per-tenant; no Object Storage runtime | Principio approvato |
| D2 | documents / versions / chunks come sopra (vincoli §0) | **Confermato** |
| D3 | Domini tipizzati `006` invariati | **Confermato** |
| D4 | Control Plane / Inngest / AI Gateway / Module Registry restano | Invariato |
| D5 | Decommission Blob solo post inventario+migrazione+hash+OK umano | **Confermato** |
| D6 | Implementazione codice solo dopo OK finale su questo raffinamento | In attesa |

---

## Richiesta di via libera implementativo

Se lo schema e i flussi sopra sono accettati, risposta attesa:

`Schema documentale definitivo approvato — puoi implementare`

**Nessuna implementazione è stata avviata in questo passo.**
