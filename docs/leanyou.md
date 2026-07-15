# LeanYou v1.0 — Area riservata clienti

LeanYou è l'area privata del sito LeanMe per clienti con servizi attivi. La **v1.0** include **Leonardo · Secretary Assistant** (verbali da audio/video).

## URL multi-tenant

Login unico pubblico: **`/leanyou/login`** — nessun branding cliente visibile dal menu del sito.

Dopo l'accesso (email, password o token), l'utente viene indirizzato all'area del proprio tenant:

| Cliente | Slug | Area Leonardo |
|---------|------|---------------|
| I&C srl | `iec` | `/leanyou/iec/leonardo` |

- Menu pubblico demo: voce **🔒 LEANYOU** → `/leanyou/login`
- Link legacy `/leanyou/iec/login` reindirizzano al login unico (token e query string preservati)
- Percorsi legacy `/leanyou/leonardo/*` reindirizzano al tenant della sessione attiva
- `robots.txt` esclude `/leanyou`

## Setup locale

1. Copia `.env.example` in `.env.local` e imposta:
   - `LEANYOU_SESSION_SECRET`
   - `OPENAI_API_KEY` (per generazione verbali)
2. Genera tenant, password hash e token:

```bash
npm run leanyou:access
```

3. Leggi il registro accessi in `.leanyou-data/access-registry.md`
4. Excel credenziali (apribile con Excel):
   - **`.leanyou-data/utenze-credenziali.csv`** — Azienda, Nome, Cognome, Email, Password, URL accesso diretto
   - **`.leanyou-data/utenze-attive.csv`** — include anche Token e URL diretto
5. Avvia il sito e accedi da `/leanyou/login`

## Import massivo (Excel)

Modelli scaricabili (generati a build):

| Rubrica | Modello Excel | API import |
|---------|---------------|------------|
| Contatti | `/assets/leanyou/import/leanyou-rubrica-contatti.xlsx` | `POST /api/leanyou/contacts/import` |
| Sedi | `/assets/leanyou/import/leanyou-rubrica-sedi.xlsx` | `POST /api/leanyou/venues/import` |

- Foglio **Istruzioni** + foglio **Dati** (riga 1 = intestazioni).
- Contatti obbligatori: **Nome**, **Cognome**. Email duplicata → riga saltata.
- Sedi obbligatorie: **Nome sede**, **Indirizzo sede**, **Città**, **Provincia sede**.
- Rigenera modelli: `npm run leanyou:import-templates`

## Deploy Vercel (demo.leanme.it)

Su Vercel il file `.leanyou-data/tenants.json` **non esiste**. Senza env vars, login e token **non funzionano**.

### Setup iniziale (una volta)

Vercel → Project → Settings → Environment Variables (Production):

| Variabile | Valore |
|-----------|--------|
| `LEANYOU_TENANTS_JSON` | vedi sync sotto |
| `LEANYOU_SESSION_SECRET` | da `.env.local` |
| `OPENAI_API_KEY` | da `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | `https://demo.leanme.it` |
| `BLOB_READ_WRITE_TOKEN` | creato automaticamente collegando Blob Store |

**Storage workspace persistente:** Vercel Dashboard → **Storage** → **Create Database / Store** → **Blob** → collega al progetto `leanme-site`. Vercel imposta `BLOB_READ_WRITE_TOKEN` in Production. Redeploy.

Senza Blob Store i workspace in produzione restano solo in `/tmp` (effimeri).

### Costi Vercel Blob (2026)

| Piano | Storage | Operazioni | Costo extra |
|-------|---------|------------|-------------|
| **Hobby (free)** | 1 GB | 10k read, 2k write/mese | **€0** — oltre il limite Blob si sospende fino al ciclo successivo |
| **Pro (~$20/mese)** | 5 GB inclusi | 100k read, 10k write inclusi | ~$0.023/GB storage, pochi centesimi per uso LeanYou tipico |

Per I&C con pochi verbali/mese: **costo praticamente zero** su Hobby o incluso nel Pro.

Collega il progetto locale: `vercel link`

### Aggiornamento tenant / credenziali

```bash
npm run leanyou:access          # rigenera + sync automatico su Vercel
npm run leanyou:sync-vercel     # solo sync LEANYOU_TENANTS_JSON
npm run leanyou:sync-vercel -- --deploy   # sync + redeploy production
```

Fallback manuale: `npm run leanyou:vercel-env` → incolla JSON su Vercel → Redeploy.

Per saltare il sync automatico: `LEANYOU_SKIP_VERCEL_SYNC=1 npm run leanyou:access`

Priorità caricamento tenant: `LEANYOU_TENANTS_JSON` → file locale → `tenants.example.json`

## Log accessi e attività

### Locale / server con filesystem

Per ogni tenant, file JSON Lines (una riga = un evento):

```
.leanyou-data/audit/{tenantId}/events.jsonl
```

Esempi tenant: `iec/events.jsonl`, `demo/events.jsonl`

Tentativi di login falliti senza tenant noto:

```
.leanyou-data/audit/_global/events.jsonl
```

Eventi registrati (v1):

- `login_success` / `login_failed` / `logout`
- `workspace_create` / `workspace_update` / `workspace_delete`
- `workspace_process_start` / `workspace_process_complete` / `workspace_process_failed`

Ogni riga contiene: timestamp ISO, tenant, utente, azione, IP (se disponibile), risorsa.

### Vercel (produzione)

I file audit **non persistono** su Vercel (filesystem effimero). Gli stessi eventi vengono scritti anche su **stdout** con prefisso `leanyou_audit`.

Consultabili in: **Vercel Dashboard → Project → Logs** → filtra per `leanyou_audit`.

> Per audit persistente in produzione: prossimo step Postgres / Log Drain / servizio esterno.

## Accesso clienti

Due modalità:

- **Email + password** per singolo utente (scoped al tenant nell'URL)
- **Token URL** per accesso diretto (`/leanyou/login?token=...`)

Ogni azienda ha:

- un token aziendale (accede come admin di default)
- token individuali per ogni utente

### I&C srl (tenant `iec`)

Credenziali iniziali (vedi anche `access-registry.md` dopo `npm run leanyou:access`):

- Email: `info@iec-srl.it`
- Password: `iec-srl`
- Token: generato dallo script (link diretto nel registro)

## Storage

Dati runtime in `.leanyou-data/` (gitignored):

- `tenants.json` — utenze e token
- `utenze-credenziali.csv` — Excel credenziali per azienda
- `utenze-attive.csv` — Excel completo con token
- `workspaces/{tenantId}/*.json` — workspace verbali (locale)
- `audit/{tenantId}/events.jsonl` — log accessi e attività
- `access-registry.md` — registro credenziali generate

> **Produzione:** tenant via `LEANYOU_TENANTS_JSON`. Workspace via **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`, path `leanyou/workspaces/...`). Senza Blob: fallback `/tmp` (effimero). Audit solo su Vercel Logs.

**Resilienza dati (concorrenza, versioning, backup, cestino 30 gg):** vedi `docs/leanyou-data-resilience.md`.

## Prompt Leonardo

I prompt sono in `data/leanyou/prompts.json`.

## Prossimi passi (post-v1)

- Coda job asincrona (Inngest) per riunioni lunghe
- Export DOCX nativo
- ~~Storage persistente cloud~~ → Vercel Blob (v1.1)

## Roadmap moduli tenant I&C srl (`iec`)

> **Nota:** strutture pianificate, non ancora in sviluppo. v1 include solo **Leonardo · Secretary Assistant**.

Moduli previsti nell'area personale I&C, visibili in sidebar LeanYou in base a tenant e utenza:

### 1. Leonardo · Secretary Assistant ✅ (v1 — Workspace verbali)

Verbali da audio/video — già attivo. In roadmap diventa voce **Workspace verbali** dentro la piattaforma **Leonardo** (`/leanyou/{tenant}/leonardo`), con collegamento opzionale agli eventi.

**Scheda tecnica completa (generazione verbali):** `docs/leanyou-leonardo-scheda-tecnica.md`  
**Piattaforma Leonardo (architettura + eventi):** `docs/leanyou-event-architecture.md`, `docs/leanyou-events.md`

### 2. Academy (LeanYou)

Video **a pagamento** esclusivi dell'area privata (distinti dai contenuti free dell'area pubblica `/lean-academy`).

- Acquisto a livello **azienda** o **singole utenze**
- Gestione accessi per utente/ruolo

### 3. Dashboard

Cruscotto riepilogativo tenant: KPI eventi, attività recenti, scorciatoie moduli attivi.

### 4. Eventi (gestionale congressi)

Gestione end-to-end degli eventi — **specifica e piano:** `docs/leanyou-events.md`  
**Pack e funzioni per tier commerciale:** `docs/leanyou-event-platform-packs.md`

- Anagrafica eventi
- Logistica eventi
- Allotment
- Transfers
- Lettere di incarico
- Documenti relatori ECM
- Attestati di partecipazione
- Form di registrazione
- QR code / badge per accredito real time
- Form di ospitalità
- Survey
- Certificati di partecipazione
- Certificati ECM
- Budget evento: preventivo, consuntivo, versione cliente
- Registrazione fatture clienti e fornitori (bilancino evento)

### 5. Lean.Agent (contestuale evento)

Assistenza AI specifica per:

- Singolo evento
- Singolo partecipante

### 6. Database contatti

Anagrafica contatti collegata a ciascun evento, con ruolo per evento:

- Partecipanti
- Docenti
- Staff sponsor
- Staff tecnico
- Staff interno

### 7. Area documentale

Repository documenti tenant/evento con permessi per utenza.

---

**Menu sito pubblico (2026-07):** HOME · CHI SIAMO (Staff Ibrido Humani+AI, Dicono di noi) · COME POSSIAMO AIUTARTI · LEAN LAB · LEAN ACADEMY · 🔒 LEANYOU · CTA header «CONNETTITI CON NOI»
