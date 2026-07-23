# LEAN.EVENT — ARCHITECTURE v1.0  
## Technical Architecture Constitution

| Campo | Valore |
|-------|--------|
| **Stato** | **CONGELATO** — riferimento ufficiale vincolante |
| **Versione architettura** | 1.0 |
| **Prodotto** | Lean.Event |
| **Data congelamento** | 2026-07-23 |
| **Tipo** | Costituzione tecnica (non runbook operativo) |
| **Autorità** | Sovraordina ADR, mandate, piani di deployment e codice applicativo |

Questo documento è la **Costituzione tecnica** di Lean.Event.  
Ogni evoluzione futura della piattaforma deve rispettarlo.  
Ogni violazione richiede **approvazione esplicita** prima di qualsiasi modifica.

Documenti correlati (non sostitutivi): ADR in `docs/adr/`, schema SQL in `docs/sql/`, mandate storico in `docs/design/lean-event-architecture-mandate.md`.  
In caso di conflitto tra documenti precedenti e questa Costituzione, **prevale questa Costituzione**.

---

## Single Source of Truth

Lean.Event utilizza **PostgreSQL** come unico sistema di persistenza della piattaforma.

Nella versione 1.0 il database PostgreSQL è ospitato sulla piattaforma **Neon**, che costituisce il **provider cloud ufficiale**.

PostgreSQL rappresenta l’unica fonte autorevole (**Single Source of Truth**) di tutti i dati, documenti, metadati, versioni, audit trail e informazioni gestite dalla piattaforma.

Qualsiasi altro sistema (cache, indici di ricerca, code, eventi, log, AI, esportazioni o future integrazioni) ha esclusivamente funzione **derivata** e non può essere considerato fonte primaria dei dati.

L’eventuale sostituzione del provider cloud (Neon con un’altra infrastruttura PostgreSQL compatibile) **non modifica** l’architettura della piattaforma né il modello di persistenza definito da questa Costituzione.

---

## Architecture Freeze

Con l’approvazione della presente **Technical Architecture Constitution v1.0**, l’architettura di Lean.Event è ufficialmente congelata (**Architecture Freeze**).

Da questo momento:

- ogni nuova funzionalità dovrà rispettare integralmente questa Costituzione;
- nessun principio architetturale potrà essere modificato senza una preventiva revisione tecnica e approvazione esplicita;
- ogni eventuale evoluzione architetturale dovrà essere documentata mediante **Architecture Decision Record (ADR)** e recepita nella successiva versione della Costituzione.

L’obiettivo è garantire la stabilità, la coerenza e la sostenibilità della piattaforma nel lungo periodo, preservandone la qualità tecnica e la capacità di evolvere senza compromettere le fondamenta del sistema.

---

## 1. Visione della piattaforma

### 1.1 Obiettivo

Lean.Event è una piattaforma **SaaS enterprise** multi-tenant per la gestione di eventi professionali (congressi, formazione ECM, ospitalità, fornitori, documenti, flussi AI assistiti).

Obiettivo architetturale: un sistema **vendibile, isolabile, esportabile e auditabile**, con fondazioni definitive dalla v1.0 e moduli funzionali rilasciabili progressivamente.

### 1.2 Filosofia progettuale

1. **Fondazioni prima delle feature** — l’isolamento, la persistenza e i confini Core/moduli non si improvvisano dopo i clienti.
2. **Un solo sistema di verità per tenant** — PostgreSQL/Neon; nessun Object Storage come SoT.
3. **Relazionale tipizzato** — i domini di business vivono in tabelle e colonne tipizzate, non in JSON opachi.
4. **Fail-closed** — assenza di configurazione, credenziali o registry ⇒ rifiuto, non fallback silenzioso.
5. **Separazione Control Plane / Tenant Plane** — i metadati di piattaforma non mescolano i dati operativi dei clienti.
6. **White-label architetturale** — i nomi commerciali degli agenti AI sono configurazione, non infrastruttura.

### 1.3 Principi architetturali

| Principio | Significato |
|-----------|-------------|
| Isolamento forte | Un database Postgres dedicato per tenant |
| Singola persistenza | Solo Neon/PostgreSQL per dati e documenti |
| Contratti espliciti | Core, moduli, AI, job, storage dietro porte tipizzate |
| Auditabilità | Azioni rilevanti registrate e interrogabili |
| Immutabilità documentale | Versioni e chunk append-only |
| Modularità commerciale | Pack CORE / PRO / AI / PLATINUM via Module Registry |
| Evoluzione controllata | Nessuna deriva architetturale senza mandato esplicito |

### 1.4 Requisiti Enterprise

- Multi-tenant con isolamento dati a livello di infrastruttura
- Soft delete, revisioni, legal hold, retention
- Audit strutturato
- Backup / restore / export per tenant
- Sicurezza fail-closed e least privilege
- Tracciabilità schema (`lean_event_schema_meta` e migrazioni numerate)
- Nessuna perdita silenziosa di entità o documenti

### 1.5 Requisiti SaaS

- Onboarding tenant ripetibile (provisioning DB + registry)
- Moduli attivabili per pack commerciale
- API versionate (`/api/v1/...`)
- Job asincroni gestiti da motore dedicato (Inngest)
- AI dietro gateway unico (provider sostituibili)
- Deploy cloud (Vercel) con env secrets e CI su gate architetturali

---

## 2. Architettura generale

### 2.1 Diagramma logico

```text
                         ┌─────────────────────────────┐
                         │     DNS / CDN / Vercel      │
                         │   Frontend Next.js App      │
                         │  /lean-event/{tenantSlug}   │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   API versionate (Next.js)  │
                         │  /api/v1/lean-event/*       │
                         │  /api/v1/platform/*         │
                         │  /api/leanyou/* (legacy UI) │
                         └──────┬───────────┬──────────┘
                                │           │
              ┌─────────────────▼──┐   ┌────▼─────────────────┐
              │   CONTROL PLANE    │   │     TENANT PLANE      │
              │ lean_event_        │   │ lean_event_t_<slug>   │
              │ control_plane      │   │  (1 DB / tenant)      │
              │                    │   │                       │
              │ • Tenant Registry  │   │ • Domini tipizzati    │
              │ • secret refs      │   │ • Document Store      │
              │ • pack/modules     │   │ • Audit / versions    │
              │ • build/meta       │   │ • Domain data         │
              └─────────┬──────────┘   └───────────┬───────────┘
                        │                          │
                        │   Connection Resolver    │
                        │   (fail-closed)          │
                        └────────────┬─────────────┘
                                     │
        ┌───────────────┬────────────┼────────────┬────────────────┐
        │               │            │            │                │
        ▼               ▼            ▼            ▼                ▼
 ┌────────────┐  ┌────────────┐ ┌─────────┐ ┌──────────┐  ┌─────────────┐
 │ AI Gateway │  │  Inngest   │ │ Domain  │ │ Module   │  │  Storage    │
 │ + Assistant│  │ Jobs Port  │ │ Events  │ │ Registry │  │  Resolver   │
 │ Registry   │  │            │ │ Bus     │ │ Packs    │  │  (Postgres) │
 └─────┬──────┘  └─────┬──────┘ └─────────┘ └──────────┘  └─────────────┘
       │               │
       ▼               ▼
  OpenAI (1°)     Workflows /
  (+futuri)       retry / cron
```

### 2.2 Control Plane

Database dedicato `lean_event_control_plane` (stesso progetto Neon ufficiale).  
Contiene **solo** metadati di piattaforma: registry tenant, riferimenti a secret/env, stato, pack, metadati operativi di piattaforma.  
**Vietato** memorizzare dati operativi di dominio cliente.

### 2.3 Tenant Plane

Per ogni tenant attivo: database `lean_event_t_<slug>`.  
Contiene anagrafiche, eventi, assignment, documenti, audit, versioni, chat, workspace tipizzati.  
È il **system of record** completo del cliente.

### 2.4 AI Gateway

Unico punto di ingresso verso i provider AI.  
Nessuna chiamata diretta a OpenAI (o altri) fuori dal provider layer del gateway.

### 2.5 Inngest

Unico orchestratore dei job asincroni durevoli (retry, step, cron, replay).  
Il dominio parla solo al contratto Jobs; non implementa code artigianali.

### 2.6 Document Store

Persistenza documentale **interna al DB tenant**: metadati + versioni immutabili + chunk BYTEA.  
Nessun Object Storage (Vercel Blob / S3 / R2) come SoT.

### 2.7 Module Registry

Mappa pack commerciali → moduli abilitati.  
Guard su UI e API: feature non acquistate = fail-closed.

### 2.8 Domain Events

Bus eventi di dominio per disaccoppiare mutazioni e side-effect.  
Contratto tipizzato; non sostituisce il SoT Postgres.

### 2.9 Workflow

Flussi lunghi (trascrizione, export, purge, migrazioni) eseguiti via Inngest + API versionate, con audit.

### 2.10 API

- Piattaforma: `/api/v1/platform/*`
- Prodotto: `/api/v1/lean-event/*`
- Superficie UI legacy ancora sotto `/api/leanyou/*` fino a rename completo delle route HTTP (vincolo naming prodotto resta `lean-event`)

### 2.11 Frontend

App Next.js (App Router), hub tenant `/lean-event/{tenantSlug}` (e superfici legacy in transizione).  
Route AI funzionali (`/ai/verbali`, …), mai cartelle tecniche con nomi commerciali agente.

---

## 3. Modello Multi Tenant

### 3.1 Isolamento

Isolamento primario = **database dedicato**.  
`tenant_id` è difesa in profondità applicativa, non sostituto dell’isolamento infrastrutturale.

### 3.2 Database dedicato

Convenzione Neon ufficiale (congelata):

| Risorsa | Nome / ruolo |
|---------|----------------|
| Progetto Neon | Progetto Lean.Event esistente (no nuovi progetti senza decisione Enterprise) |
| Control Plane | `lean_event_control_plane` |
| Tenant | `lean_event_t_<slug>` |
| Cutover source | `neondb` (solo sorgente migrazione storica, non SoT runtime) |

### 3.3 Fail-closed

- Tenant assente / non active ⇒ rifiuto
- `databaseRef` assente o secret non risolvibile ⇒ rifiuto
- Pack/modulo non abilitato ⇒ 403
- Documento senza contenuto Postgres ⇒ contenuto non disponibile (no fallback Object Storage in runtime)

### 3.4 Registry

Tenant Registry sul Control Plane: slug, stato, riferimenti env ai secret DB (e metadati pack).  
Connection Resolver e Storage Resolver leggono solo il registry e i secret referenziati.

### 3.5 Provisioning

Ordine: riuso risorse compatibili → creazione solo del mancante → verifica → passo successivo.  
Schema tenant applicato con migrazioni SQL numerate (`001`…`008`+).

### 3.6 Lifecycle tenant

Stati tipici: provisioning → active → suspended → decommission.  
Export e backup obbligatori prima di operazioni distruttive.  
Decommission DB/tenant solo con procedura firmata.

---

## 4. Database Architecture

### 4.1 Dichiarazione di persistenza

> **Lean.Event utilizza esclusivamente PostgreSQL/Neon come sistema di persistenza.**  
> Non esiste Object Storage come system of record.  
> Non esiste un database di dominio condiviso multi-tenant come isolamento primario.

### 4.2 Control Plane

Schema dedicato al registry e ai metadati piattaforma.  
Nessuna tabella di eventi/contatti/documenti cliente.

### 4.3 Database tenant

Ogni DB tenant riceve lo stesso set di migrazioni di dominio e document store.

### 4.4 Domini tipizzati (schema `006` e correlati)

Domini principali (elenco non esaustivo delle tabelle):

| Dominio | Tabelle chiave |
|---------|----------------|
| Sedi | `lean_event_venues` |
| Contatti | `lean_event_contacts` + emails/phones/tags/consents |
| Fornitori | `lean_event_suppliers`, `lean_event_supplier_agreements` |
| Eventi | `lean_event_events` + PM, fee, sponsor, related, program, ECM, hotel/allotment |
| Assignment | `lean_event_assignments` + hospitality, night stays, travels, related |
| Event↔Supplier | `lean_event_event_supplier_links` + documents/emails di link |
| Workspace AI | `lean_event_workspaces` (+ tags/documents); JSONB solo `structured` |
| Chat evento | `lean_event_event_chat_threads/messages` |
| Chat Teresa | `lean_event_teresa_chat_threads/messages` |
| Meta schema | `lean_event_schema_meta` |

### 4.5 Document Store (schema `008`)

| Tabella | Ruolo |
|---------|-------|
| `lean_event_documents` | Identità, kind, link, metadati, soft delete, legal hold — **no BYTEA** |
| `lean_event_document_versions` | Descriptor versione immutabile — **no BYTEA** |
| `lean_event_document_chunks` | Payload binario BYTEA |
| `lean_event_document_kind_policies` | Retention / preview / audit per `kind` |
| `lean_event_blob_migration_ledger` | Ledger cutover storico (ops) |
| `lean_event_audit_events` | Audit append-only |

### 4.6 Relazioni

- PK tipica: `(tenant_id, id)`
- FK composite `(tenant_id, …)` con `ON DELETE RESTRICT`
- Soft delete: riga resta, FK restano valide
- Optimistic locking via `revision` sulle entità gestite

### 4.7 Naming convention

| Contesto | Forma |
|----------|-------|
| SQL | `lean_event_` |
| Env | `LEAN_EVENT_*` |
| Path/code | `lean-event` / `leanEvent` / `LeanEvent` |
| Tipo evento TS | `TenantEvent` |
| Hub | `/lean-event/{tenantSlug}` |

### 4.8 Versionamento schema

Migrazioni SQL versionate in `docs/sql/` (`001`…`008`…).  
Stato applicato tracciato in `lean_event_schema_meta`.  
Nessuna migrazione “silenziosa” in produzione senza script di apply verificabile.

### 4.9 Principi di modellazione

1. Colonne tipizzate per campi di dominio stabili  
2. JSONB **solo** dove esplicitamente eccezionato (`workspaces.structured`)  
3. Nessun JSON come archivio primario di file  
4. Soft delete + purge esplicito  
5. Versionamento entità e documenti  
6. Indici multi-tenant su access path reali  

---

## 5. Document Store

### 5.1 Dichiarazione

> Il Document Store di Lean.Event risiede **esclusivamente** nel database Postgres del tenant.  
> **Non viene utilizzato Object Storage** (né Vercel Blob, né S3/R2, né equivalenti) come sistema di persistenza documentale.

### 5.2 Modello

```text
lean_event_documents  (1)
        │
        │ 1..N  (append-only)
        ▼
lean_event_document_versions  (N)
        │
        │ 1..M chunks
        ▼
lean_event_document_chunks.payload  (BYTEA)
```

### 5.3 documents

Identità, `kind`, status, filename/mime/bytes/sha256 di punta, link (`person_id`, `event_id`, `assignment_id`, `supplier_id`, `workspace_id`), `current_version`, `legal_hold`, `retention_class`, soft delete, meta strutturata.

### 5.4 versions

Versioni **immutabili** e append-only.  
Trigger/DB vietano UPDATE/DELETE runtime su versioni e chunk.  
Campi: version, hash, size, mime, compression, chunk_count, source, note, audit ref.

### 5.5 chunks

Unica sede del binario.  
Chunk size di riferimento: 512 KiB.  
Ricostruzione = concatenazione ordinata per `chunk_index`.

### 5.6 Hash (SHA-256)

- Calcolato su file completo in upload  
- Conservato sulla versione  
- Verificabile in download (`verify`)  
- Hash per-chunk per rilevazione corruzione locale  

### 5.7 Audit

Azioni obbligatorie: create, upload_version, download, soft_delete, restore, legal_hold, purge, integrity_fail.  
Persistite in `lean_event_audit_events`.

### 5.8 Retention e legal hold

Policy per `kind` in `lean_event_document_kind_policies`.  
`legal_hold = true` blocca il purge.  
Soft delete non elimina chunk.

### 5.9 Ricostruzione, versionamento, I/O

| Operazione | Comportamento |
|------------|---------------|
| Upload | Crea documento + version=1 + chunks |
| Nuova versione | Append version N+1 + chunks; aggiorna punta |
| Download | Ricostruisce da chunks; header SHA |
| Anteprima | Inline solo MIME safe (PDF/immagini) |
| Verifica integrità | `sha256(download) == versions.sha256` |
| Soft delete | Flag; contenuto resta |
| Restore | Annulla soft delete |
| Purge | Hard delete solo post-retention e senza legal hold |

---

## 6. AI Architecture

### 6.1 AI Gateway

Unico ingresso applicativo alle capacità AI (testo, strutturazione, trascrizione, …).

### 6.2 Provider

Primo provider: **OpenAI**.  
Provider aggiuntivi ammessi solo dietro il Gateway, senza cambiare i contratti di dominio.

### 6.3 Isolamento

Le invocazioni AI sono scoped al tenant della sessione.  
Nessun cross-tenant context leak.

### 6.4 Sicurezza

- Chiavi provider solo server-side  
- Nessuna chiamata `api.openai.com` fuori dal provider layer (gate CI)  
- Input/output soggetti ad audit dove il flusso lo richiede  

### 6.5 Gestione modelli

Modelli configurabili via env/config (`OPENAI_*_MODEL`), non hard-coded nei moduli di dominio.

### 6.6 Assistant Registry

Profili tecnici (ID) indipendenti dai nomi commerciali (Leonardo, Teresa, …).  
I nomi commerciali sono display/config only.

### 6.7 Future estensioni

Nuovi provider, tool-calling e pack AI si aggiungono **solo** tramite Gateway + Registry, senza bypass.

---

## 7. Event Architecture

### 7.1 Domain Events

Eventi di dominio tipizzati per side-effect e integrazione interna.  
Non sostituiscono le tabelle tipizzate.

### 7.2 Inngest

Motore ufficiale di esecuzione asincrona.

### 7.3 Eventi / queue / retry

- Publish tramite Jobs Port  
- Retry e step gestiti da Inngest  
- Endpoint piattaforma `/api/v1/platform/inngest`  

### 7.4 Background jobs

Backup metadata, export, purge, elaborazioni lunghe, sync: **solo** via Inngest (o invocazione sincrona breve se non richiedono orchestrazione).  
Vietate code custom permanenti.

---

## 8. Sicurezza

### 8.1 Autenticazione

Sessione firmata (`LEAN_EVENT_SESSION_SECRET`).  
Metodi supportati dal prodotto (email/token) restano dietro il layer auth Lean.Event.

### 8.2 Autorizzazione

Moduli e capability per tenant/utente.  
API e UI rispettano Module Registry (fail-closed).

### 8.3 Audit

Eventi di sicurezza e ciclo documentale su Postgres tenant.

### 8.4 Fail-closed

Resolver DB/storage, tenant status, moduli, documenti senza contenuto: rifiuto esplicito.

### 8.5 Isolamento tenant

DB dedicato + `tenant_id` + session binding.  
Nessuna query cross-tenant nel Tenant Plane.

### 8.6 Protezione documenti

- Download autenticato  
- SHA-256  
- Soft delete / legal hold  
- Anteprima limitata a MIME sicuri  
- Nessuna URL pubblica Object Storage come SoT  

---

## 9. Scalabilità

| Dimensione | Strategia |
|------------|-----------|
| Tenant | N database `lean_event_t_*` nello stesso progetto Neon (salvo decisione Enterprise) |
| Dati di dominio | Tabelle tipizzate + indici multi-tenant |
| Documenti | Chunk BYTEA; crescita storage Neon; retention/purge |
| Utenti | Concorrenza applicativa + pooling Neon |
| Moduli | Pack commerciali senza fork di codice |

Vincolo: scale-to-zero aggressivo non è il target commerciale per tenant business-critical.

---

## 10. Backup e Disaster Recovery

### 10.1 Database

Backup Neon (PITR/history secondo piano commerciale).  
Export tenant (metadati + inventario documenti) come procedura applicativa.

### 10.2 Documenti e versioni

Inclusi nel backup del DB tenant (chunks BYTEA).  
Un solo motore di restore: Postgres.

### 10.3 Restore

Restore DB tenant ⇒ ripristina dominio + documenti + audit.  
Verifica post-restore: conteggi, hash campione, smoke document hub.

### 10.4 Verifiche

Gate obbligatori: inventario (dove applicabile), conteggi, SHA-256, test documentali, test architettura (R03).

---

## 11. Deployment

### 11.1 Locale

- Dev ufficiale via `npm run dev` (porta progetto corrente)  
- Env in `.env.local`  
- DB tenant dedicati + Control Plane  

### 11.2 Staging / Produzione

- Hosting: Vercel  
- Persistenza: Neon  
- Job: Inngest  
- AI: OpenAI via Gateway  
- Dominio prod target: `events.leanme.it` (o successore ufficiale)

### 11.3 CI/CD

Gate minimi:

- Naming architecture tests  
- R03: nessun `@vercel/blob` nel runtime applicativo  
- Test document store  

### 11.4 Variabili ambiente (categorie)

| Categoria | Esempi |
|-----------|--------|
| Control Plane | `LEAN_EVENT_CONTROL_PLANE_DATABASE_URL` |
| Tenant DB | `LEAN_EVENT_TENANT_<SLUG>_DATABASE_URL` |
| Sessione | `LEAN_EVENT_SESSION_SECRET` |
| Inngest | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| AI | `OPENAI_API_KEY` |
| Site | `NEXT_PUBLIC_SITE_URL` |
| Cutover legacy (temporaneo) | token Blob solo fino a dismissione firmata |

I token Blob **non** fanno parte del runtime definitivo; restano solo fino all’approvazione di decommission.

---

## 12. ARCHITECTURE MANDATES

Le seguenti decisioni sono **non negoziabili** senza approvazione esplicita scritta del titolare di prodotto/architettura.

1. **PostgreSQL/Neon è l’unico sistema di persistenza** di Lean.Event.  
2. **Database dedicato per ogni tenant** (`lean_event_t_<slug>`).  
3. **Control Plane dedicato** senza dati operativi cliente.  
4. **Nessun Object Storage** (Blob/S3/R2/…) come system of record.  
5. **Nessun JSON come fonte primaria** dei dati di dominio tipizzati.  
6. **Tutti i domini di business sono modellati relazionalmente** (eccezione esplicita: `workspaces.structured`).  
7. **Document Store interno a PostgreSQL** (`documents` + `versions` + `chunks`).  
8. **Versioni documentali immutabili** (append-only).  
9. **SHA-256 obbligatorio** su ogni versione documentale.  
10. **Audit obbligatorio** sulle operazioni documentali rilevanti.  
11. **Soft delete ≠ hard delete**; purge solo post-retention e senza legal hold.  
12. **Inngest è l’unico orchestratore** dei job asincroni durevoli.  
13. **AI Gateway è l’unico punto di accesso** ai provider AI.  
14. **Assistant Registry**: ID tecnici; nomi commerciali solo display/config.  
15. **Tenant Registry + Connection Resolver + Storage Resolver** obbligatori e fail-closed.  
16. **Module Registry + pack commerciali** obbligatori per gating feature.  
17. **API versionate** sotto `/api/v1/...`.  
18. **Naming Lean.Event** vincolante (path `lean-event`, tipo `TenantEvent`, SQL `lean_event_`).  
19. **Nessun alias legacy permanente** come architettura parallela.  
20. **Qualsiasi modifica architetturale futura richiede approvazione esplicita** prima dell’implementazione.

---

## ROADMAP ARCHITETTURALE

### IMPLEMENTATO

- Control Plane + Tenant Registry + Connection Resolver  
- Database per tenant (`lean_event_t_demo`, `lean_event_t_iec`, …)  
- Schema tipizzato `006` + documenti FK `007` + Document Store Postgres `008`  
- Document Hub runtime su PostgreSQL (upload, version, download, preview, soft delete, restore, audit, SHA-256)  
- Storage Resolver Postgres-only (runtime)  
- Rimozione `@vercel/blob` dal request path applicativo  
- Gate R03 runtime (allowlist vuota)  
- AI Gateway + Assistant Registry (fondazioni)  
- Inngest Jobs Port + endpoint piattaforma  
- Module Registry / pack (fondazioni)  
- Domain Events (fondazioni)  
- Build Information  
- ADR set v1.0 + naming gates CI  
- Inventario Blob legacy: nessun binario da migrare; JSON legacy esclusi da BYTEA  

### IN CORSO

- Completamento rename superfici HTTP/UI residue (`leanyou` → `lean-event` dove ancora presenti)  
- Allineamento continuo cutover letture dominio tipizzato / dual-path FS locali di sviluppo  
- Documentazione operativa di dismissione Blob (token/store) in attesa di firma umana  

### PIANIFICATO

- Dismissione definitiva package `@vercel/blob`, script ops Blob, env token e store Vercel (**solo dopo approvazione esplicita**)  
- `LEAN_EVENT_R03_STRICT=1` (blocca anche `scripts/`)  
- Rafforzamento backup/restore DR end-to-end per tenant (runbook + test restore)  
- Completamento registry documenti collegati a tutti i flussi UI  
- Hardening CI su isolamento tenant e contratti Core/moduli  

### FUTURO

- Provider AI aggiuntivi dietro Gateway  
- Eventuali progetti Neon dedicati per clienti Enterprise (eccezione architetturale firmata)  
- Pack commerciali avanzati e marketplace moduli  
- Observability dedicata (es. Sentry) come complemento, non come sostituzione dell’audit Postgres  
- Realtime confinato ai confini già ADR-izzati (Connect), senza contaminare il SoT  

---

## Chiusura

**Architettura Lean.Event v1.0 — CONGELATA (Architecture Freeze).**

PostgreSQL è la **Single Source of Truth**; Neon è il provider cloud ufficiale della v1.0.  
Questo documento è il riferimento ufficiale.  
Lo sviluppo funzionale può proseguire **solo** entro questi confini.  
Ogni proposta di modifica ai MANDATES richiede revisione tecnica, ADR e approvazione esplicita prima di qualsiasi commit o migrazione.

---

*Fine — LEAN.EVENT Technical Architecture Constitution v1.0*  
*Congelata il 2026-07-23*
