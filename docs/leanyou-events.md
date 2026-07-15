# LeanYou · Modulo Eventi — Specifica e piano di produzione

**Versione documento:** 2026-07-10 (rev. 4)  
**Stato:** Pianificazione (pre-sviluppo)  
**Tenant pilota:** I&C srl — slug **`iec`**  
**Prodotto:** **Leonardo** — piattaforma gestionale eventi + strumenti di segreteria (non solo verbali)  
**Hub:** **`/leanyou/iec/leonardo`** — cruscotto con sidebar strumenti  
**Prerequisito:** Secretary Assistant · Verbali v1 — `docs/leanyou-leonardo-scheda-tecnica.md`  
**Pack commerciali (CORE / PRO / AI / PLATINUM + add-on):** `docs/leanyou-event-platform-packs.md`

---

## 0. Leonardo = piattaforma gestionale (decisione 2026-07-10)

### Visione

**Leonardo** è il nome dell’**intera piattaforma operativa** dentro LeanYou per un tenant (es. I&C), non solo lo strumento di generazione verbali.

| Prima (v1) | Da ora (roadmap) |
|------------|------------------|
| Leonardo = Secretary Assistant / verbali | Leonardo = **cruscotto gestionale** |
| Un solo menu in sidebar | Sidebar con **tutti gli strumenti** eventi + segreteria |
| `/leonardo` = lista workspace verbali | `/leonardo` = **hub**; verbali in sottomenu dedicato |

LeanYou resta il contenitore multi-tenant (`/leanyou/{azienda}/…`).  
Per I&C: **`/leanyou/iec/leonardo`** apre il cruscotto Leonardo.

### Sidebar — menu agenzia (rev. 5 — vocale 2026-07-10)

**Architettura completa:** `docs/leanyou-event-architecture.md`

| Voce menu | Ruolo | URL |
|-----------|-------|-----|
| **Cruscotto** | Home / KPI / scorciatoie | `/leanyou/iec/leonardo` |
| **Eventi** | Lista eventi → scheda con tab interne | `/leanyou/iec/leonardo/eventi` |
| **Rubrica contatti** | Anagrafica globale tenant | `/leanyou/iec/leonardo/contatti` |
| **Verbali AI** | Secretary Assistant (anche senza evento) | `/leanyou/iec/leonardo/verbali` |
| **Finance** | Report budget **aggregato** tutti gli eventi | `/leanyou/iec/leonardo/finance` |
| **Lean.Human** | Supporto umano LMI (Teresa) | `/leanyou/iec/leonardo/lean-human` |
| **Government** | Società scientifiche (servizio separato) | `/leanyou/iec/leonardo/government` |

**Dentro ogni evento** (non in sidebar): Hotel, Logistica, Budget, Comunicazioni, Ospiti, Docenti, Delegazioni, Registrazione, Abstract, Survey, Connect, Stampati, Verbali collegati, ECM, sito pubblico.

**Workspace verbali** rinominato **Verbali AI** in menu; resta autonomo dagli eventi.

### Collegamento opzionale Verbali ↔ Evento

**Sì — ha senso.** Modello consigliato:

```
LeonardoWorkspace (verbale)
  └── linkedEventId?: string | null   ← opzionale

Event (evento)
  └── (nessun array obbligatorio; relazione derivata)
```

| Contesto | Comportamento |
|----------|---------------|
| Verbale **senza** evento | Resta solo in **Workspace verbali** (comportamento attuale) |
| Verbale **con** evento collegato | Visibile in Workspace verbali **e** nella scheda evento |
| Scheda evento → tab **Verbali** | Elenco workspace dove `linkedEventId === event.id` + CTA «Nuovo verbale per questo evento» |

**Creazione verbale da evento:** precompila metadati (titolo, data, clienti/partecipanti se disponibili) e imposta `linkedEventId`.

**Creazione verbale standalone:** `linkedEventId` null; in scheda workspace, campo opzionale «Collega a evento» (search/select).

**Scollegamento:** imposta `linkedEventId` a null — il verbale resta in Workspace verbali, sparisce dal tab evento.

Non duplicare i dati del verbale dentro l’evento: l’evento **referenzia** i workspace; il JSON del workspace resta la source of truth (come oggi su Blob).

### Struttura URL (revisione)

| Voce sidebar | Percorso |
|--------------|----------|
| Cruscotto Leonardo | `/leanyou/iec/leonardo` |
| **Workspace verbali** | `/leanyou/iec/leonardo/verbali` |
| | `/leanyou/iec/leonardo/verbali/new` |
| | `/leanyou/iec/leonardo/verbali/[id]` |
| **Eventi** | `/leanyou/iec/leonardo/eventi` |
| | `/leanyou/iec/leonardo/eventi/[id]` → tab **Verbali** incluso |
| **Rubrica contatti** | `/leanyou/iec/leonardo/contatti` |

**Redirect legacy:**

- `/leanyou/iec/leonardo/new` → `/leanyou/iec/leonardo/verbali/new`
- `/leanyou/iec/leonardo/[uuid]` → `/leanyou/iec/leonardo/verbali/[uuid]`

### Sidebar `LeanYouShell`

Popolare la colonna sinistra da `data/leanyou/config.json` → `navigation[]` con capability e voci locked (CTA `info@leanme.it`).

---

## 1. Obiettivo

Gestionale eventi dentro LeanYou per logistica, anagrafiche, comunicazioni (inclusi clienti e patrocinanti), archivio documentale/mail per **certificazione di qualità**, e servizi aggiuntivi. Eventi **base** ed **ECM** (modulistica CM attivabile solo se il tenant ha il capability pack).

---

## 2. Decisioni di prodotto

### 2.1 CDC (Centro di costo)

| Aspetto | v1 | Futuro |
|---------|-----|--------|
| Formato | **Testo libero** inserito dal referente evento | Collegamento modulo Amministrazione |
| Validazione | Configurabile; nessun catalogo | Sync centri di costo aziendali |

### 2.2 Date evento

- **Giorno singolo:** `startDate` = `endDate`
- **Range:** `startDate` … `endDate` (dal / al)
- UI: date europee (gg/mm/aaaa) + shortcut «evento di un giorno»

### 2.3 Contatti e eventi — inserimento dati

| Modalità | Descrizione |
|----------|-------------|
| **Manuale** | Scheda singola |
| **Import Excel** | Template `.xlsx` scaricabile → upload → anteprima → conferma |
| **Copia-incolla** | Incolla da foglio → **wizard mapping colonne** → anteprima → conferma |

### 2.4 Tenant pilota

- **Confermato:** `iec` (I&C srl)
- Pattern URL: `/leanyou/{slug}/{modulo}` — es. `/leanyou/iec/events`

### 2.5 Attivazione moduli — due livelli

> **Proposta pack commerciali** (CORE → PLATINUM, Care, Studio, Marketplace): vedi **`docs/leanyou-event-platform-packs.md`**.

Ogni funzione deve essere **attivabile o disattivabile** al momento dell'onboarding di un'azienda. Configurazione definita caso per caso («attiva tutto», «solo eventi», «solo segreteria», ecc.).

#### Livello A — Moduli LeanYou (tenant)

| Modulo ID | Descrizione | URL segment |
|-----------|-------------|-------------|
| `leonardo` | Segretario / verbali da riunioni | `/leonardo` |
| `events` | Gestionale eventi | `/events` |
| *(futuri)* | Academy, Dashboard, altri tool | TBD |

Esempio onboarding: *«Attiva solo gestione eventi»* → `modules: ["events"]`.  
*«Attiva segretaria + eventi + ECM»* → moduli + capability sotto.

#### Livello B — Capability pack eventi (tenant)

Definite per ogni tenant con modulo `events`:

| Capability | Descrizione |
|------------|-------------|
| `events_anagrafica` | Scheda evento, rubrica, ruoli, import |
| `events_ecm` | Modulistica CM, attestati, passaggi formativi |
| `events_logistica` | Hotel, viaggi, transfer, allotment |
| `events_budget` | Preventivo, fatture, bilancino |
| `events_comunicazioni` | Brevo, invii, comunicazioni clienti/patrocinanti |
| `events_stampati` | Area grafica/stampati + archivio versioni |
| `events_archivio_mail` | Archivio mail per sezione (certificazione qualità) |
| `events_form_registrazione` | Form registrazione → popola partecipanti *(futuro)* |
| `events_form_ospitalita` | Form ospitalità → popola schede partecipanti *(futuro)* |
| `events_generazione_stampati` | Generazione automatica PDF/grafiche *(futuro)* |

#### Livello C — Capability per singolo evento (override opzionale)

Stesse capability del livello B, applicabili **per evento** quando serve granularità (es. evento base senza ECM, evento congresso con tutto).

```json
{
  "id": "iec",
  "slug": "iec",
  "modules": ["leonardo", "events"],
  "eventCapabilities": {
    "anagrafica": true,
    "ecm": true,
    "logistica": true,
    "budget": true,
    "comunicazioni": true,
    "stampati": true,
    "archivio_mail": true
  }
}
```

**UI capability disattiva:**

- Tab/sezione **visibile** con stato **locked**
- Messaggio: *«Funzione non inclusa nel tuo abbonamento. Contatta LMI per l'upgrade.»*
- **CTA:** `mailto:info@leanme.it?subject=LeanYou%20-%20Richiesta%20upgrade%20modulo`

Helper previsti: `tenantHasModule()`, `tenantHasEventCapability()`, `eventHasCapability()`.

---

## 3. Sezioni della scheda evento

Ogni evento è organizzato in **sezioni operative**. In **ciascuna sezione** (ove applicabile) devono coexistere:

- Dati e anagrafiche della sezione
- Documenti / allegati
- **Archivio mail** (requisito certificazione qualità)

### 3.1 Elenco sezioni

| Sezione | Contenuto principale | Capability |
|---------|----------------------|------------|
| **Anagrafica evento** | CDC, titolo, sede, date, tipo, note | `anagrafica` |
| **Partecipanti & delegazioni** | Ruoli partecipante/delegazione, gruppi | `anagrafica` |
| **Relatori / docenti** | Moderatori, relatori, RS, discussanti, consulenti | `anagrafica` |
| **Segreteria scientifica** | Organizzazione scientifica, referenti | `anagrafica` |
| **Sponsor** | Sponsor tecnici/economici, referenti | `anagrafica` + mail |
| **Patrocini** | Enti patrocinanti, livelli patrocinio | `anagrafica` + mail |
| **Clienti & patrocinanti — comunicazioni** | Thread/comunicazioni strutturate con clienti e patrocinanti | `comunicazioni` |
| **Fornitori** | Fornitori evento (hotel, catering, service, …) | `anagrafica` + mail |
| **Stampati & grafiche** | PDF, immagini, versioni | `stampati` |
| **Hotel & logistica** | Allotment, camere, transfer | `logistica` |
| **Budget** | Preventivo, fatture, consuntivo | `budget` |
| **ECM & modulistica** | Documenti CM, attestati, passaggi | `ecm` |
| **Sub-eventi** | Cene, programmi sociali | `logistica` / core |
| **Comunicazioni invio** | Campagne Brevo per segmenti | `comunicazioni` |
| **Verbali** | Workspace collegati (`linkedEventId`) + link a dettaglio verbale | `leonardo` / core |

### 3.2 Archivio mail per sezione (certificazione qualità)

**Requisito trasversale:** in ogni sezione dell'evento che gestisce relazioni esterne o processi auditabili, l'utente deve poter **archiviare le mail importanti** in modo tracciabile.

| Funzione | v1 | Note |
|----------|-----|------|
| Upload drag & drop | Sì | Trascinare file nella sezione |
| Formati | `.eml`, `.msg` (Outlook), `.pdf` (mail stampata), allegati | Parser `.msg` lato server |
| Rinomina | Sì | Titolo descrittivo obbligatorio (es. «Conferma patrocinio — Ente X — 12/03/2026») |
| Metadati | Data archivio, autore upload, sezione, evento, note | Audit log |
| Organizzazione | Per sezione evento (fornitori, patrocini, relatori, …) | Non duplicare fisicamente se stessa mail in due sezioni — preferire tag multi-sezione |
| Ricerca | Per titolo, data, sezione | Sprint 2+ |

**Storage:** `leanyou/events/{tenantId}/{eventId}/mail-archive/{sectionId}/{fileId}`

---

## 4. Stampati & grafiche — categorie fisse

Categorie **predefinite** (ripetitive tra eventi), con supporto **versioni superate** in archivio.

### 4.1 Categorie documento

| Categoria ID | Label | Uso |
|--------------|-------|-----|
| `programma` | Programma | Programma scientifico/evento |
| `set_date` | Set date | Date e orari |
| `banner` | Banner | Banner digitali/stampa |
| `locandine` | Locandine | Locandine promo |
| `badge` | Immagini badge | Grafica badge partecipanti |
| `attestati` | Attestati | Template attestati |
| `cartelli` | Cartelli | Segnaletica generica |
| `loghi` | Loghi | Loghi evento/partner |
| `transfer` | Cartelli transfer | Segnaletica transfer |
| `rollup` | Roll-up | Roll-up |
| `slide_relatori` | Slide relazioni | Presentazioni relatori |
| `slide_sede` | Slide / materiali sede | Materiali sede congressuale |
| `pdf_stampa` | PDF per stampa | File pronti stampa |
| `pdf_sede` | PDF sede congressuale | Layout sede |
| `versione_superata` | Versione superata | Archivio versioni obsolete |

### 4.2 Tipi file

PDF, PNG, JPG, SVG; opzionalmente AI/EPS. Ogni file: categoria, versione (numero o data), flag `isSuperseded`.

### 4.3 Roadmap stampati

| Fase | Funzione |
|------|----------|
| v1 | Upload manuale per categoria + versioni superate |
| v2 | **Generazione automatica** programma, set date, locandine, badge, ecc. da dati evento |
| v3 | Export pacchetto stampa per fornitore |

---

## 5. Comunicazioni clienti e patrocinanti

Modulo dedicato (capability `comunicazioni`) per gestire **tutta la corrispondenza strutturata** con:

- **Clienti** committenti dell'evento
- **Patrocinanti** (enti patrocinatori)

| Funzione | v1 | Futuro |
|----------|-----|--------|
| Registro comunicazioni | Note + mail archiviate + allegati | Sync Brevo / timeline |
| Invii massivi Brevo | Sprint 4 | Segmenti per ruolo/categoria |
| Archivio mail sezione Patrocini/Clienti | Sprint 1–2 | Collegato a §3.2 |
| Template email | Sprint 4 | Per tipo comunicazione |

---

## 6. Form pubblici (roadmap)

| Form | Output | Capability | Sprint |
|------|--------|------------|--------|
| **Registrazione partecipanti** | Popola `Contact` + `EventAssignment` (partecipante) | `events_form_registrazione` | 6 |
| **Ospitalità partecipanti** | Popola preferenze hotel/viaggio/allergie su scheda partecipante | `events_form_ospitalita` | 6 |

- URL pubblico tokenizzato per evento (no login LeanYou)
- Validazione + antispam
- Notifica referente evento su nuova iscrizione

---

## 7. Modello dominio

### 7.1 Entità

```
Contact              — rubrica globale tenant
Event                — scheda evento + capability override opzionale
EventAssignment      — contatto + ruolo + sezione
DelegationGroup      — gruppi delegazione
EventSectionArchive  — mail/documento archiviato (sectionId, title, files)
EventGraphic         — stampato categorizzato (category, version, superseded)
ImportJob            — audit import massivo
```

### 7.2 Event (campi core)

| Campo | Tipo | Note |
|-------|------|------|
| `cdc` | string | Testo libero |
| `title`, `venue` | string | |
| `startDate`, `endDate` | string | gg/mm/aaaa |
| `type` | `base` \| `ecm` | |
| `status` | `draft` \| `active` \| `completed` \| `archived` | |
| `capabilities` | object? | Override opzionale per singolo evento |

### 7.3 Ruoli (per sezione Persone / Relatori)

Invariato: categoria + sub-ruolo; stessa persona, ruoli diversi per evento.

---

## 8. Import massivo e merge contatti duplicati

Template Excel + wizard paste (§4 rev. 1).

### 8.1 Rilevamento duplicato

Chiave primaria di matching: **email** (normalizzata lowercase).  
All’import o all’inserimento manuale, se l’email esiste già in rubrica tenant → **non import silenzioso**: aprire **dialog di risoluzione conflitto**.

### 8.2 Dialog «Contatto già presente»

La piattaforma mostra **confronto campo per campo**:

| Colonna | Contenuto |
|---------|-----------|
| Campo | Nome campo (Nome, Cognome, Telefono, …) |
| Valore in scheda | Dato già salvato |
| Valore in import | Dato nuovo |
| Azione | Scelta per **questo campo** |

**Azioni per ogni campo** (radio / select):

| Azione | Comportamento |
|--------|---------------|
| **Mantieni precedente** | Ignora il valore importato per questo campo |
| **Sovrascrivi** | Sostituisce il valore in scheda |
| **Aggiungi come nuovo** | Conserva il precedente e aggiunge il nuovo (campi multi-valore) |

### 8.3 Campi multi-valore

Campi che supportano **più valori** (array):

- `phones[]` — es. secondo numero telefono
- `emails[]` — email secondarie (opzionale v2)
- `notes[]` o append a `notes` con timestamp

Esempio: telefono import diverso → «Aggiungi come nuovo» → scheda con Telefono 1 (vecchio) + Telefono 2 (nuovo).

### 8.4 Campi mono-valore

Nome, cognome, organizzazione, indirizzo → solo **Mantieni** o **Sovrascrivi**.

### 8.5 Import massivo con duplicati

In import Excel/paste con N righe:

1. Righe senza conflitto → import diretto
2. Righe con email duplicata → coda «Da risolvere» (lista)
3. Utente risolve uno a uno (o batch con stessa regola per tutti i campi — opzionale v2)

### 8.6 Audit

Ogni merge registrato: `contact_merge`, contactId, campi modificati, utente, timestamp.

---

## 9. Architettura tecnica

| Aspetto | Scelta |
|---------|--------|
| URL hub | `/leanyou/{tenant}/leonardo/*` |
| Eventi | `/leanyou/{tenant}/leonardo/eventi` |
| API | `/api/leanyou/events`, `/api/leanyou/contacts`, … (invariate) |
| Storage | Vercel Blob (JSON + binari mail/grafica) |
| Config | `data/leanyou/events-config.json` (sezioni, categorie stampati, ruoli) |
| Mail `.msg` | Parser server-side (es. `msgreader` o conversione EML) |

---

## 10. UI — tab scheda evento (revisione)

| Tab | Sezioni incluse | Sprint |
|-----|-----------------|--------|
| Anagrafica | CDC, date, sede, tipo | 1 |
| Persone | Partecipanti, delegazioni, relatori, staff | 1 |
| Segreteria & sponsor | Segreteria scientifica, sponsor, patrocini | 1–2 |
| Fornitori | Anagrafica fornitori + archivio mail | 2 |
| Clienti & patrocini | Comunicazioni + archivio mail | 2–4 |
| Stampati | Categorie fisse §4 + versioni superate | 1 |
| Hotel & logistica | Allotment, camere, transfer | 2 |
| Budget | Preventivo, fatture | 3 |
| Comunicazioni | Brevo, invii | 4 |
| ECM | Modulistica CM | 5 |
| **Verbali** | Workspace verbali collegati all'evento | 1–2 |
| Form & iscrizioni | Registrazione, ospitalità | 6 |

Tab locked → CTA `info@leanme.it`.

---

## 11. Piano di produzione

### Sprint 1 — Fondamenta

- **Leonardo hub** + sidebar multi-voce (Eventi, Contatti, Workspace verbali)
- Routing `/leonardo/verbali/*` + redirect legacy
- Campo opzionale **`linkedEventId`** su workspace verbali + tab **Verbali** in scheda evento
- Modulo `events` su tenant `iec` + capability config
- CRUD eventi + rubrica contatti + ruoli
- Tab **Stampati** (categorie fisse §4, upload + versione superata)
- **Archivio mail** base (upload + rinomina) su sezioni: Fornitori, Patrocini, Relatori, Sponsor, Segreteria, Stampati, Delegazioni
- Import Excel + paste/mapping (contatti + eventi)
- Menu locked + CTA upgrade
- Blob + audit

### Sprint 2 — Logistica hotel + sezioni fornitori/patrocini

- Allotment, camere, accompagnatore, report
- Sezioni Clienti & patrocinanti strutturate
- Parser `.msg` migliorato

### Sprint 3 — Budget

### Sprint 4 — Comunicazioni Brevo + clienti/patrocinanti

### Sprint 5 — ECM

### Sprint 6 — Form registrazione + ospitalità

### Sprint 7 — Generazione automatica stampati

---

## 12. Decisioni confermate (checklist)

| # | Domanda | Risposta |
|---|---------|----------|
| 1 | Tenant slug | **`iec`** |
| 2 | Multi-modulo | Due livelli tenant + capability per evento; configurazione ad ogni onboarding |
| 3 | CTA upgrade | **`mailto:info@leanme.it`** |
| 4 | Categorie stampati | **Fisse** (elenco §4) + versioni superate |
| 5 | Archivio mail | **Sì**, in ogni sezione rilevante — certificazione qualità |
| 6 | Duplicati import | **Dialog per campo:** mantieni / sovrascrivi / aggiungi come nuovo (multi-valore) |

---

## 13. Riferimenti

- `docs/leanyou.md`
- `docs/leanyou-leonardo-scheda-tecnica.md`
- `types/leanyou.ts`

---

*Documento vivo — rev. 4 del 2026-07-10.*
