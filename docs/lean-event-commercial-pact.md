# Lean Event · Patto commerciale di solidità

**Data patto:** 2026-07-16  
**Parti:** LeanMe (know-how eventi / feder congressi / vendita) + Agent architect (sicurezza informatica, data integrity, modularità)  
**Stato:** **vincolante da oggi** — non più prototipo / pilota interno

---

## 1. Dichiarazione

Da oggi Lean Event è trattato come **software commerciale vendibile**, rilasciato in modo **modulare**.

- I moduli possono arrivare nel tempo.
- La **struttura dati, sicurezza e recupero** devono essere solidi **fin da subito**.
- Nessuna feature nuova giustifica rischio di perdita di contatti, eventi, documenti, flussi o storico.

**Know-how e prodotto:** LeanMe.  
**Sicurezza, integrità DB, architettura resilient, verifiche continue:** responsabilità permanente dell’agent architect su questo repo.

---

## 2. Impegni non negoziabili (zero perdita)

| Asset | Impegno |
|-------|---------|
| Contatti / rubriche | Soft delete, versioni, Neon SoT, backup, import massivo sicuro |
| Eventi (presenti e futuri; storico dove possibile) | Idem + optimistic locking multi-utente |
| Documenti (CV, attestati, Age.na.s, faculty, allegati) | Registry Neon + Blob; attestati/CV sempre recuperabili in piattaforma |
| Flussi / verbali / workspace | Lifecycle + cestino + versioni + backup |
| Audit | Chi ha fatto cosa (verso Neon append-only) |
| Tenant multipli | Isolamento rigoroso `tenant_id`; nessun cross-tenant leak |

**Vietato:** hard-delete silenzioso; deploy che wipe storage; feature che bypassano lifecycle; “tanto è demo”.

---

## 3. Standard di prodotto commerciale

1. **Vendibile oggi** anche se incompleta a moduli — ciò che è live deve essere affidabile.
2. **Modulare** — ogni nuovo modulo si innesta su Neon/Blob/lifecycle senza riscrivere il nucleo.
3. **Flessibile ma governata** — evoluzione schema solo con safe change (§14 resilience + rules Cursor).
4. **Multi-agenzia internazionale / feder congressi** — scala, multi-utente, dati sensibili, import storici massivi.
5. **Manutenibile** — criteri e limiti documentati; rivalutazioni solo esplicite (retention, documenti).

---

## 4. Onboarding clienti (storico massivo)

La piattaforma **deve** supportare caricamenti massivi fin dal go-to-market:

| Dominio | Oggi | Target commerciale |
|---------|------|---------------------|
| Contatti | Import Excel (preview/apply) | Migliaia di righe, job async se > soglia, report errori |
| Sedi | Import Excel | Idem |
| Fornitori | Import Excel + UI | Migliaia di righe, job async se > soglia, report errori |
| Eventi presenti/futuri | Import Excel (titolo, date, CDC, sede, stato) | Idem + job async |
| Eventi storici | Import stesso canale (stato completed) | Preferibile; se esclusi, decisione prodotto esplicita per tenant |
| Documenti (CV/attestati) | API registry Neon + Blob | UI liste + upload/import massivo |
| Assignment ospiti | Bulk su evento | Import listini ospiti già presente in parte → rafforzare a scala |

Principio import: **preview → apply → audit**; mai overwrite cieco; dedupe chiara; report saltati/errori.

---

## 5. Checklist agent (ogni sessione che tocca dati)

Prima di chiudere lavoro su storage/API/schema:

- [ ] Nessuna via di scrittura senza Neon (dual-write / SoT) dove applicabile
- [ ] Soft delete + revision dove l’entità è gestita
- [ ] Nessuna perdita silenziosa su rename/migrate campi
- [ ] Documenti binari → registry + Blob (non solo JSON annidato)
- [ ] Import massivi: pensati per migliaia di righe, non solo happy path UI
- [ ] Aggiornare docs se cambia contratto (`integrity`, `retention`, `documents`, questo patto)

Fonti operative:

- `docs/lean-event-integrity-status.md`
- `docs/lean-event-retention-criteria.md`
- `docs/lean-event-document-architecture.md`
- `docs/leanyou-data-resilience.md`
- `.cursor/rules/lean-event-db-target.mdc`
- `.cursor/rules/lean-event-retention.mdc`
- `.cursor/rules/lean-event-documents.mdc`
- `.cursor/rules/lean-event-commercial-ready.mdc`

---

## 6. Cosa manca ancora per “vendibile enterprise” (onestà)

Solidità **nucleo Fase C chiusa a codice** (2026-07-16). Restano solo verifiche operative e pezzi UI secondari:

| # | Voce | Stato |
|---|------|--------|
| 1 | Smoke formale produzione | Checklist: `docs/lean-event-smoke-checklist.md` — da firmare su event.leanme.it |
| 2 | Backup Blob giornaliero | ✅ cron `backup-blob` |
| 3 | Export periodico tenant | ✅ cron `export-tenants` (domenica 04:00 UTC) |
| 4 | Audit write su Neon | ✅ mutazioni + import + documenti + restore versioni |
| 5 | API documenti | ✅ list/upload/delete/restore — UI liste dedicate ancora da modulo |
| 6 | Import fornitori + eventi | ✅ API + UI `LeonardoBulkImport` + modelli Excel |
| 7 | Banner conflitto multi-utente | ✅ dialog + polling revision su contatto/sede/fornitore/evento |

Nuovi moduli prodotto solo se **non** indeboliscono il nucleo. Dopo smoke firmato → prioritizzare UI documenti e job async import > soglia.

---

## 7. Firma del patto

| Ruolo | Impegno |
|-------|---------|
| **LeanMe** | Know-how eventi, priorità commerciali, validazione operativa, vendita modulare |
| **Architect (Cursor agent)** | Sicurezza, zero perdita dati, coerenza DB, modularità, import massivi, verifiche continue |

**Stringiamo il patto in data 2026-07-16.**  
Ogni sviluppo successivo si considera vincolato a questo documento.
