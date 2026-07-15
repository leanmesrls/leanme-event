# Lean.Event Platform — Pack, moduli e funzioni attive

**Versione documento:** 2026-07-10  
**Stato:** Proposta commerciale / product idea (non implementata)  
**Prodotto:** **Lean.Event Platform** dentro **Leonardo** (Lean Event multi-tenant)  
**Tenant pilota:** I&C srl — `iec`  
**Documenti correlati:** `docs/lean-event-events.md`, `docs/lean-event.md`, `docs/lean-event-leonardo-scheda-tecnica.md`

---

## 1. Scopo del documento

Archiviare la **proposta di packaging commerciale**: quali moduli e funzioni sono attivi in base al **pack acquistato** dal cliente (agenzia eventi).

Principio guida:

> Ogni funzione è **attivabile o disattivabile** all’onboarding. L’UI mostra le voci **locked** con CTA verso LMI (`info@leanme.it`) se non incluse nel pack.

Allineamento tecnico (implementazione futura):

| Livello | Dove si configura |
|---------|-------------------|
| Pack commerciale | Contratto / onboarding |
| Moduli Lean Event | `tenant.modules[]` |
| Capability Leonardo | `tenant.leonardoCapabilities` + override opzionale per evento |
| Add-on separati | Care, Studio, Marketplace — **mai compresi** nei pack base |

---

## 2. Naming prodotto

| Nome commerciale | Uso |
|------------------|-----|
| **Lean.Event Platform** | Prodotto gestionale eventi (interno: modulo `events` + Leonardo hub) |
| **Lean Digital Event Ecosystem** | Nome alternativo pack **Platinum** |
| **Lean.Event Enterprise** | Nome alternativo pack **Platinum** |

Leonardo resta il **cruscotto gestionale** (`/lean-event/{tenant}/leonardo`).  
Lean.Event Platform è il **dominio funzionale eventi** attivato dal pack.

---

## 3. Pack commerciali — panoramica

| Pack | Tagline | Target | AI |
|------|---------|--------|-----|
| **CORE** | «Gestisci l'evento.» | Agenzie piccole | No |
| **PRO** | «Automatizza il lavoro.» | Gestionale completo operativo | No |
| **AI** | Assistente, non solo gestionale | Valore differenziante AI | Sì |
| **PLATINUM** | Lean Digital Event Ecosystem / Enterprise | Ecosistema digitale end-to-end | Sì + website/API |

**Add-on (sempre separati, mai compresi nei pack):**

| Add-on | Modello |
|--------|---------|
| **Care** | Assistenza tecnica — ticket |
| **Studio** | Produzione LeanMe — pacchetti ore |
| **Marketplace** | Libreria template condivisa |

---

## 4. Pack CORE

**Tagline:** «Gestisci l'evento.»  
**Per:** agenzie piccole.  
**Senza AI.**

### Funzioni incluse

| Area | Funzioni |
|------|----------|
| **Anagrafica** | Anagrafica eventi |
| **Programma** | Agenda |
| **Persone** | Partecipanti, Relatori |
| **Partner** | Sponsor |
| **Logistica base** | Hotel, Trasferimenti |
| **Documenti** | Documenti, Checklist, Timeline |
| **Amministrazione** | Gestione utenti, Archivio eventi |

### Capability tecniche previste (mapping)

```
events_anagrafica
events_agenda
events_partecipanti
events_relatori
events_sponsor
events_hotel_base
events_transfer_base
events_documenti
events_checklist
events_timeline
events_utenti
events_archivio_eventi
```

### Non incluso

- Comunicazioni (email, newsletter, SMS, WhatsApp)
- Budget / preventivi / consuntivi
- ECM / badge / attestati
- Dashboard KPI avanzata
- AI (qualsiasi)
- Website builder / API / integrazioni enterprise

---

## 5. Pack PRO

**Tagline:** «Automatizza il lavoro.»  
**Include:** tutto il **CORE** + automazione operativa e controllo economico.

### Funzioni aggiuntive

#### Comunicazioni

| Canale / funzione |
|-------------------|
| Email |
| Newsletter |
| SMS |
| WhatsApp |
| Reminder automatici |
| Invio documentazione |

#### Logistica (completa)

| Funzione |
|----------|
| Hotel |
| Viaggi |
| Transfer |
| Hospitality |

#### Budget

| Funzione |
|----------|
| Preventivi |
| Consuntivi |
| Costi |
| Ricavi |
| Marginalità |

#### Materiale ECM / congressuale

| Funzione |
|----------|
| Badge |
| Attestati |
| Kit |
| Materiale congressuale |

#### Dashboard

| Funzione |
|----------|
| KPI |
| Stato attività |
| Task |

> A questo livello il gestionale diventa **veramente completo** per l’operatività quotidiana dell’agenzia.

### Capability tecniche aggiuntive (mapping)

```
events_comunicazioni
events_logistica          (completa)
events_budget
events_ecm
events_stampati
events_dashboard
events_task
```

---

## 6. Pack AI

**Cambio di valore:** non è più solo un gestionale — diventa un **assistente**.

**Include:** tutto il **PRO** +

### AI Writing

Scrive automaticamente:

- Newsletter
- Mail
- Reminder
- Inviti
- Testi sito
- Programmi
- Abstract
- Comunicati

### AI Graphics

Genera (partendo dalla **brand identity** del cliente):

- Locandine
- Banner
- Hero
- Social
- Badge
- Slide
- Visual

### AI Assistant (conversazionale)

Esempi di richieste supportate:

- «Preparami la mail ai relatori.»
- «Suggeriscimi un claim.»
- «Crea la brochure.»
- «Dammi 5 idee.»
- «Analizza il budget.»

### AI Suggestions (analitico)

Analizza e suggerisce miglioramenti su:

- Iscrizioni
- Sponsor
- Andamento
- Costi
- Criticità

### Capability tecniche aggiuntive (mapping)

```
ai_writing
ai_graphics
ai_assistant
ai_suggestions
```

**Nota:** richiede integrazione OpenAI (o equivalente) + policy brand per tenant (`brand.md`).

---

## 7. Pack PLATINUM

**Nomi alternativi:**

- **Lean Digital Event Ecosystem**
- **Lean.Event Enterprise**

**Include:** tutto **AI** + ecosistema digitale pubblico e integrazioni.

### Website Builder

Ogni evento genera automaticamente:

| Pagina / area |
|---------------|
| Landing page |
| Programma |
| Relatori |
| Sponsor |
| Iscrizione |
| Reserved Area |

**Accesso partecipante** tramite:

- Codice fiscale
- QR
- Login

**Contenuti area riservata:**

- Attestati
- Documentazione
- Materiali
- Survey
- Crediti
- Certificati

### Dynamic Website (agenzia)

Il **sito dell’agenzia si aggiorna automaticamente**: gli eventi pubblicati nel gestionale diventano pagine web.

> L’agenzia **non aggiorna più WordPress** — lavora **solo nel gestionale**.

### AI Website

L’AI crea automaticamente:

- Pagina evento
- Programma
- Testi SEO
- FAQ
- News

### AI Forms

Genera:

- Survey
- Form
- Abstract
- Iscrizioni
- Call for paper

### AI Certificates

Genera:

- Attestati
- Certificati
- Badge

### API — collegamenti

| Integrazione |
|--------------|
| CRM |
| Zoom |
| Teams |
| Stripe |
| PagoPA |
| Moodle |
| ECM |
| ERP |

### Capability tecniche aggiuntive (mapping)

```
website_builder
website_dynamic_agency
reserved_area_partecipanti
ai_website
ai_forms
ai_certificates
api_integrations
```

---

## 8. Add-on — Care (assistenza)

**Mai compresa nei pack.** Venduta separatamente.

| Servizio |
|----------|
| Assistenza tecnica |
| Ticket |

---

## 9. Add-on — Studio (produzione LeanMe)

**Mai compresa nei pack.** Venduta a **pacchetti ore** — «avere il team LeanMe a disposizione».

Non è assistenza: è **produzione**.

### Servizi utilizzabili con le ore

| Servizio |
|----------|
| Newsletter personalizzate |
| Template |
| Landing page |
| Survey avanzate |
| Automazioni |
| Workflow |
| Grafiche |
| Banner |
| Campagne |
| Sviluppo custom |

### Pacchetti ore (proposta)

| Pack ore | Nome |
|----------|------|
| 10 h | **Starter** |
| 25 h | **Professional** |
| 50 h | **Enterprise** |

Le ore sono **fungibili** su qualsiasi voce produzione Studio.

---

## 10. Add-on — Marketplace

**Proposta differenziante:** ogni cliente ha una **libreria** condivisa / acquistabile.

### Contenuti libreria (template)

| Categoria |
|-----------|
| Template newsletter |
| Survey |
| Landing |
| Badge |
| Attestati |
| Social |
| Roll-up |
| Programmi |
| Cartelle |
| Poster |

### Flusso utente

1. **Un click** — seleziona template  
2. **Personalizza** — brand + dati evento  
3. **Pubblica** — comunicazione / stampato / pagina  

---

## 11. Matrice pack → funzioni (riepilogo)

| Funzione | CORE | PRO | AI | PLATINUM |
|----------|:----:|:---:|:--:|:--------:|
| Anagrafica eventi | ✓ | ✓ | ✓ | ✓ |
| Agenda | ✓ | ✓ | ✓ | ✓ |
| Partecipanti / Relatori / Sponsor | ✓ | ✓ | ✓ | ✓ |
| Hotel / Transfer (base) | ✓ | ✓ | ✓ | ✓ |
| Documenti / Checklist / Timeline | ✓ | ✓ | ✓ | ✓ |
| Utenti / Archivio eventi | ✓ | ✓ | ✓ | ✓ |
| Comunicazioni multicanale | | ✓ | ✓ | ✓ |
| Logistica completa + Hospitality | | ✓ | ✓ | ✓ |
| Budget / marginalità | | ✓ | ✓ | ✓ |
| ECM / badge / attestati / kit | | ✓ | ✓ | ✓ |
| Dashboard KPI / Task | | ✓ | ✓ | ✓ |
| AI Writing / Graphics / Assistant | | | ✓ | ✓ |
| AI Suggestions | | | ✓ | ✓ |
| Website Builder evento | | | | ✓ |
| Dynamic Website agenzia | | | | ✓ |
| Reserved Area partecipanti | | | | ✓ |
| AI Website / Forms / Certificates | | | | ✓ |
| API integrazioni | | | | ✓ |
| Care (ticket) | add-on | add-on | add-on | add-on |
| Studio (ore produzione) | add-on | add-on | add-on | add-on |
| Marketplace template | add-on | add-on | add-on | add-on |

**Workspace verbali (Leonardo Secretary Assistant):** modulo **`leonardo`** separato — può essere combinato con qualsiasi pack Event (es. I&C: verbali + eventi).

---

## 12. Implementazione tecnica (roadmap)

### Stato attuale (Sprint 1 — 2026-07-10)

Implementato in dev, non ancora deploy completo:

- Hub Leonardo, Eventi (anagrafica), Contatti, Verbali
- Capability base: `eventi`, `contatti`, `verbali`, moduli locked → mailto LMI

### Prossimi passi suggeriti

1. **Modello pack** in `tenants.json`: `eventPack: "core" | "pro" | "ai" | "platinum"`
2. **Derivazione capability** da pack in `lib/lean-event/capabilities.ts` (come oggi da `modules[]`)
3. **Sidebar** — voci visibili ma locked se non nel pack
4. **Override per evento** — capability granulari (già previsto in `leanyou-events.md` §2.5)
5. **Care / Studio / Marketplace** — entità e billing separati, mai ereditati dal pack

### Esempio configurazione tenant (futuro)

```json
{
  "id": "iec",
  "slug": "iec",
  "modules": ["leonardo", "events"],
  "eventPack": "pro",
  "addons": {
    "care": false,
    "studioHoursRemaining": 0,
    "marketplace": false
  },
  "leonardoCapabilities": {
    "verbali": true,
    "eventi": true,
    "contatti": true,
    "comunicazioni": true,
    "budget": true,
    "logistica": true,
    "ecm": true,
    "stampati": true
  }
}
```

---

## 13. Decisioni aperte

| # | Domanda |
|---|---------|
| 1 | Pack AI e Platinum includono quota token AI o consumo a parte? |
| 2 | Dynamic Website: dominio custom agenzia vs sottodominio LeanMe? |
| 3 | Marketplace: template globali LeanMe vs libreria per tenant? |
| 4 | Workspace verbali: incluso in CORE Event o sempre add-on `leonardo`? |
| 5 | Prezzi pubblici vs solo preventivo commerciale |

---

*Documento archiviato come proposta product — aggiornare quando il pricing e i pack vengono formalizzati commercialmente.*
