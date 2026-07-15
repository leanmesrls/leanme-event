# Lean.Event Platform — Architettura generale

**Versione documento:** 2026-07-10 (rev. 2)  
**Stato:** Architettura target (post-vocale Luana)  
**Fonti:** vocali 2026-07-10, `docs/leanyou-event-platform-packs.md`, `docs/leanyou-events.md`  
**Dati tipologia evento:** `data/leanyou/event-taxonomy.json`  
**Mapping agenti AI:** `data/leanyou/ai-agent-map.json`  
**Tenant pilota:** I&C srl — `iec`

---

## 1. Principio architetturale

```
LeanYou (multi-tenant)
└── Leonardo (hub gestionale)
    ├── Menu GLOBALE (agenzia)     → cruscotto, eventi, rubrica, verbali AI, finance, Lean.Human, Government
    └── Scheda SINGOLO EVENTO      → tutte le operazioni per quell'evento
        └── Sito pubblico evento   → landing, registrazione, area riservata partecipante (pack)
```

| Dove | Cosa |
|------|------|
| **Menu sidebar (agenzia)** | Navigazione tra moduli trasversali e liste |
| **Dentro ogni evento** | Hotel, logistica, budget, comunicazioni, ospiti, docenti, … |
| **Pack acquistato** | Decide quali voci sono **visibili**, **attive** o **locked** |
| **AI (pack AI+)** | Trasversale: per ogni sezione, prompt tipo «genera locandina», «scrivi mail relatori» |

> **Regola:** Hotel, Logistica, Budget e Comunicazioni **non** sono voci di menu esterne — vivono **solo** nella scheda evento.

---

## 2. Menu sidebar Leonardo (agenzia)

| # | Voce menu | ID | URL | Ruolo |
|---|-----------|-----|-----|-------|
| 1 | **Cruscotto** | `hub` | `/leanyou/{tenant}/leonardo` | KPI, scorciatoie, attività recenti |
| 2 | **Eventi** | `eventi` | `/leanyou/{tenant}/leonardo/eventi` | Lista + creazione eventi; ingresso alle schede |
| 3 | **Rubrica contatti** | `contatti` | `/leanyou/{tenant}/leonardo/contatti` | Anagrafica globale tenant (source of truth contatti) |
| 4 | **Verbali AI** | `verbali` | `/leanyou/{tenant}/leonardo/verbali` | Secretary Assistant — verbali da audio/video; **non** sempre legati a un evento |
| 5 | **Finance** | `finance` | `/leanyou/{tenant}/leonardo/finance` | **Report aggregato** di tutti i budget di tutti gli eventi — andamento economico agenzia |
| 6 | **Lean.Human** | `lean_human` | `/leanyou/{tenant}/leonardo/lean-human` | Supporto umano LMI — assistenza, integrazioni, intervento manuale (icona **Teresa**) |
| 7 | **Government** | `government` | `/leanyou/{tenant}/leonardo/government` | Gestione **società scientifiche** — servizio separato, locked di default |

**Redirect legacy:** `/leonardo/supporto` → `/leonardo/lean-human`

**Rimossi dal menu esterno** (spostati dentro evento):

- ~~Hotel & logistica~~ → tab **Hotel** + tab **Logistica** per evento
- ~~Budget~~ (per evento) → tab **Budget** per evento; il menu **Finance** è solo il consolidato
- ~~Comunicazioni~~ → tab **Comunicazioni** per evento

---

## 2b. Lean.Agent per funzioni AI

Ogni azione AI mostra l'**iconcina dell'agente** responsabile (`LeanAgentAiIcon`).

| Capability / funzione | Lean.Agent |
|-----------------------|------------|
| Verbali AI | **Leonardo** |
| AI Writing / Comunicazioni | **Marconi** |
| AI Graphics / Stampati | **Vespucci** |
| AI Suggestions / Survey / Connect | **Galileo** |
| Sito web / API | **Olivetti** |
| ECM / Attestati / Certificati | **Angela** |
| Lean.Human | **Teresa** |

Config: `data/leanyou/ai-agent-map.json` · Helper: `lib/leanyou/ai-agents.ts`

---

## 2c. Tipologia evento (anagrafica)

Campi in scheda evento (`LeonardoEvent`):

| Campo | Quando |
|-------|--------|
| `categoryId` | Sempre |
| `healthAreaId` | Solo **formazione sanitaria** |
| `ecmEnabled` | Solo formazione sanitaria — **Sì/No** obbligatorio |
| `ecmModality` | Se `ecmEnabled === true` |

### Categorie

**EVENTO DI FORMAZIONE SANITARIA** + area (con codice):

| Area | Codice |
|------|--------|
| Infettivologica, Immunologica e Terapia Intensiva | 100 |
| Metabolica ed Endocrinologica | 48 |
| Cardiologica, Cardiovascolare e Respiratoria | 36 |
| Oncologica e Ematologica | 28 |
| Ginecologica, Urologica e Nefrologica | 24 |
| Gastroenterologica | 14 |
| Prevenzione e Salute Pubblica | 11 |
| Ortopedica e Riabilitativa | 5 |
| Neurologica, Psichiatrica e Psicologica | 2 |

**Altre tipologie:** ARTISTICO · EVENTO AZIENDALE · EVENTO INCENTIVE · INAUGURAZIONE · VERNISSAGE · FIERA

### Tipologie formazione ECM (se ECM = Sì)

- RES (RESIDENZIALE)
- FAD (FORMAZIONE A DISTANZA)
- FSC (FORMAZIONE SUL CAMPO)
- BLENDED RES-FSC
- RES / FAD

Taxonomy: `data/leanyou/event-taxonomy.json`

---

## 3. Scheda evento — sezioni interne

Ogni evento creato in **Eventi** apre una scheda con **tab/sezioni**. Tutti i dati operativi dell'evento vivono qui.

### 3.1 Core (anagrafica e programma)

| Sezione | Contenuto |
|---------|-----------|
| **Anagrafica** | CDC, titolo, sede, date, tipo (base/ECM), note, stato |
| **Agenda / Programma** | Programma scientifico, sessioni, slot |
| **Timeline / Checklist** | Milestone operative, checklist pre-evento |

### 3.2 Persone e rubrica

| Sezione | Contenuto |
|---------|-----------|
| **Ospiti** | Contatti della **rubrica globale** associati all'evento, filtrati per **categoria ruolo**: ospite, docente, relatore, PT, delegazione, sponsor, … |
| **Docenti / Relatori** | Scheda docente + **lettere di incarico** da modelli prestabiliti (criteri: ECM / non ECM, con FI / senza FI, …) |
| **Delegazioni** | Gestione delegazioni e rappresentanze |
| **Sponsor / Patrocini** | Partner evento + archivio mail |

> **Ospiti:** non duplicare l'anagrafica — `EventContactAssignment` collega `contactId` + `roleCategory` + dati specifici evento (hotel, transfer, …).

### 3.3 Logistica (due sezioni distinte)

| Sezione | Contenuto |
|---------|-----------|
| **Hotel** | Allotment, camere, preferenze, schede ospitalità |
| **Logistica** | Viaggi, trasferimenti, hospitality, sub-eventi (cene, social) |

### 3.4 Economia e comunicazioni (per evento)

| Sezione | Contenuto |
|---------|-----------|
| **Budget** | Preventivo, consuntivo, costi, ricavi, marginalità **di questo evento** |
| **Comunicazioni** | Email, newsletter, SMS, WhatsApp, reminder, invio documentazione |

### 3.5 Form, iscrizioni, contenuti

| Sezione | Contenuto |
|---------|-----------|
| **Registrazione** | Configurazione form iscrizione; genera pagina pubblica evento; iscrizioni **a pagamento** (PayPal v1, Stripe futuro) |
| **Abstract** | Call for abstract, raccolta e revisione |
| **Survey** | Creazione survey; output post-compilazione: **Excel**, riepilogo dati, **grafici / report visivo** |
| **Connect** | Genera **link/event code** per interazione **palco ↔ platea** (quiz, domande ai relatori) |

### 3.6 Documenti, AI, verbali

| Sezione | Contenuto |
|---------|-----------|
| **Stampati & grafiche** | Upload manuale + (pack AI) generazione automatica da prompt e dati evento |
| **Verbali** | Workspace collegati (`linkedEventId`); CTA nuovo verbale per evento |
| **ECM** | Modulistica CM, attestati, crediti formativi |
| **Archivio mail** | Trasversale per sezione (certificazione qualità) |

### 3.7 Pubblicazione web (pack Platinum / AI website)

| Output | Descrizione |
|--------|-------------|
| **Pagina web evento** | Landing dedicata: programma, relatori, sponsor, registrazione |
| **Area riservata partecipante** | Accesso con **codice fiscale** (o QR / login); contenuti **per ruolo**: schede ospitalità, attestati, abstract, survey, crediti |

```
Event (gestionale)
  ├── publicSiteConfig
  ├── registrationForm
  └── participantPortal
        └── access: codice fiscale | QR | login
        └── sections[]: per roleCategory / per contact
```

---

## 4. Finance (menu globale) vs Budget (per evento)

| Livello | Scope | UI |
|---------|-------|-----|
| **Budget** (tab evento) | Singolo evento | Preventivo/consuntivo evento |
| **Finance** (menu sidebar) | Tutta l'agenzia | Somma e confronto budget di **tutti** gli eventi; KPI economici aggregati |

Implementazione: lettura aggregata su `events[].budget` — nessun dato duplicato; Finance è una **vista report**, non un secondo database budget.

---

## 5. Supporto (menu globale)

Form strutturato per richiedere a LeanMe:

| Tipo richiesta | Esempi |
|----------------|--------|
| **Intervento manuale** | «Generate voi la newsletter di questo evento» |
| **Integrazioni** | Nuovo connettore, API, PayPal/Stripe |
| **Assistenza** | Bug, formazione, configurazione pack |

Collegamento commerciale: add-on **Care** (ticket) — il menu **Supporto** è sempre accessibile; gestione ticket avanzata se pack Care attivo.

---

## 6. Flusso AI (pack AI / Platinum)

Quando un evento ha contenuti sufficienti, il modulo AI (se attivo nel pack):

1. **AI Writing** — testi: newsletter, mail, programmi, abstract, comunicati  
2. **AI Graphics** — locandine, banner, badge, slide, visual (da brand identity tenant)  
3. **AI Website** — genera/aggiorna pagina web evento + SEO + FAQ  
4. **AI Forms** — survey, registrazione, abstract, call for paper  
5. **AI Certificates** — attestati, certificati, badge  
6. **AI Assistant** — per sezione: «Scrivi la mail ai relatori», «Genera nuova immagine evento», …

```
Event + brand tenant + prompts (data/leanyou/prompts.json esteso)
    → job AI (async, Inngest futuro)
    → Stampati (Blob) + Public site (SSR/ISR)
```

Pack definisce **quali** azioni AI sono disponibili; UI mostra pulsanti «Genera con AI» solo se capability `ai_*` attiva.

---

## 7. Pagamenti iscrizioni

| Fase | Provider |
|------|----------|
| v1 | **PayPal** |
| v2 | **Stripe** (aggiunta, non sostituzione obbligatoria) |

Flusso: form registrazione (pagina pubblica evento) → webhook pagamento → crea/aggiorna `EventContactAssignment` + stato pagamento.

---

## 8. Lettere di incarico (sezione Docenti)

Modelli **prestabiliti** selezionati da criteri:

| Criterio | Esempi |
|----------|--------|
| Tipo evento | ECM / non ECM |
| Compensi | Con FI / senza FI |
| Ruolo | Relatore, moderatore, discussant, … |

Storage template: `data/leanyou/templates/lettere-incarico/` (o Blob per tenant custom).  
Generazione: merge dati docente + evento → PDF/DOCX.

---

## 9. Modello dati (overview)

```
Tenant
  ├── eventPack: core | pro | ai | platinum
  ├── leonardoCapabilities: { hub, eventi, contatti, verbali, finance, supporto, ai_* }
  └── contacts[]

Event
  ├── anagrafica
  ├── agenda[]
  ├── assignments[]     → contactId + roleCategory + eventSpecificData
  ├── hotel{}
  ├── logistica{}
  ├── budget{}
  ├── comunicazioni[]
  ├── surveys[]
  ├── connectSession{}
  ├── stampati[]
  ├── registrationForm{}
  ├── abstractConfig{}
  ├── delegations[]
  ├── publicSite{}
  └── linkedWorkspaceIds[]  (derivato da verbali)

LeonardoWorkspace (verbale)
  └── linkedEventId?: string
```

**Storage pattern** (come verbali oggi): JSON per entità su Vercel Blob `leanyou/events/{tenantId}/{eventId}.json` + allegati per sezione.

---

## 10. Capability matrix (sidebar vs evento)

| Capability | Sidebar menu | Tab evento | Pack minimo |
|------------|:------------:|:----------:|-------------|
| `hub` | ✓ | | CORE |
| `eventi` | ✓ | | CORE |
| `contatti` | ✓ | | CORE |
| `verbali` | ✓ | ✓ | modulo `leonardo` |
| `finance` | ✓ | | PRO |
| `supporto` | ✓ | | sempre visibile |
| `hotel` | | ✓ | CORE |
| `logistica` | | ✓ | CORE |
| `budget` | | ✓ | PRO |
| `comunicazioni` | | ✓ | PRO |
| `ospiti` | | ✓ | CORE |
| `docenti` | | ✓ | CORE |
| `delegazioni` | | ✓ | CORE |
| `registrazione` | | ✓ | CORE / PRO |
| `abstract` | | ✓ | PRO |
| `survey` | | ✓ | PRO |
| `connect` | | ✓ | PRO / AI |
| `stampati` | | ✓ | PRO |
| `ecm` | | ✓ | PRO |
| `public_site` | | ✓ | PLATINUM |
| `participant_portal` | | ✓ | PLATINUM |
| `ai_*` | | ✓ | AI / PLATINUM |
| `payments_paypal` | | ✓ | PRO |
| `payments_stripe` | | ✓ | futuro |

Override opzionale **per singolo evento** (es. congresso ECM con tutto, cena senza budget).

---

## 11. Roadmap implementazione (sintesi)

| Fase | Deliverable |
|------|-------------|
| **Sprint 1** ✅ | Hub, Eventi (anagrafica), Contatti, Verbali AI, redirect legacy |
| **Sprint 2** | Tab evento: Ospiti, Hotel, Logistica, Docenti (base), Delegazioni |
| **Sprint 3** | Budget per evento + Finance aggregato |
| **Sprint 4** | Comunicazioni, Survey, Connect |
| **Sprint 5** | Registrazione pubblica + PayPal |
| **Sprint 6** | Lettere incarico, Abstract, Stampati upload |
| **Sprint 7** | AI generazione stampati/sito (pack AI) |
| **Sprint 8** | Pagina web evento + area riservata CF (pack Platinum) |
| **Sprint 9** | Supporto / Care ticket, Stripe |

---

## 12. Decisioni confermate (vocale 2026-07-10)

- [x] Menu esterno: Cruscotto, Eventi, Rubrica, **Verbali AI**, **Finance**, **Supporto**
- [x] Hotel e Logistica = **due tab separate** dentro evento
- [x] Budget e Comunicazioni = **dentro evento**; Finance = report globale
- [x] Ospiti = rubrica filtrata per categoria ruolo sull'evento
- [x] Registrazione, Abstract, Delegazioni = sezioni evento
- [x] Connect = quiz palco-platea per evento
- [x] Survey → Excel + grafici
- [x] Pagamenti iscrizioni: PayPal → Stripe
- [x] Lettere incarico docenti con modelli ECM/FI
- [x] AI genera stampati + sito evento + area partecipante (da pack)
- [x] Pack commerciali governano visibile/attivo/locked

---

## 13. Documenti correlati

| Documento | Contenuto |
|-----------|-----------|
| `docs/leanyou-event-platform-packs.md` | CORE / PRO / AI / PLATINUM + add-on |
| `docs/leanyou-events.md` | Specifica operativa e sprint dettagliati |
| `docs/leanyou-leonardo-scheda-tecnica.md` | Verbali AI (produzione) |
| `docs/leanyou.md` | Overview LeanYou |

---

*Prossimo passo: allineare `config.json`, `types/leanyou.ts` e UI tab evento allo schema §3.*
