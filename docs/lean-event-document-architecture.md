# Lean Event · Architettura documenti (scala massiva)

**Decisione:** 2026-07-16  
**Contesto:** CV docenti (migliaia), pack faculty, PDF Age.na.s / certificazioni, attestati partecipazione sempre recuperabili.  
**Fonte correlata:** `docs/lean-event-integrity-status.md`, `docs/lean-event-retention-criteria.md`, rule DB target.

---

## 1. Obiettivo

Ogni materiale “deve restare in piattaforma” è:

1. **Trovabile** (filtri: persona, evento, tipo, anno)
2. **Autorizzato** (tenant + ruolo; partecipante solo i propri)
3. **Integro** (hash, revision metadati, soft delete, audit)
4. **Performante** (liste paginate da Postgres, non scan Blob)

---

## 2. Modello

```
Neon (metadati)          Blob (binario)
─────────────────        ──────────────────────────────
document.id              lean-event/documents/{tenantId}/
document.kind            {entityType}/{entityId}/{docId}/v{n}/{filename}
document.personId
document.eventId
document.assignmentId
document.blobPath   ──►
document.sha256
document.bytes
document.mime
document.revision
document.deletedAt
```

### Kind iniziali (estensibili)

| kind | Chi lo usa | Permanenza |
|------|------------|------------|
| `cv` | faculty / docenti | permanente (fino a soft delete) |
| `faculty_pack` | segreteria evento | permanente evento + storico |
| `attestato_partecipazione` | partecipante + segreteria | **permanente** (diritto recupero) |
| `certificazione_ecm` / `agenas` | segreteria / provider | permanente + export |
| `travel_id` | ospiti | retention privacy dedicata (valutare GDPR) |
| `supplier_agreement` | fornitori | già parziale oggi → migrare a registry |
| `other` | generico | policy per tenant |

---

## 3. Cosa non fare

- Embeddare migliaia di file metadata dentro `LeonardoEvent` / contatto JSON
- Usare solo cartelle Blob senza riga DB
- Cancellare attestati con purge “età” automatica
- Servire liste scaricando/listing tutto il prefix Blob

---

## 4. UI / UX a scala

- Liste server-side: `LIMIT/OFFSET` o cursor su Neon
- Anteprima: solo tipi safe (PDF iframe / download)
- Download massivo: job export ZIP async (Fase C export), non sync HTTP lunghi
- Area partecipante: “I miei documenti” filtrata per `personId` / email account

---

## 5. Generazione PDF (attestati / Age.na.s)

Pipeline:

1. Crea riga Neon `status=generating`
2. Genera PDF → put Blob path versionato
3. Aggiorna Neon `status=ready`, `blobPath`, `sha256`, `bytes`
4. Se fallisce: `status=failed`, audit, retry

Idempotenza: stesso `(tenant, kind, person, event, templateVersion)` non duplica senza override esplicito.

---

## 6. Export segreteria vs storage piattaforma

| Bisogno | Meccanismo |
|---------|------------|
| Lavorare in piattaforma (faculty, ospite) | Blob + Neon sempre online |
| Copia sul cloud cliente | Export ZIP / sync on-demand (Fase C) |
| Backup disaster recovery | Cron backup giornaliero (Fase C) |

L’export **non** sostituisce la disponibilità in piattaforma.

---

## 7. Implementazione (ordine)

1. SQL `002_lean_event_documents.sql` (+ indici)
2. Dual-write / API documents
3. Migrazione documenti supplier/travel esistenti → registry
4. UI faculty + “i miei attestati”
5. Generator PDF attestati sopra il registry

---

## 8. Rivalutazione

Rivalutare storage Blob pricing e PITR Neon quando un tenant supera ~50k documenti attivi o ~100 GB Blob.
