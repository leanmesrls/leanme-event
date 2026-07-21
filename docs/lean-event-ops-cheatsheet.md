# Lean Event · Cheatsheet operativo (PowerShell + Neon)

**Repo:** `leanme-event`  
**Dev:** http://localhost:3012  
**Prod:** https://event.leanme.it  
**Schema SQL:** `docs/sql/001_lean_event_schema.sql`  
**Resilienza dati:** `docs/leanyou-data-resilience.md`

> **Regola agent / team:** a ogni sezione dominio completata (nuova `entity_type`, flusso, supervisione), aggiornare **questo file** con le query Neon utili (conteggi, cerca, dettaglio, incoerenze). Non lasciare le query solo in chat.

---

## 0. Regola Windows / PowerShell

Su PowerShell spesso `npm` fallisce (Execution Policy su `npm.ps1`).

**Usa sempre:**

```powershell
npm.cmd ...
```

**Non usare** `npm` nudo se compare `PSSecurityException`.

Directory di lavoro:

```powershell
cd C:\Cursor\leanme-event
```

---

## 1. Comandi PowerShell di base

### 1.1 Dev server

```powershell
# Avvio (porta 3012)
npm.cmd run dev

# Se pagina bianca / 500 dopo una build:
# 1) Ctrl+C sul terminale dev
# 2) pulisci cache dev
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
# 3) riavvia
npm.cmd run dev
```

Apri: http://localhost:3012  
Login: http://localhost:3012/lean-event/login (o `/leanyou/login`)

> **Non** usare la porta **3011** (`leanme-site`). Questo repo è **3012**.

### 1.2 Build e restart

```powershell
# Build production (scrive in .next-prod, libera la 3012)
npm.cmd run build

# Dopo ogni build: riavvia il dev
npm.cmd run dev
```

### 1.3 Lint / typecheck

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit -p tsconfig.json
```

### 1.4 Neon — script npm

```powershell
# Schema + conteggi + PK/indici
npm.cmd run lean-event:verify-neon

# Elenco entità (eventi + contatti)
npm.cmd run lean-event:list-neon
npm.cmd run lean-event:list-neon -- --tenant demo

# Parità Neon ↔ Blob (serve BLOB_READ_WRITE_TOKEN valido)
npm.cmd run lean-event:compare-neon-blob

# Migrazione Blob/FS → Neon (attenzione: scrive su DB)
npm.cmd run lean-event:migrate-neon-dry
npm.cmd run lean-event:migrate-neon
```

Equivalente diretto (senza npm script):

```powershell
node --env-file=.env.local scripts/verify-neon-schema.mjs
node --env-file=.env.local scripts/list-neon-entities.mjs
```

### 1.5 Tenant / Vercel

```powershell
# Rigenera accessi + tenta sync Vercel
npm.cmd run lean-event:access

# Solo sync LEAN_EVENT_TENANTS_JSON
npm.cmd run lean-event:sync-vercel

# Sync + redeploy production
npm.cmd run lean-event:sync-vercel -- --deploy

# Stampa JSON tenant per copia manuale
npm.cmd run lean-event:vercel-env
```

### 1.6 Vercel CLI (env / deploy)

```powershell
# Lista env Production
npx.cmd vercel env ls production

# Aggiungi variabile (esempio cutover letture Neon)
# Digita 1 e Invio quando chiede il valore
echo 1 | npx.cmd vercel env add LEAN_EVENT_READ_FROM_NEON production

# Deploy production
npx.cmd vercel deploy --prod
```

### 1.7 Porta 3012 / processi

```powershell
# Chi è in ascolto sulla 3012?
netstat -ano | findstr ":3012"

# Termina PID (sostituisci 12345)
taskkill /F /PID 12345
```

### 1.8 Git essenziali

```powershell
git status
git diff
git log -5 --oneline
git pull
```

> Commit/push solo se richiesto esplicitamente.

### 1.9 Env locali importanti (`.env.local`)

| Variabile | Ruolo |
|-----------|--------|
| `LEAN_EVENT_DATABASE_URL` | Connessione Neon |
| `LEAN_EVENT_READ_FROM_NEON=1` | Letture UI da Neon (fallback Blob) |
| `BLOB_READ_WRITE_TOKEN` | Blob produzione / confronto |
| `LEAN_EVENT_SESSION_SECRET` | Sessioni |
| `NEXT_PUBLIC_SITE_URL` | Locale: `http://localhost:3012` |

---

## 2. Modello Neon (ricorda)

Tutto il dominio strutturato sta in **3 tabelle**:

| Tabella | Contenuto |
|---------|-----------|
| `lean_event_entities` | Eventi, contatti, sedi, fornitori, assignment, workspace, **Teresa chat**, … |
| `lean_event_entity_versions` | Snapshot revisioni |
| `lean_event_entity_presence` | Presenza multi-utente (Fase D) |
| `lean_event_documents` | Registry documenti binari (se applicato `002`) |
| `lean_event_audit_events` | Audit strutturato (se applicato `002`) |

**Non** esistono tabelle separate `contacts` / `events` / `teresa_chats`.  
Il tipo è in `entity_type`; i campi sono in `payload` (JSONB).

### Tipi `entity_type`

`event` · `contact` · `venue` · `supplier` · `assignment` · `workspace` · `event_supplier_link` · `event_chat` · **`teresa_chat`**

### Retention versioni (sostenibilità)

| Regola | Valore |
|--------|--------|
| Conserva ultime N | **50** (`LEAN_EVENT_VERSION_KEEP_LAST`) |
| Conserva ultimi D giorni | **90** (`LEAN_EVENT_VERSION_KEEP_DAYS`) |
| Prune | se **oltre N** e **più vecchia di D giorni** |
| Store prune | Neon + **Blob** + FS (dopo ogni snapshot) |
| UI Cronologia | prime **20**, poi “Mostra altre” |

Documento criteri (rivalutazioni): `docs/lean-event-retention-criteria.md`

Gli **assignment** (eventi collegati a un contatto) **non** hanno tetto numerico: restano lo storico completo. In UI: prima in corso/futuri, poi passati, con “Mostra altri” dopo 8.

**Teresa (`teresa_chat`):** ultimi **50 messaggi per thread** (prune applicativo al salvataggio). Più thread per utente.

### Campi utili in `payload`

| Tipo | Chiavi tipiche |
|------|----------------|
| `event` | `title`, `cdc`, `startDate`, `endDate`, `categoryId`, Scheda › Registrazione: `registration` (`paid`, `fees[]` label/amount/validFrom/validTo, `refundsEnabled`, `refundRules`), Formazione ECM: `ecmModality`, `formationEventTypeId`, `ecmGrid` (faculty in `scientificResponsible` / `scientificCommittee`), `scientificProgram` (fase Programma L1), `eventSponsors[]` (fase Sponsor L1), `venueDetails`, REF/PM |
| `contact` | `vocative`, `honorificTitle`, `firstName`, `lastName`, `email`, `emails[]` (`label`, `address`), `birthDate`, residenza (`country`, `address`, `city`, `province`, `region`, `postalCode`), ente (`organization*`), `organizationRole`, `tags[]`, `phones[]`, `dietaryNotes`, `mobilityNotes`, `personalRequests`, `privacyConsents[]` |
| `venue` | `name`, `country`, `address`, `city`, `province`, `region`, `postalCode` |
| `supplier` | `name`, `email`, `country`, `address`, `city`, `province`, `region`, `postalCode` |

> **Indirizzi:** stesso set di campi ovunque. In UI **Nazione è il primo campo**, poi indirizzo/città/provincia/regione(IT)/CAP. Persistenza in `payload` JSONB (vedi `docs/sql/004_lean_event_address_geo.sql` per indici).
| `assignment` | `eventId`, `contactId` |
| `workspace` | `title`, `linkedEventId` |
| `teresa_chat` | `userId`, `userEmail`, `userName`, `title`, `messages[]` (`role`, `content`, `createdAt`, `contextLabel`) |

---

## 3. Query Neon fondamentali

Usa **Neon Console → SQL Editor**, oppure `psql` con `LEAN_EVENT_DATABASE_URL`.

Sostituisci `'demo'` / pattern di ricerca dove serve.

### 3.1 Verifica schema (tabelle presenti)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'lean_event%'
ORDER BY table_name;
```

Atteso:

- `lean_event_entities`
- `lean_event_entity_presence`
- `lean_event_entity_versions`

### 3.2 Conteggio record (globale e per tipo)

```sql
SELECT 'entities' AS t, COUNT(*)::int AS n FROM lean_event_entities
UNION ALL
SELECT 'versions', COUNT(*)::int FROM lean_event_entity_versions
UNION ALL
SELECT 'presence', COUNT(*)::int FROM lean_event_entity_presence;
```

```sql
SELECT entity_type, COUNT(*)::int AS n
FROM lean_event_entities
WHERE deleted_at IS NULL
GROUP BY entity_type
ORDER BY entity_type;
```

```sql
-- Per tenant
SELECT entity_type, COUNT(*)::int AS n
FROM lean_event_entities
WHERE tenant_id = 'demo'
  AND deleted_at IS NULL
GROUP BY entity_type
ORDER BY entity_type;
```

### 3.3 Elenco eventi

```sql
SELECT
  id,
  tenant_id,
  revision,
  deleted_at IS NOT NULL AS in_trash,
  payload->>'title' AS title,
  payload->>'cdc' AS cdc,
  payload->>'categoryId' AS category_id,
  payload->>'ecmModality' AS formation_modality,
  payload->>'formationEventTypeId' AS formation_event_type,
  payload->>'formationStructureName' AS formation_structure,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'event'
  AND tenant_id = 'demo'
ORDER BY updated_at DESC;
```

### 3.3b Eventi formazione per tipologia di evento

```sql
SELECT
  id,
  tenant_id,
  payload->>'title' AS title,
  payload->>'categoryId' AS category_id,
  payload->>'formationEventTypeId' AS formation_event_type,
  payload->>'formationStructureName' AS formation_structure,
  payload->>'ecmModality' AS formation_modality,
  payload->'ecmGrid'->>'formativeObjectiveCode' AS obiettivo_formativo,
  payload->'ecmGrid'->>'expectedParticipants' AS partecipanti_previsti,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND tenant_id = 'demo'
  AND payload->>'categoryId' IN (
    'formazione_sanitaria',
    'formazione_non_sanitaria'
  )
ORDER BY updated_at DESC;
```

### 3.3c Griglia ECM — dettaglio payload

```sql
SELECT
  id,
  payload->>'title' AS title,
  payload->'ecmGrid' AS ecm_grid
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND tenant_id = 'demo'
  AND id = 'INCOLLA-EVENT-ID';
```

### 3.3d Registrazione / quote iscrizione

```sql
SELECT
  id,
  payload->>'title' AS title,
  payload->'registration'->>'paid' AS quota_pagamento,
  jsonb_array_length(COALESCE(payload->'registration'->'fees', '[]'::jsonb)) AS n_quote,
  payload->'registration'->>'refundsEnabled' AS rimborsi,
  payload->'registration'->>'refundRules' AS regole_rimborso,
  payload->'registration'->'fees' AS fees
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND tenant_id = 'demo'
ORDER BY updated_at DESC
LIMIT 50;
```

Dettaglio evento:

```sql
SELECT
  id,
  payload->>'title' AS title,
  payload->'registration' AS registration
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND tenant_id = 'demo'
  AND id = 'INCOLLA-EVENT-ID';
```

### 3.3e Assignment per ruolo (anagrafiche evento)

```sql
SELECT
  id,
  payload->>'eventId' AS event_id,
  payload->>'contactId' AS contact_id,
  payload->>'roleCategory' AS role_category,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'assignment'
  AND deleted_at IS NULL
  AND tenant_id = 'demo'
  AND payload->>'eventId' = 'INCOLLA-EVENT-ID'
ORDER BY payload->>'roleCategory', updated_at DESC;
```

### 3.4 Cerca evento per titolo

```sql
SELECT
  id,
  tenant_id,
  revision,
  payload->>'title' AS title,
  payload->>'cdc' AS cdc,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND payload->>'title' ILIKE '%aaa%'
ORDER BY updated_at DESC;
```

### 3.5 Cerca contatto per nome / cognome / email

```sql
SELECT
  id,
  tenant_id,
  revision,
  payload->>'firstName' AS first_name,
  payload->>'lastName' AS last_name,
  payload->>'email' AS email,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'contact'
  AND deleted_at IS NULL
  AND (
    payload->>'firstName' ILIKE '%lupinetti%'
    OR payload->>'lastName' ILIKE '%lupinetti%'
    OR payload->>'email' ILIKE '%@leanme.it%'
  )
ORDER BY payload->>'lastName', payload->>'firstName';
```

```sql
-- Indirizzo completo (residenza + ente) per persona — es. Alessandro Lupinetti
SELECT
  tenant_id,
  id,
  payload->>'firstName' AS nome,
  payload->>'lastName' AS cognome,
  payload->>'email' AS email,
  payload->>'country' AS nazione,
  payload->>'address' AS indirizzo,
  payload->>'city' AS citta,
  payload->>'province' AS provincia,
  payload->>'region' AS regione,
  payload->>'postalCode' AS cap,
  payload->>'organization' AS ente,
  payload->>'organizationCountry' AS nazione_ente,
  payload->>'organizationAddress' AS indirizzo_ente,
  payload->>'organizationCity' AS citta_ente,
  payload->>'organizationProvince' AS provincia_ente,
  payload->>'organizationRegion' AS regione_ente,
  payload->>'organizationPostalCode' AS cap_ente
FROM lean_event_entities
WHERE entity_type = 'contact'
  AND deleted_at IS NULL
  AND payload->>'lastName' ILIKE '%lupinetti%'
  AND payload->>'firstName' ILIKE '%alessandro%'
ORDER BY updated_at DESC;
-- Opzionale: AND tenant_id = 'demo'
```

### 3.6 Contatto per ID

```sql
SELECT id, tenant_id, revision, payload, deleted_at, updated_at
FROM lean_event_entities
WHERE entity_type = 'contact'
  AND id = 'INCOLLA-UUID-QUI';
```

### 3.7 Cerca sede per nome / città

```sql
SELECT
  id,
  tenant_id,
  payload->>'name' AS name,
  payload->>'city' AS city,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'venue'
  AND deleted_at IS NULL
  AND (
    payload->>'name' ILIKE '%roma%'
    OR payload->>'city' ILIKE '%roma%'
  )
ORDER BY payload->>'name';
```

### 3.8 Fornitori

```sql
SELECT
  id,
  tenant_id,
  payload->>'name' AS name,
  payload->>'email' AS email,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'supplier'
  AND deleted_at IS NULL
  AND payload->>'name' ILIKE '%hotel%'
ORDER BY payload->>'name';
```

### 3.9 Ospiti / assignment di un evento

```sql
SELECT
  id,
  revision,
  payload->>'eventId' AS event_id,
  payload->>'contactId' AS contact_id,
  payload,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'assignment'
  AND deleted_at IS NULL
  AND payload->>'eventId' = 'INCOLLA-EVENT-UUID'
ORDER BY updated_at DESC;
```

### 3.10 Verbali / workspace

```sql
SELECT
  id,
  tenant_id,
  revision,
  payload->>'title' AS title,
  payload->>'linkedEventId' AS linked_event_id,
  deleted_at IS NOT NULL AS in_trash,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'workspace'
  AND tenant_id = 'demo'
ORDER BY updated_at DESC;
```

```sql
-- Workspace collegati a un evento
SELECT id, payload->>'title' AS title, updated_at
FROM lean_event_entities
WHERE entity_type = 'workspace'
  AND deleted_at IS NULL
  AND payload->>'linkedEventId' = 'INCOLLA-EVENT-UUID';
```

### 3.11 Cestino (soft delete)

```sql
SELECT
  entity_type,
  id,
  payload->>'title' AS title,
  payload->>'lastName' AS last_name,
  payload->>'firstName' AS first_name,
  deleted_at,
  purge_after
FROM lean_event_entities
WHERE tenant_id = 'demo'
  AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### 3.12 Record singolo (payload completo)

```sql
SELECT *
FROM lean_event_entities
WHERE tenant_id = 'demo'
  AND entity_type = 'event'
  AND id = 'INCOLLA-UUID-QUI';
```

### 3.13 Ricerca full-text grezza sul JSON

```sql
SELECT
  entity_type,
  id,
  tenant_id,
  payload->>'title' AS title,
  payload->>'lastName' AS last_name,
  payload->>'firstName' AS first_name,
  payload->>'name' AS name,
  updated_at
FROM lean_event_entities
WHERE deleted_at IS NULL
  AND payload::text ILIKE '%testo-da-cercare%'
ORDER BY updated_at DESC
LIMIT 50;
```

### 3.14 Versioni di un’entità

```sql
SELECT
  revision,
  changed_by,
  changed_at,
  change_summary
FROM lean_event_entity_versions
WHERE tenant_id = 'demo'
  AND entity_type = 'event'
  AND entity_id = 'INCOLLA-UUID-QUI'
ORDER BY revision DESC;
```

API UI:

```text
GET  /api/lean-event/entities/{type}/{id}/versions
POST /api/lean-event/entities/{type}/{id}/versions/{rev}/restore
```

Schede con pannello **Cronologia**: contatto, evento, sede, fornitore, verbale.

### 3.15 Orfani / incoerenze rapide

```sql
-- Assignment senza eventId
SELECT id, tenant_id, payload
FROM lean_event_entities
WHERE entity_type = 'assignment'
  AND deleted_at IS NULL
  AND (payload->>'eventId' IS NULL OR payload->>'eventId' = '');

-- Workspace senza linkedEventId (può essere legittimo)
SELECT id, payload->>'title' AS title
FROM lean_event_entities
WHERE entity_type = 'workspace'
  AND deleted_at IS NULL
  AND (payload->>'linkedEventId' IS NULL OR payload->>'linkedEventId' = '');
```

### 3.16 Teresa chat (`entity_type = 'teresa_chat'`)

**Nota:** non esiste una tabella `teresa_*`. I thread sono righe in `lean_event_entities`.  
UI supervisione globale LeanMe: `/lean-event/{tenant}/lean-studio` (solo email `@leanme.it` / allowlist; legacy `/lean-human` → redirect).  
API: `GET /api/lean-event/teresa/supervise` · chat utente: `/api/lean-event/teresa/chat`.

```sql
-- Conteggio thread Teresa (globale e per tenant)
SELECT tenant_id, COUNT(*)::int AS threads
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND deleted_at IS NULL
GROUP BY tenant_id
ORDER BY threads DESC;
```

```sql
-- Ultimi thread (tutti i tenant) — vista operatore
SELECT
  tenant_id,
  id,
  payload->>'userEmail' AS user_email,
  payload->>'userName' AS user_name,
  payload->>'title' AS title,
  jsonb_array_length(COALESCE(payload->'messages', '[]'::jsonb)) AS message_count,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 50;
```

```sql
-- Thread di un utente (email) cross-tenant
SELECT
  tenant_id,
  id,
  payload->>'title' AS title,
  jsonb_array_length(COALESCE(payload->'messages', '[]'::jsonb)) AS message_count,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND deleted_at IS NULL
  AND lower(payload->>'userEmail') = lower('luana.martuzzi@leanme.it')
ORDER BY updated_at DESC;
```

```sql
-- Thread di un tenant
SELECT
  id,
  payload->>'userEmail' AS user_email,
  payload->>'userName' AS user_name,
  payload->>'title' AS title,
  jsonb_array_length(COALESCE(payload->'messages', '[]'::jsonb)) AS message_count,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND tenant_id = 'demo'
  AND deleted_at IS NULL
ORDER BY updated_at DESC;
```

```sql
-- Dettaglio thread + messaggi (payload completo)
SELECT id, tenant_id, revision, updated_at, payload
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND tenant_id = 'demo'
  AND id = 'INCOLLA-THREAD-ID';
```

```sql
-- Espandi messaggi di un thread (una riga per messaggio)
SELECT
  e.tenant_id,
  e.id AS thread_id,
  e.payload->>'userEmail' AS user_email,
  msg.ordinality AS msg_n,
  msg.elem->>'role' AS role,
  left(msg.elem->>'content', 200) AS content_preview,
  msg.elem->>'createdAt' AS created_at,
  msg.elem->>'contextLabel' AS context_label
FROM lean_event_entities e
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.payload->'messages', '[]'::jsonb))
  WITH ORDINALITY AS msg(elem, ordinality)
WHERE e.entity_type = 'teresa_chat'
  AND e.deleted_at IS NULL
  AND e.id = 'INCOLLA-THREAD-ID'
ORDER BY msg.ordinality;
```

```sql
-- Thread con più di 50 messaggi (anomalia: prune applicativo dovrebbe tagliare a 50)
SELECT
  tenant_id,
  id,
  payload->>'userEmail' AS user_email,
  jsonb_array_length(COALESCE(payload->'messages', '[]'::jsonb)) AS message_count,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND deleted_at IS NULL
  AND jsonb_array_length(COALESCE(payload->'messages', '[]'::jsonb)) > 50
ORDER BY message_count DESC;
```

```sql
-- Cerca testo nei messaggi Teresa (grezzo)
SELECT
  tenant_id,
  id,
  payload->>'userEmail' AS user_email,
  payload->>'title' AS title,
  updated_at
FROM lean_event_entities
WHERE entity_type = 'teresa_chat'
  AND deleted_at IS NULL
  AND payload::text ILIKE '%testo-da-cercare%'
ORDER BY updated_at DESC
LIMIT 50;
```

```sql
-- Audit turni Teresa (se tabella audit presente)
SELECT ts, tenant_id, user_email, action, resource_type, resource_id, meta
FROM lean_event_audit_events
WHERE action = 'teresa_turn'
ORDER BY ts DESC
LIMIT 50;
```

### 3.17 Indirizzi / nazione (`country`, `region`)

Schema SQL indici: `docs/sql/004_lean_event_address_geo.sql`  
Apply: `npm.cmd run lean-event:apply-neon-004`  

Dettaglio indirizzo per persona: vedi anche **§3.5** (query Alessandro Lupinetti / cognome+nome).

```sql
-- Contatti per nazione di residenza
SELECT tenant_id, id,
  payload->>'lastName' AS cognome,
  payload->>'firstName' AS nome,
  payload->>'country' AS nazione,
  payload->>'city' AS citta,
  payload->>'region' AS regione
FROM lean_event_entities
WHERE entity_type = 'contact'
  AND deleted_at IS NULL
  AND payload->>'country' = 'Italia'
ORDER BY updated_at DESC
LIMIT 50;
```

```sql
-- Contatti esteri (nazione ≠ Italia)
SELECT tenant_id, id,
  payload->>'lastName' AS cognome,
  payload->>'country' AS nazione,
  payload->>'city' AS citta,
  payload->>'province' AS provincia
FROM lean_event_entities
WHERE entity_type = 'contact'
  AND deleted_at IS NULL
  AND COALESCE(payload->>'country', '') <> ''
  AND payload->>'country' <> 'Italia'
ORDER BY updated_at DESC
LIMIT 50;
```

```sql
-- Eventi per nazione sede (venueDetails)
SELECT tenant_id, id,
  payload->>'title' AS titolo,
  payload->'venueDetails'->>'country' AS nazione_sede,
  payload->'venueDetails'->>'city' AS citta_sede
FROM lean_event_entities
WHERE entity_type = 'event'
  AND deleted_at IS NULL
  AND payload->'venueDetails'->>'country' IS NOT NULL
ORDER BY updated_at DESC
LIMIT 50;
```

---

## 4. Checklist smoke rapida

Checklist formale produzione: **`docs/lean-event-smoke-checklist.md`**.

### Locale (flag `LEAN_EVENT_READ_FROM_NEON=1`)

1. `npm.cmd run lean-event:verify-neon` → OK  
2. `npm.cmd run lean-event:list-neon` → conteggi attesi  
3. `npm.cmd run dev` → http://localhost:3012  
4. Login tenant `demo` → rubrica / eventi / verbali / cestino / import fornitori-eventi  

### Produzione

1. Neon SQL Editor → conteggi per `tenant_id = 'demo'`  
2. https://event.leanme.it → stesse schermate  
3. Firmare `docs/lean-event-smoke-checklist.md` dopo deploy  
4. Se sospetto cutover: controlla env `LEAN_EVENT_READ_FROM_NEON` su Vercel Production  

---

## 5. Troubleshooting veloce

| Sintomo | Azione |
|---------|--------|
| `npm` → Execution Policy | Usa `npm.cmd` |
| Localhost non risponde | `npm.cmd run dev` (porta **3012**) |
| Pagina bianca / 500 | Elimina `.next`, riavvia `npm.cmd run dev` |
| Cronologia / salvataggio `Blob: Access denied` | Token Blob invalido o duplicato in `.env.local` — correggi `BLOB_READ_WRITE_TOKEN` (una sola riga) e riavvia il dev |
| Verify Neon FAIL tabelle | Esegui `docs/sql/001_lean_event_schema.sql` (+ `002` se documenti/audit) in Neon |
| Compare Neon/Blob Access denied | Rinnova `BLOB_READ_WRITE_TOKEN` (Vercel Storage) |
| Login prod fallisce | Controlla `LEAN_EVENT_TENANTS_JSON` + `LEAN_EVENT_SESSION_SECRET` |

---

## 6. Link correlati

- `docs/deploy-leanme-event.md` — deploy GitHub/Vercel  
- `docs/leanyou-data-resilience.md` — fasi A/B/C, dual-write, cutover  
- `docs/lean-event-integrity-status.md` — stato integrità  
- `docs/lean-event-smoke-checklist.md` — smoke prod formale  
- `docs/lean-event-commercial-pact.md` — patto commerciale  
- `docs/sql/001_lean_event_schema.sql` — DDL  
- `docs/lean-event.md` — prodotto / URL / import  
