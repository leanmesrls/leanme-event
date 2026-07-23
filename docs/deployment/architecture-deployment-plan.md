# Lean.Event — Architecture Deployment Plan

**Stato:** **APPROVATO** — stack infrastrutturale congelato (2026-07-22)  
**Data:** 2026-07-22  
**Scopo:** riferimento ufficiale dei servizi esterni Lean.Event v1.0.  
**Vincolo:** provisioning e migrazioni solo dopo procedura operativa guidata e conferma fase per fase.

Documenti correlati:

- `docs/design/lean-event-architecture-mandate.md`
- `docs/adr/0005-database-per-tenant.md`
- `docs/adr/0006-storage-per-tenant.md`
- `docs/adr/0016-async-jobs-inngest.md`
- `docs/operations/credentials-required.md`

---

## 1. Obiettivo del freeze

Congelare lo **stack infrastrutturale** che rende operativa l’architettura Lean.Event v1.0:

| Decisione architetturale | Servizio infrastrutturale |
|--------------------------|---------------------------|
| App + API serverless | Vercel |
| Control Plane + DB per tenant | Neon Postgres |
| Storage documentale per tenant | Neon Postgres (chunks BYTEA nel DB tenant) — Blob solo legacy cutover |
| Job asincroni durevoli | Inngest |
| AI Gateway (primo provider) | OpenAI API |
| Codice / CI | GitHub |
| Dominio produzione | DNS del registrar (es. Cloudflare) → `events.leanme.it` |

---

## 2. Mappa dipendenze (ordine di attivazione)

```text
GitHub (repo)
    └── Vercel (deploy Next.js)
            ├── LEAN_EVENT_SESSION_SECRET (locale/Vercel env)
            ├── Neon
            │     ├── DB Control Plane          ← obbligatorio prima del Registry
            │     └── DB Tenant A..N            ← obbligatorio prima del cutover dati
            ├── (opz.) Vercel Blob legacy       ← solo sorgente migrazione; non SoT
            ├── Inngest                         ← obbligatorio prima dei job lunghi in prod
            └── OpenAI                          ← obbligatorio per AI / meeting-minutes
DNS (events.leanme.it)
    └── punta a Vercel
```

**Regola:** senza Control Plane DB non si attiva il Tenant Registry.  
Senza DB tenant dedicati (+ schema documenti `008`) non si esegue il cutover documentale.  
Senza Inngest i job lunghi non rispettano il mandato (no coda artigianale).  
Senza OpenAI il modulo AI non elabora verbali.  
Blob non è requisito di runtime definitivo.

---

## 3. Elenco completo servizi esterni

### 3.1 Tabella sintetica

| # | Servizio | Ruolo in Lean.Event | Obbligatorio | Fase |
|---|----------|---------------------|--------------|------|
| 1 | **GitHub** | Source of truth codice, PR, eventuale CI | **Sì** | subito |
| 2 | **Vercel** | Hosting Next.js, env, cron HTTP, deploy | **Sì** | subito |
| 3 | **Neon Postgres** | Control Plane + 1 DB per tenant | **Sì** | prima del cutover |
| 4 | **Vercel Blob** | Legacy only — inventariare/migrare; **non** SoT | No (cutover) | finché gate dismissione non firmato |
| 5 | **Inngest** | Motore job/workflow asincroni | **Sì** | prima job lunghi in prod |
| 6 | **OpenAI API** | Provider AI dietro AI Gateway | **Sì** | per AI operative |
| 7 | **DNS / dominio** | `events.leanme.it` → Vercel | **Sì** (prod) | go-live pubblico |
| 8 | Neon API (`NEON_API_KEY`) | Provisioning automatico DB tenant | Opzionale | automazione ops |
| 9 | Vercel API (`VERCEL_TOKEN`) | Provisioning automatico Blob store | Opzionale | automazione ops |
| 10 | Error tracking (es. Sentry) | Observability errori | Opzionale v1.0 | raccomandato prod |
| 11 | Log drain / APM (Datadog, Axiom, …) | Log lunghi / metriche | Opzionale | scala / SLA |
| 12 | Email provider (Resend, SES, …) | Comunicazioni massive | Opzionale | modulo comunicazioni |
| 13 | SMS / WhatsApp provider | Comunicazioni | Opzionale | pack futuri |
| 14 | Pagamenti (PayPal/Stripe) | Iscrizioni a pagamento | Opzionale | feature business |
| 15 | Alternative AI (Azure OpenAI, Anthropic, …) | Provider aggiuntivi Gateway | Opzionale | post-v1.0 |

---

## 4. Schede servizio (dettaglio)

### 4.1 GitHub — **obbligatorio**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Repository ufficiale; indipendenza da Cursor; CI/CD verso Vercel |
| **Alternative** | GitLab, Bitbucket — possibili ma fuori stack LeanMe attuale |
| **Costo stimato** | $0 su piano Free/Team tipico per repo privato org |
| **Limiti free** | Actions minutes limitati; irrilevanti se deploy è su Vercel Git integration |
| **Scalabilità** | Non è bottleneck prodotto |
| **Dipendenze** | Nessuna; è la radice |

### 4.2 Vercel — **obbligatorio**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Runtime ufficiale Next.js App Router; env secrets; integrazione Blob; cron route; allineato all’ecosistema LeanMe |
| **Alternative** | Cloudflare Workers / AWS Amplify / self-host Node — richiederebbero ripensare Blob, cron e adapter Neon |
| **Costo stimato** | **Hobby** $0 (non adatto a commerciale multi-tenant serio). **Pro** ~**$20/user/mese** + usage (include ~$20 credit usage). Produzione Lean.Event: pianificare **Pro** |
| **Limiti Hobby** | Limiti build/bandwidth/Blob; non adatto a vendere il prodotto; Blob si sospende oltre quota |
| **Scalabilità** | Buona per SaaS serverless; attenzione a timeout HTTP → motivano Inngest |
| **Dipendenze** | GitHub; poi Neon/Blob/Inngest/OpenAI via env |

### 4.3 Neon Postgres — **obbligatorio**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Postgres serverless, compatibile Vercel, branching, PITR sui piani a pagamento; adatto a **molti database per progetto** (Control Plane + tenant) |
| **Modello Lean.Event** | **Congelato:** progetto Neon ufficiale **già esistente**; `neondb` = solo sorgente cutover; Control Plane = solo `lean_event_control_plane`; tenant = `lean_event_t_<slug>` nello stesso progetto. Nuovi progetti Neon vietati senza decisione architetturale (Enterprise). Dettaglio: `docs/operations/provisioning-reuse-inventory.md` §0 |
| **Alternative** | Supabase, RDS, Cloud SQL, Postgres self-managed — possibili ma cambiano ops/driver; **non** consigliate in questo freeze |
| **Costo stimato (ordini di grandezza, verify su neon.com/pricing)** | **Free:** $0 ma **non idoneo** alla commercializzazione multi-DB. **Launch:** pay-as-you-go — compute ~**$0.106/CU-hour**, storage ~**$0.35/GB-mese**; history fino ~7 giorni. **Scale:** compute più alto (~**$0.222/CU-hour**), history fino ~30 giorni, SLA/compliance |
| **Limiti Free** | ~0.5 GB storage **per project**, 100 CU-hour/project, scale-to-zero obbligatorio (cold start), history ~6h — **inadeguato** come SoT clienti paganti |
| **Impatto scalabilità** | Positivo: isolamento per tenant, restore indipendente. Costo cresce con N tenant always-on. Mitigazione: scale-to-zero su tenant idle (accettare cold start) oppure compute minimo su tenant attivi |
| **Dipendenze** | Nessuna verso Blob/Inngest; **bloccante** per Registry e cutover |

**Nota critica:** sul Free, lo storage è tipicamente per **project**, non “illimitato per ogni database”. Per N tenant commerciali serve piano **Launch/Scale**.

### 4.4 Document storage — **Neon Postgres** (obbligatorio)

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Un solo SoT per tenant; backup/export/integrità SHA-256 unificati |
| **Modello Lean.Event** | `lean_event_documents` + `document_versions` + `document_chunks` (BYTEA) nel DB tenant |
| **Schema** | `docs/sql/008_lean_event_documents_postgres_store.sql` |
| **Object Storage** | **Non** parte del runtime definitivo. Vercel Blob resta solo sorgente legacy fino a dismissione approvata |
| **Dipendenze** | Neon Launch/Scale per tenant commerciali (dimensione bytea) |

#### Nota architetturale — Storage Resolver

- Runtime definitivo: **Postgres** via Storage Resolver / document API.
- Durante cutover: fallback **read-only** Blob per path legacy non ancora migrati.
- Nessuna nuova write applicativa verso Blob.
- Riferimento: `docs/adr/0006-storage-per-tenant.md`, `docs/design/lean-event-storage-architecture-correction-plan.md`.

### 4.5 Inngest — **obbligatorio**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Mandato: job durevoli con retry, step, idempotenza, osservabilità, replay — senza coda artigianale temporanea |
| **Alternative** | Temporal Cloud, Trigger.dev, AWS Step Functions, coda custom — **escluse** dal freeze attuale |
| **Costo stimato** | **Hobby** $0 (quota esecuzioni/mese, concurrency bassa; oltre quota i job **pausano**). **Pro** tipicamente da ~**$75–99/mese** (verificare inngest.com/pricing) con esecuzioni incluse + overage |
| **Limiti free** | Ordine di grandezza ~**50k executions/mese**, concurrency molto limitata (~5 step concorrenti) — ok per pilota; stretto con molti tenant + backup/migrate notturni |
| **Scalabilità** | Buona su Pro; tenant scope e concurrency limits da configurare per evitare noisy neighbor |
| **Dipendenze** | App deployata su Vercel (endpoint `/api/v1/platform/inngest`); Control Plane per metadati job (non per esecuzione) |

### 4.6 OpenAI API — **obbligatorio** (primo provider AI)

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Unico provider iniziale dietro AI Gateway (trascrizione + strutturazione verbali / support assistant) |
| **Alternative future** | Azure OpenAI, Anthropic, Google, Ollama — via nuovi adapter Gateway **senza** cambiare Core |
| **Costo stimato** | A consumo. Trascrizione tipica 2026: `whisper-1` / gpt-4o-transcribe ~**$0.006/min**; gpt-4o-mini-transcribe ~**$0.003/min**; più token chat per strutturazione verbali (`gpt-4o-mini` ordini di grandezza **$0.15 / 1M input**). Pilota pochi verbali/mese: spesso **pochi $/€**; agenzia attiva: budget da monitorare |
| **Limiti** | Rate limit per tier account; file size audio (già gestito a chunk nell’app) |
| **Scalabilità** | Bottleneck costo e rate limit, non storage. Job Inngest evita timeout HTTP |
| **Dipendenze** | AI Gateway; opzionalmente Inngest per elaborazioni lunghe |

### 4.7 DNS / Dominio — **obbligatorio in produzione**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | URL commerciale `events.leanme.it` |
| **Alternative** | Qualsiasi DNS (Cloudflare, registrar) |
| **Costo** | Dominio già tipicamente in carico LeanMe; CNAME gratuito |
| **Dipendenze** | Progetto Vercel |

### 4.8 Neon API — **opzionale** (automazione)

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Creare DB tenant da script `tenant-provision` senza click manuali |
| **Senza API** | Provisioning manuale da console Neon + inserimento env ref — **accettabile** per pochi tenant iniziali |
| **Costo** | Incluso nell’account Neon |
| **Dipendenze** | Neon |

### 4.9 Vercel API — **opzionale** (automazione)

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Creare Blob store + token per tenant in automatico |
| **Senza API** | Creazione manuale store da dashboard — ok per pochi tenant |
| **Costo** | Incluso |
| **Dipendenze** | Vercel |

### 4.10 Observability (Sentry / log drain) — **opzionale v1.0, raccomandato prod**

| Voce | Dettaglio |
|------|-----------|
| **Motivazione** | Mandato observability: error tracking, alert |
| **Alternative** | Solo Vercel Logs (minimo); Axiom/Datadog per retention lunga |
| **Costo** | Sentry free tier limitato; piani team a consumo |
| **Nota** | Non blocca il freeze DB/Blob; può attivarsi in parallelo al go-live |

### 4.11 Email / SMS / Pagamenti — **opzionali (feature business)**

Non richiesti per congelare l’architettura Core/AI/job/storage.  
Quando arriveranno, entreranno come adapter dietro contratti Communications / Registration — **senza** cambiare Control Plane o resolvers.

---

## 5. Scenario di costo consigliato (ordini di grandezza)

> Prezzi indicativi al 2026-07; **verificare sempre** le pagine ufficiali prima dell’acquisto. Non sono quotazioni contrattuali.

### 5.1 Pilota commerciale piccolo (2–5 tenant, traffico moderato)

| Voce | Piano suggerito | Stima mensile |
|------|-----------------|---------------|
| Vercel | Pro (1 seat) | ~$20 + usage basso |
| Neon | Launch | ~$15–80 (dipende always-on vs scale-to-zero e GB) |
| Blob | incluso/usage Pro | spesso &lt; $10 se pochi GB |
| Inngest | Hobby → Pro se serve | $0 oppure ~$75–99 |
| OpenAI | pay-as-you-go | ~$5–50 tipico pilota |
| **Totale orientativo** | | **~$50–250/mese** |

### 5.2 Produzione multi-agenzia (decine di tenant)

| Voce | Piano suggerito | Note |
|------|-----------------|------|
| Vercel | Pro / Enterprise | usage functions + transfer |
| Neon | Launch o Scale | N database; valutare scale-to-zero tenant idle |
| Blob | Pro + N store | storage cresce con CV/PDF/audio |
| Inngest | Pro | backup/migrate/export notturni |
| OpenAI | usage + limiti | budget per tenant/pack AI |
| Observability | Sentry/Axiom | raccomandato |

### 5.3 Cosa **non** usare in produzione commerciale

| Combinazione | Perché no |
|--------------|-----------|
| Vercel Hobby + Neon Free + Inngest Hobby “per sempre” | Hard cap, sospensioni, cold start aggressivi, history corta, isolamento commerciale fragile |
| Un solo Blob store con prefissi | Vietato dal mandato come isolamento principale |
| DB Postgres condiviso multi-tenant | Vietato dal mandato |

---

## 6. Impatto sulla scalabilità (sintesi)

| Dimensione | Effetto dello stack scelto |
|------------|----------------------------|
| **Tenant isolation** | Forte (DB + Blob dedicati) — valore commerciale / exit cliente |
| **Costo marginale per nuovo tenant** | Medio-alto (nuovo DB + store + secret) — accettato consapevolmente |
| **Traffico web** | Scala con Vercel |
| **Job lunghi** | Scala con Inngest (non con timeout HTTP) |
| **AI** | Scala a costo variabile OpenAI; Gateway permette cambio provider |
| **Ops** | Cresce con N tenant → automazione Neon/Vercel API diventa importante dopo i primi clienti |

---

## 7. Matrice “minimo per procedere” vs “completo mandato”

### 7.1 Minimo per continuare l’implementazione cutover (dopo approvazione piano)

Devi poter fornire:

1. Account/org **Neon** su piano idoneo (Launch+ raccomandato)  
2. Connection string **Control Plane** (DB vuoto)  
3. Connection string **per ogni tenant esistente** (DB dedicati vuoti o da migrare)  
4. **Blob store + token** per ogni tenant esistente  
5. App **Inngest** + `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`  
6. `OPENAI_API_KEY` (già tipicamente presente)  
7. `LEAN_EVENT_SESSION_SECRET` (già tipicamente presente)  
8. Progetto **Vercel** Pro collegato al repo (per prod)

### 7.2 Opzionale ma utile subito

- `NEON_API_KEY` + `NEON_PROJECT_ID`  
- `VERCEL_TOKEN` (+ team id)  
- Dominio già puntato  
- Sentry DSN  

---

## 8. Decisioni da approvare esplicitamente

Confermare o emendare:

| # | Decisione proposta | Default del piano |
|---|--------------------|-------------------|
| D1 | Hosting = **Vercel Pro** in produzione | Sì |
| D2 | Database = **Neon**, 1 project, N database (Control Plane + tenant) | Sì |
| D3 | Storage documentale = **Neon Postgres** (chunks); Blob solo legacy cutover | Sì (emendato 2026-07-22) |
| D4 | Jobs = **Inngest** (Hobby solo pilota; Pro per produzione reale) | Sì |
| D5 | AI = **OpenAI** come primo provider Gateway | Sì |
| D6 | Neon/Vercel **API** per auto-provisioning | Opzionale fase 1; manuale accettato per ≤5 tenant |
| D7 | Observability dedicata (Sentry) | Opzionale al freeze; raccomandata al go-live |
| D8 | Non introdurre ora S3/R2/Temporal/Supabase | Sì — fuori scope freeze |

---

## 9. Rischi infrastrutturali e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Costo Neon con molti DB always-on | Scale-to-zero tenant idle; monitor CU-hour; piano Launch/Scale |
| Crescita BYTEA su Neon | Monitor storage GB; chunk size 512 KiB; retention/purge policy |
| Inngest Hobby esaurisce quota | Upgrade Pro prima di cron massivi backup/migrate |
| Dipendenza OpenAI | AI Gateway + Assistant Registry già progettati per multi-provider |
| Cold start Neon su Free/Launch | Non usare Free in prod; disabilitare scale-to-zero sui tenant business-critical |
| Residui Blob legacy | Inventario + ledger + hash + approvazione umana prima della dismissione |

---

## 10. Checklist di approvazione

Prima di creare credenziali, firmare mentalmente / rispondere:

- [ ] Approvo lo stack della §3 (obbligatori)  
- [ ] Approvo i default D1–D8 della §8  
- [ ] Accetto che Neon Free / Vercel Hobby **non** siano il target commerciale  
- [ ] Accetto il costo marginale per-tenant (DB dedicati + storage documentale in Postgres)  
- [ ] Capisco che Blob non è SoT e va dismesso solo dopo gate firmato  
- [ ] Capisco cosa è opzionale (API automazione, Sentry, email/SMS)  

**Risposta attesa:**  
`Architecture Deployment Plan approvato`  
oppure elenco emendamenti puntuali.

Solo dopo l’approvazione si procederà a creare account/DB/chiavi secondo `docs/operations/credentials-required.md`.

---

## 11. Cosa non è in questo piano

- Provisioning concreto (nessun DB/store creato da questo documento)  
- Modifiche al codice applicativo  
- Scelta prezzi listino Lean.Event verso i clienti finali  
- Contratti legali / DPA / GDPR con i vendor (da gestire lato LeanMe)

---

*Fine Architecture Deployment Plan — in attesa di approvazione.*
