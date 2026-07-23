# Lean.Event — Inventario infrastruttura esistente e piano di riuso

**Data verifica:** 2026-07-22  
**Metodo:** read-only (`scripts/inventory-existing-infra.mjs`) — nessun provisioning eseguito  
**Vincolo:** Architecture Deployment Plan approvato; nessuna duplicazione di progetti  
**Convenzione Neon:** **APPROVATA e congelata** (2026-07-22) — vedi §0

---

## 0. Convenzione Neon ufficiale (congelata)

| Regola | Decisione |
|--------|----------|
| Progetto Neon | Il **progetto Neon già esistente** di Lean.Event è l’unico progetto ufficiale. |
| `neondb` | Resta **esclusivamente** database **sorgente** per cutover/migrazione dei dati esistenti. Non è Control Plane. Non è SoT runtime a regime. |
| `lean_event_control_plane` | È l’**unico** database del Control Plane. |
| Nuovi tenant | Sempre DB dedicato `lean_event_t_<slug>` **nello stesso progetto Neon**. |
| Nuovi progetti Neon | **Vietati** senza decisione architetturale esplicita (eccezione Enterprise documentata). |
| Provisioning | 1) riusare risorse esistenti · 2) creare solo il mancante · 3) verificare ogni passo prima del successivo |

---

## 1. Cosa esiste già (riutilizzare)

| Risorsa | Stato rilevato | Decisione |
|---------|----------------|----------|
| **Progetto Neon** Lean.Event | Host `*.eu-west-2.aws.neon.tech`, pooler attivo | **RIUSARE** — non creare un nuovo progetto Neon |
| **Database `neondb`** | DB connesso da `LEAN_EVENT_DATABASE_URL`; **44** tabelle `lean_event_*`; dati operativi (`entities`, events, contacts, workspaces, …) | **RIUSARE come sorgente cutover / DB legacy condiviso temporaneo** — **non** come Control Plane |
| **Database `postgres`** | Presente (sistema) | Ignorare per il prodotto |
| **Vercel project** | `.vercel/project.json` collegato | **RIUSARE** |
| **`BLOB_READ_WRITE_TOKEN`** | SET — spesso = store demo | **Solo cutover/legacy read**. SoT documenti = Postgres (`008`). Per inventariare `leanme-event` serve `LEAN_EVENT_LEGACY_BLOB_TOKEN` dal dashboard |
| **`LEAN_EVENT_SESSION_SECRET`** | SET | **RIUSARE** |
| **`OPENAI_API_KEY`** | SET | **RIUSARE** |
| **`NEXT_PUBLIC_SITE_URL`** | SET | **RIUSARE** |
| **Tenant file** | `iec`, `demo` | Tenant logici esistenti — target dei DB dedicati |
| **GitHub repo** | leanme-event | **RIUSARE** |

---

## 2. Cosa manca / stato provisioning (2026-07-22 sera)

| Risorsa | Stato |
|---------|--------|
| DB Neon **`lean_event_control_plane`** | **CREATO** + schema applicato + seed `iec` |
| DB Neon **`lean_event_t_iec`** | **CREATO** + schema `001–007` + foundation; **vuoto** (nessun dato `iec` su `neondb`) |
| DB Neon **`lean_event_t_demo`** | **CREATO** + schema `001–007` + foundation + **ETL completato** (136 righe da `neondb`, verify conteggi OK) |
| Blob Store **`lean-event-iec`** | **CREATO** (`store_7bGNqoq2zpBTCU79`) + `LEAN_EVENT_TENANT_IEC_BLOB_TOKEN` |
| Blob Store **`lean-event-demo`** | **CREATO e COLLEGATO** al progetto `leanme-event` (`store_vHENpsMK4FzAgyE5`) + `LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN`. Nota: il primo tentativo (`store_2LUL0wn2h3AX1G9M`) era orfano (non collegato) ed è stato eliminato. |
| Blob Store legacy **`leanme-event`** | Esiste (`store_FYsZWRl3jhb4pwv1`, ~55 file) — **`BLOB_READ_WRITE_TOKEN` locale corrotto** (`[SENSITIVE]`); anche `vercel env pull/run` restituiscono il placeholder. Serve ripristino manuale dal dashboard Vercel |
| App **Inngest** + chiavi | **Chiavi SET** in `.env.local`; client `lean-event`; endpoint `/api/v1/platform/inngest` — sync Cloud/dashboard ancora da confermare |
| Control Plane schema | **APPLICATO** |
| Tenant Registry seed `iec` | **SEEDATO** |
| Tenant Registry seed `demo` | **IN ATTESA** del token Blob demo |
| ETL `demo` → `lean_event_t_demo` | **FATTO** (`npm run lean-event:etl-tenant -- demo`) |
| ETL `iec` | N/A — zero righe sorgente su `neondb` / filesystem locale |

**Non creare:** secondo progetto Neon, secondo progetto Vercel, secondo repo, nuove chiavi OpenAI/session se già valide.

---

## 3. Ruolo di `neondb` (importante)

```text
PROGETTO NEON lean-event (esistente)
├── neondb                          ← OGGI: SoT operativa shared (iec+demo)
│                                    DOMANI: sorgente ETL, poi decommission runtime
├── lean_event_control_plane        ← DA CREARE: solo registry/metadati
├── lean_event_t_iec                ← DA CREARE: dati operativi tenant iec
└── lean_event_t_demo               ← DA CREARE (fase successiva): tenant demo
```

- **Control Plane ≠ `neondb`**: assenza tabella `lean_event_tenants`; presenza massiva di tabelle dominio.
- Dopo cutover verificato, il runtime non userà più `neondb` come SoT (niente fallback shared).

---

## 4. Blob — riuso senza duplicare a caso

| Store | Uso |
|-------|-----|
| Store attuale (token già in `.env.local` come `BLOB_READ_WRITE_TOKEN`) | Sorgente migrazione documenti; eventuale assegnazione futura a un solo tenant **solo dopo** separazione dati |
| Nuovo store `lean-event-iec` | Target architetturale per tenant iniziale `iec` |

Non creare store “di riserva” inutili. `demo` avrà il proprio store quando si provvederà quel tenant.

---

## 5. Variabili `.env.local` — mappa riuso vs nuove

### Già presenti — mantenere

- `LEAN_EVENT_DATABASE_URL` → punta a `neondb` (legacy/cutover source) fino a fine migrazione  
- `BLOB_READ_WRITE_TOKEN` → store legacy/migrazione  
- `LEAN_EVENT_SESSION_SECRET`  
- `OPENAI_API_KEY`  
- `NEXT_PUBLIC_SITE_URL`

### Da aggiungere (solo quando create le risorse)

- `LEAN_EVENT_CONTROL_PLANE_DATABASE_URL` → DB `lean_event_control_plane`  
- `LEAN_EVENT_TENANT_IEC_DATABASE_URL` → DB `lean_event_t_iec`  
- `LEAN_EVENT_TENANT_IEC_BLOB_TOKEN` → store dedicato iec  
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`

---

## 6. Ordine operativo aggiornato (no duplicazioni)

1. **Fase 1** — Neon: `lean_event_control_plane` + env — **FATTO**  
2. **Fase 2** — Neon: `lean_event_t_iec` + env — **FATTO**  
3. **Fase 3** — Blob `lean-event-iec` + env — **FATTO**  
4. **Fase 4** — Inngest keys + route SDK v4 — **FATTO** (sync Cloud dashboard da confermare)  
5. **Fase 5** — Schema + seed `iec` + verify resolvers — **FATTO**  
6. **Fase 6** — Neon `lean_event_t_demo` + schema + ETL dati — **FATTO**  
7. **Fase 7 (manuale)** — Ripristinare `BLOB_READ_WRITE_TOKEN` legacy + token `LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN` dal dashboard Vercel Blob  
8. **Fase 8** — Seed registry `demo` + migrazione blob documenti + switch runtime resolver (no fallback `neondb`)

Script utili: `lean-event:etl-tenant`, `lean-event:compare-tenant-db`, `lean-event:verify-resolvers`, `lean-event:seed-control-plane-demo`.

---

## 7. Criterio “crea solo se necessario”

| Domanda | Risposta inventario |
|---------|---------------------|
| Serve un nuovo progetto Neon? | **No** |
| Serve un nuovo progetto Vercel? | **No** |
| `neondb` può essere Control Plane? | **No** (dati operativi) |
| Serve DB Control Plane nuovo? | **Sì** — mancante |
| Serve DB tenant iec nuovo? | **Sì** — mancante |
| Serve nuovo Blob per iec? | **Sì** — store attuale non è per-tenant |
| Serve nuova OpenAI key? | **No** |
| Serve Inngest? | **Sì** — assente |
