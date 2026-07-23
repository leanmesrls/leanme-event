# Lean Event / Leonardo — Riepilogo tecnico per consulenza

**Data:** 2026-07-22  
**Repo:** `leanmesrls/leanme-event`  
**Ambiente:** Dev `http://localhost:3012` · Prod target `https://events.leanme.it`  
**Separato da:** `leanme-site` (`demo.leanme.it`, porta 3011)  
**Fonte di verità:** documentazione in `docs/` (non inventare stack/moduli oltre a quanto qui elencato)

---

## 1. Cos’è (in una frase)

Piattaforma **multi-tenant** per agenzie eventi / feder congressi: gestionale **Leonardo** + moduli AI (Lean.Agent) + persistenza enterprise (Neon + Blob), vendibile a **pack modulari**, con vincolo **zero perdita dati**.

---

## 2. Stack di programmazione

| Layer | Tecnologia | Note |
|-------|------------|------|
| Framework | **Next.js 15** (App Router, Turbopack in dev) | Deploy Vercel |
| UI | **React 19**, **TypeScript**, **Tailwind CSS 4** | Framer Motion nel design system LeanMe |
| Auth sessione | Cookie HTTP-only + **jose** (JWT/signed token) | Password con **bcryptjs** |
| DB | **Neon Postgres** (`@neondatabase/serverless`) | Source of truth dati strutturati |
| File binari | **Vercel Blob** (`@vercel/blob`) | PDF, audio/video, export ZIP |
| AI | **OpenAI API** | Leonardo (verbali); altri agenti in roadmap |
| Media client | **ffmpeg.wasm** | Processing audio/video browser-side |
| Import | **xlsx** | Template Excel + API import |
| Repo / CI | **GitHub** → **Vercel** | Deploy automatico, production-ready |

**Linguaggio e stile:** TypeScript end-to-end; contenuto testuale preferibilmente in JSON/MD (`data/`, `docs/`); componenti riusabili in `components/`.

---

## 3. Struttura repository (schematica)

```
leanme-event/
├── app/                    # Route Next.js (pagine + API)
│   ├── lean-event/         # Login + area tenant Leonardo
│   ├── leanyou/            # Alias / percorsi correlati area privata
│   └── api/lean-event/     # API REST dominio
├── components/             # UI (shell Leonardo, moduli, import, …)
├── lib/lean-event/         # Domain logic, auth, lifecycle, Neon, Blob
│   └── normalized/         # Mapper row ↔ domain (SoT tipizzato)
├── types/lean-event.ts     # Contratto TypeScript dominio
├── data/lean-event/        # Config, taxonomy, prompt AI, map agenti
├── docs/                   # Architettura, ops, SQL, patto commerciale
│   └── sql/                # DDL Neon (001…007+)
├── scripts/                # Access tenant, migrate Neon, sync Vercel
└── .lean-event-data/       # Locale only (gitignored): tenant, audit FS
```

### URL principali

| Cosa | Path |
|------|------|
| Login unico | `/lean-event/login` (+ token query) |
| Hub Leonardo | `/lean-event/{tenantSlug}/leonardo` |
| Area evento | scheda evento → tab (hotel, logistica, budget, …) |
| SEO | `robots.txt` esclude `/lean-event` |

---

## 4. Architettura prodotto

```
Lean Event (multi-tenant)
└── Leonardo (hub gestionale)
    ├── Menu GLOBALE agenzia
    │   Cruscotto · Eventi · Contatti · Verbali AI · Finance · Lean.Human · Government
    └── Scheda SINGOLO EVENTO (operatività)
        Hotel · Logistica · Budget · Comunicazioni · Ospiti · ECM · Stampati · …
        └── (pack) Sito pubblico evento + area partecipante
```

**Regola chiave:** Hotel / Logistica / Budget / Comunicazioni **non** sono voci menu esterne — vivono **dentro** la scheda evento.  
**Finance** (menu globale) = vista aggregata dei budget eventi, non un secondo DB.

### Lean.Agent (mappa capability → agente)

| Funzione | Agente |
|----------|--------|
| Verbali AI | **Leonardo** |
| Writing / comunicazioni | **Marconi** |
| Grafiche / stampati | **Vespucci** |
| Survey / Connect / suggestions | **Galileo** |
| Sito / API | **Olivetti** |
| ECM / attestati | **Angela** |
| Supporto umano LMI | **Teresa** |

Config: `data/lean-event/ai-agent-map.json`.

### Pack commerciali (modularità vendita)

| Pack | Idea | AI |
|------|------|----|
| CORE | Gestionale base | No |
| PRO | Operativo completo | No |
| AI | Assistente + automazioni | Sì |
| PLATINUM | Ecosistema + website/API | Sì+ |

Add-on separati: **Care**, **Studio**, **Marketplace**.  
UI: moduli non acquistati = **locked** + CTA verso LeanMe.

Dettaglio: `docs/leanyou-event-platform-packs.md`, `docs/leanyou-event-architecture.md`.

---

## 5. Database e persistenza

### Principio SoT (2026-07-21 / cutover N4)

| Cosa | Dove |
|------|------|
| Dati strutturati (contatti, eventi, assignment, workspace metadati, …) | **Neon** — tabelle tipizzate + FK |
| Output AI schemaless | `workspaces.structured` (**unica** eccezione JSONB) |
| File grandi (PDF, audio, ZIP) | **Vercel Blob** + registry `lean_event_documents` |
| Tenant / credenziali (prod) | Env `LEAN_EVENT_TENANTS_JSON` |
| Legacy `lean_event_entities` | Archivio — **non** più SoT (`LEGACY_ENTITY_MIRROR=0`) |

### Multi-tenant

- Isolamento rigoroso per `tenant_id`
- PK tipica: `(tenant_id, id)`
- FK tipica: `(tenant_id, event_id) → lean_event_events`

### Domini tipizzati (esempi)

| Dominio | Tabelle |
|---------|---------|
| Sedi | `lean_event_venues` |
| Contatti | `lean_event_contacts` + emails/phones/tags/privacy |
| Fornitori | `lean_event_suppliers` + agreements |
| Eventi | `lean_event_events` (+ sezioni correlate) |
| Ospiti | `lean_event_assignments` (FK event+contact) |
| Verbali | `lean_event_workspaces` |
| Chat | `lean_event_event_chat_*`, `lean_event_teresa_chat_*` |
| Documenti / versioni / audit | `lean_event_documents`, `*_entity_versions`, `*_audit_events` |

DDL: `docs/sql/006_lean_event_normalized.sql` (+ 001…007).  
Cutover: `docs/lean-event-normalized-cutover.md`.

### Lifecycle dati (obbligatorio)

Su ogni entità gestita:

- `revision` (optimistic locking)
- soft delete → **cestino 30 giorni** → purge cron
- snapshot versioni (retention: ultimi **50** OR ultimi **90 giorni**)
- audit append-only su Neon per mutazioni rilevanti

**Vietato:** hard-delete silenzioso; bypass lifecycle “per velocità”.

---

## 6. Scalabilità (livello attuale e target)

| Dimensione | Approccio |
|------------|-----------|
| Tenant | Multi-tenant nativo; onboarding con import Excel |
| Utenti concorrenti | Optimistic locking + dialog conflitto + polling revision |
| Volume anagrafiche | Import massivo (contatti, sedi, fornitori, eventi); target migliaia di righe |
| Documenti (CV, ECM, attestati) | Metadati Neon + binari Blob; liste paginate; mai array JSON a scala |
| Query / filtri | Indici B-tree + catalogo filtri L1/L2 (`docs/lean-event-filter-index-catalog.md`) |
| Backup | Neon PITR + cron backup Blob giornaliero + export tenant settimanale |
| Job lunghi | Roadmap: coda async (es. Inngest) per import enormi / verbali lunghi |

**Scala commerciale attesa:** agenzie internazionali / feder congressi — molti tenant, multi-utente, storico + presenti/futuri, upload massivi.

**Onesto su enterprise-ready:** nucleo integrità Fase A–C chiuso a codice + smoke firmato; restano (tra gli altri) import async oltre soglia HTTP, drill recovery ops, presenza/merge campi (Fase D opzionale).

---

## 7. Sicurezza e compliance (schema)

| Area | Implementazione / policy |
|------|--------------------------|
| Autenticazione | Email+password (hash bcrypt) · token URL per accesso diretto |
| Sessione | Cookie firmato (`jose`); set su `NextResponse` in route handlers |
| Isolamento | Scope obbligatorio `tenantId`; nessun cross-tenant |
| Autorizzazione documenti | Tenant + ruolo (segreteria / faculty / partecipante) |
| Blob sensibili | Upload **private** + download autenticato (stream) |
| Soft delete | Recupero 30g; purge solo dopo retention |
| Audit | Neon append-only + (locale) JSONL; log Vercel con prefisso audit |
| Area privata SEO | Esclusa da indicizzazione (`robots.txt`) |
| Secret | `LEAN_EVENT_SESSION_SECRET`, `OPENAI_API_KEY`, Blob token — solo env |
| GDPR / privacy | Consensi su contatti; documenti travel con retention da valutare; export tenant |

**Patto commerciale (2026-07-16):** vendibile a moduli, **zero perdita** — `docs/lean-event-commercial-pact.md`.

---

## 8. Stato implementazione (sintesi)

| Area | Stato |
|------|--------|
| Auth multi-tenant + Leonardo verbali | ✅ Live |
| Rubriche (contatti, sedi, fornitori) + import Excel | ✅ |
| Eventi + assignment + lifecycle | ✅ |
| Neon SoT tipizzato (N2–N4) | ✅ |
| Document registry + API + UI documenti | ✅ (API+UI base) |
| Backup / export / audit Neon | ✅ codice + cron |
| Pack UI locked / sito pubblico evento | 📋 Architettura + pack doc; moduli progressivi |
| Pagamenti (PayPal/Stripe), Connect palco, ECM full | 📋 Roadmap |
| Coda job async (Inngest) | 📋 Post-v1 |
| Presenza realtime / merge campi | ⬜ Fase D opzionale |

---

## 9. Integrazioni e punti di innesto per nuovi sviluppi

La piattaforma è pensata per **estendere senza riscrivere il nucleo**.

| Tipo integrazione | Hook naturale |
|-------------------|---------------|
| Nuovo modulo UI | Voce menu / tab evento + capability `tenant.leonardoCapabilities` / `modules[]` |
| Nuova entità dominio | Tabella tipizzata `(tenant_id, id)` + lifecycle + mapper `normalized/` + API |
| Nuovo tipo documento | `kind` su `lean_event_documents` + policy retention |
| Nuovo agente AI | Entry in `ai-agent-map.json` + prompt in `data/lean-event/prompts.json` + route API |
| Sito pubblico evento | Config su evento (`publicSiteConfig`, registration, participant portal) — pack Platinum |
| Pagamenti | Registrazione a pagamento: PayPal v1 → Stripe futuro (architettura eventi) |
| Comunicazioni | Email/SMS/WhatsApp per evento (pack PRO/AI) — provider da collegare |
| Orchestrazione | Roadmap Lean.OS / **n8n** (fase ecosistema LeanMe) |
| Observability | Log Drain Vercel → Datadog/Axiom (previsto per audit lungo termine) |
| Export compliance | ZIP tenant settimanale + export on-demand |

**Contratto safe-change schema:** aggiungere campi opzionali; rename con shim; mai hard wipe Blob/Neon — `docs/leanyou-data-resilience.md` §14.

---

## 10. Deploy e operazioni

| Voce | Dettaglio |
|------|-----------|
| Hosting | Vercel progetto dedicato `leanme-event` |
| Blob | Store **dedicato** (non condividere con leanme-site) |
| Env critiche | `LEAN_EVENT_TENANTS_JSON`, `LEAN_EVENT_SESSION_SECRET`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `BLOB_READ_WRITE_TOKEN`, flag Neon normalized |
| Sync tenant | `npm run lean-event:access` / `lean-event:sync-vercel` |
| Migrazioni DB | `lean-event:apply-neon-00x`, `migrate-normalized`, `verify-normalized` |
| Ops SQL | `docs/lean-event-ops-cheatsheet.md` |

---

## 11. Principi non negoziabili (per il collega)

1. **SoT = Neon tipizzato**; Blob solo binari grandi.  
2. **Zero perdita:** soft delete, versioni, backup, audit.  
3. **Multi-tenant isolation** sempre.  
4. **Vendita modulare** — moduli locked, nucleo affidabile.  
5. **Import onboarding** a migliaia di righe (preview → apply → audit).  
6. Documentazione in `docs/` = contratto; se conflitto con una richiesta, chiarire prima di cambiare architettura.

---

## 12. Documenti di approfondimento (indice)

| Tema | File |
|------|------|
| Area riservata / setup | `docs/lean-event.md` |
| Architettura menu/eventi | `docs/leanyou-event-architecture.md` |
| Pack commerciali | `docs/leanyou-event-platform-packs.md` |
| Resilienza / concorrenza | `docs/leanyou-data-resilience.md` |
| Cutover DB normalizzato | `docs/lean-event-normalized-cutover.md` |
| Documenti a scala | `docs/lean-event-document-architecture.md` |
| Integrità & lacune | `docs/lean-event-integrity-status.md` |
| Patto commerciale | `docs/lean-event-commercial-pact.md` |
| Deploy | `docs/deploy-leanme-event.md` |
| Ops + query Neon | `docs/lean-event-ops-cheatsheet.md` |
| Leonardo verbali (scheda) | `docs/leanyou-leonardo-scheda-tecnica.md` |

---

*Documento generato per consulenza interna. Allineato allo stato repo al 2026-07-22 (incluso cutover normalizzato N4).*
