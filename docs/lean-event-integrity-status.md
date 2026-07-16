# Lean Event · Integrità DB & scala enterprise — stato 2026-07-16

**Patto commerciale:** `docs/lean-event-commercial-pact.md` — **vincolante** (non più prototipo).  
**Scopo:** piattaforma multi-tenant, multi-utente, dati sensibili non smarribili, volume documenti alto (CV docenti, ECM/Age.na.s, attestati, faculty pack), **import storici massivi** per onboarding clienti.  
**Verifica runtime Neon:** OK (schema 001+002: entities/versions/presence/documents/audit).

---

## 1. Dove siamo (fasi)

| Fase | Stato | Note |
|------|--------|------|
| **A Fondamenta** | ✅ chiusa | lifecycle, soft delete 30g, cestino, version snapshot, cron purge |
| **B Neon + Cronologia** | ✅ codice + cutover prod | manca **smoke test utente** formale su event.leanme.it |
| **C Resilienza prod** | ✅ codice chiuso | backup, export, audit Neon, API documenti, import fornitori/eventi, polling conflitto |
| **D Presenza/merge** | ⬜ opzionale | heartbeat, merge campi, SSE |

### Runtime verificato

- Tabelle: `lean_event_entities`, `lean_event_entity_versions`, `lean_event_entity_presence`, `lean_event_documents`, `lean_event_audit_events`
- PK/indici OK (incluso `contactId` su assignment); dual-write; letture Neon
- Retention versioni: 50 OR 90g su Neon+Blob+FS
- Cron: `purge-trash` · `backup-blob` · `export-tenants`

---

## 2. Cosa è già “solido”

1. **Source of truth strutturata su Neon** (con fallback Blob in lettura se miss/errore)
2. **Dual-write** su eventi, contatti, sedi, fornitori, assignment, workspace
3. **Optimistic locking** (`revision`) + dialog conflitto + banner stale (polling)
4. **Soft delete + cestino 30g** + purge cron
5. **Cronologia/ripristino** revisioni + audit `version_restore`
6. **Backup Blob** giornaliero + **export tenant** settimanale
7. **Audit append-only** su Neon per mutazioni dominio
8. **Registry documenti** API + tabella Neon
9. **Import massivo** contatti/sedi/fornitori/eventi
10. **Criteri retention** (`docs/lean-event-retention-criteria.md`)

---

## 3. Lacune residue (non bloccano vendita nucleo)

| # | Lacuna | Rischio | Priorità |
|---|--------|---------|----------|
| 1 | Smoke prod formale non firmato | cutover non certificato operativamente | **immediata** — `docs/lean-event-smoke-checklist.md` |
| 2 | UI liste documenti dedicata | API ok; moduli faculty/attestati ancora senza shell UI | C+ |
| 3 | Import async > migliaia di righe | timeout HTTP su file enormi | C+ |
| 4 | Verbali HTML ancora payload workspace | OK oggi; a volume alto versionare come document | C+ |
| 5 | Verifica recovery da manifest backup | procedure da esercitare in drill | ops |

---

## 4. Scala documenti (CV, Age.na.s, attestati) — decisione architetturale

### Principio (allineato a `.cursor/rules/lean-event-db-target.mdc`)

| Layer | Cosa vive lì | Esempi |
|-------|----------------|--------|
| **Neon** | metadati, ownership, ACL, revision, soft delete, indici di ricerca | tipo doc, persona, evento, stato, hash, size, `blobPath`, `purgeAfter` |
| **Vercel Blob** | file binario immutabile (versionato per path) | `cv.pdf`, `attestato-xxx.pdf`, pack faculty ZIP |
| **UI** | liste paginate/filtrate da Neon, download stream da Blob | rubrica faculty, area partecipante “I miei attestati” |

### Regole non negoziabili (memorizzare)

1. **Mai** tenere migliaia di CV solo come array annidato in un JSON evento/contatto.
2. Ogni file recuperabile in piattaforma = **riga `document` su Neon** + blob path.
3. Documenti “sempre disponibili” (attestati partecipante, CV faculty, certificazioni) → **no expiry automatica**; soft delete solo su azione utente/admin; retention cestino 30g come resto dominio.
4. Export “segreteria scarica e mette sul suo cloud” = **azione esplicita** (ZIP/export), non sostituto dello storage piattaforma.
5. ACL: tenant + ruolo (segreteria / faculty / partecipante vede solo i propri).
6. PDF generati (attestati, Age.na.s) = scrittura **atomica**: metadati Neon `status=ready` solo dopo put Blob riuscito; altrimenti `failed` + retry.

Dettaglio: `docs/lean-event-document-architecture.md`.

---

## 5. Ordine di lavoro consigliato (dopo Fase C)

1. Firmare smoke checklist su produzione
2. UI documenti (liste/filtri) sopra API esistenti
3. Job async import se soglia superata
4. Drill recovery backup/export
5. Solo dopo: moduli faculty / ECM / area partecipante

---

## 6. Verdetto

**Nucleo commerciale (integrità dati):** Fase C **chiusa a codice** — backup, export, audit, documenti API, import fornitori/eventi, conflitto multi-utente esteso.

**Prossimo step operativo:** eseguire e firmare `docs/lean-event-smoke-checklist.md` su https://event.leanme.it (dopo deploy del branch corrente).
