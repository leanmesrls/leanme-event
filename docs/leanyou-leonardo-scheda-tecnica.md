# Leonardo · Secretary Assistant — Scheda tecnica (generazione verbali)

**Prodotto:** Lean Event · modulo **Workspace verbali** (parte della piattaforma **Leonardo** — vedi `docs/lean-event-events.md` §0)  
**Versione documento:** 2026-07-10  
**Stato:** v1.0 in produzione su `demo.leanme.it` — flusso end-to-end verificato (trascrizione video + generazione documenti, ~10 minuti per riunione tipica)  
**Scope:** generazione verbali da audio/video, trascrizione testuale e output documentali  
**Roadmap:** collegamento opzionale `linkedEventId` → tab Verbali nella scheda evento Leonardo

---

## 1. Scopo e perimetro

Leonardo · Secretary Assistant consente a un tenant Lean Event (es. I&C srl) di:

1. Creare un **workspace** per ogni riunione (metadati: titolo, cliente, data, partecipanti, tipo riunione).
2. Caricare **video/audio** (Zoom, registrazioni) fino a **2 GB**, oppure testo (txt/vtt/srt) o note testuali integrative.
3. Ottenere **trascrizione** (Whisper) e **7 documenti** generati da OpenAI (verbali, report, piano d’azione, email follow-up).
4. Visualizzare i documenti in browser e **scaricarli in formato Word** (HTML `.doc` compatibile).

**Fuori scope v1:** export DOCX nativo, coda job asincrona (Inngest), elaborazione server-side del video (FFmpeg gira nel browser).

---

## 2. Architettura del flusso

```mermaid
flowchart TB
  subgraph client [Browser — LeonardoWorkspaceDetail]
    A[Upload video/audio/testo]
    B[FFmpeg.wasm — estrazione + split]
    C[POST transcribe × N chunk]
    D[PATCH transcript su workspace]
    E[POST process — generazione verbali]
    F[GET workspace — documenti]
  end

  subgraph vercel [Vercel — API Routes]
    T[/api/.../transcribe]
    P[/api/.../process]
    W[/api/.../ workspaces]
  end

  subgraph external [Servizi esterni]
    OAI_T[OpenAI Whisper]
    OAI_C[OpenAI Chat Completions]
    BLOB[Vercel Blob]
  end

  A --> B
  B --> C
  C --> T --> OAI_T
  C --> D --> W --> BLOB
  D --> E --> P
  P --> OAI_C
  P --> BLOB
  E --> F --> W
```

### Fasi operative (ordine)

| # | Fase | Dove | Durata indicativa |
|---|------|------|-------------------|
| 1 | Caricamento FFmpeg core (~30 MB) | Browser | 10–60 s (prima volta) |
| 2 | Estrazione audio WAV 16 kHz mono | Browser (FFmpeg.wasm) | dipende da durata video |
| 3 | Split in chunk ~90 s | Browser | pochi secondi |
| 4 | Trascrizione chunk (Whisper) | Server → OpenAI | ~5–15 s × N chunk |
| 5 | Salvataggio trascrizione | Server → Blob | < 5 s |
| 6 | Strutturazione JSON + rendering HTML | Server → OpenAI | 1–4 min (segmenti in parallelo ×3) |
| 7 | Persistenza workspace completato | Server → Blob | < 5 s |

---

## 3. Stack tecnologico

| Layer | Tecnologia |
|-------|------------|
| Framework | Next.js 15.5 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Auth session | Cookie firmato `lean_event_session` (HMAC) |
| Storage workspace | Vercel Blob (prod) / filesystem `.lean-event-data/` (locale) |
| Audio client | `@ffmpeg/ffmpeg@0.12.10`, `@ffmpeg/core@0.12.6` (self-hosted in `/public/ffmpeg/`) |
| Trascrizione | OpenAI `whisper-1` (configurabile) |
| Strutturazione | OpenAI Chat Completions, `response_format: json_object` |
| Deploy | Vercel (`demo.leanme.it`), runtime `nodejs` |

---

## 4. URL e routing

| Risorsa | Percorso |
|---------|----------|
| Login Lean Event | `/lean-event/login` |
| Lista workspace (tenant I&C) | `/lean-event/iec/leonardo` |
| Nuovo workspace | `/lean-event/iec/leonardo/new` |
| Dettaglio / elaborazione | `/lean-event/iec/leonardo/[id]` |

**Isolamento tenant:** ogni workspace ha `tenantId`; le API usano `session.tenantId` — un tenant non accede ai workspace di un altro.

---

## 5. Modello dati workspace

File: `types/lean-event.ts` → `LeonardoWorkspace`

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Identificativo workspace |
| `tenantId` | string | Tenant proprietario |
| `title`, `client`, `organization` | string | Metadati riunione |
| `meetingDate` | string | Data in formato europeo (gg/mm/aaaa) |
| `meetingType` | enum | `client_meeting` \| `scientific_committee` \| `internal_meeting` |
| `participants`, `moderator`, `secretary`, `notes` | string | Contesto aggiuntivo |
| `status` | enum | `draft` \| `content_ready` \| `processing` \| `completed` \| `failed` |
| `transcript` | string | Trascrizione integrale (salvata prima del process) |
| `structured` | JSON \| null | Output strutturato OpenAI |
| `documents` | Record&lt;id, html&gt; | 7 documenti HTML Word-ready |
| `errorMessage` | string \| null | Ultimo errore |

**Persistenza:**

- **Locale:** `.lean-event-data/workspaces/{tenantId}/{id}.json`
- **Produzione:** Blob path `leanyou/workspaces/{tenantId}/{id}.json` (accesso `private`)

---

## 6. API REST (generazione verbali)

Tutte richiedono sessione valida + modulo `leonardo` sul tenant.

### `POST /api/lean-event/workspaces/{id}/transcribe`

- **Body:** `{ file: { name, mimeType, dataBase64 } }`
- **Limite body:** audio decodificato ≤ **3 MB** (Vercel 4.5 MB con overhead base64/JSON)
- **maxDuration:** 120 s
- **Output:** `{ text: string }`
- **Backend:** `transcribeAudioBuffer()` → OpenAI `/v1/audio/transcriptions`

### `PATCH /api/lean-event/workspaces/{id}`

- Aggiorna metadati; supporta `transcript` + `status: "content_ready"`
- Usato **prima** del process per non perdere la trascrizione in caso di timeout

### `POST /api/lean-event/workspaces/{id}/process`

- **Body:** `{}` (legge `transcript` dal workspace salvato) opzionale `{ transcript }` legacy
- **maxDuration:** **300 s** (5 min, Vercel Pro)
- **Output:** `{ ok: true, workspaceId }` — il client fa GET per caricare i documenti
- **Backend:** `processLeonardoWorkspace()` → segmentazione → OpenAI × N → merge → render HTML → save Blob

### `GET /api/lean-event/workspaces/{id}`

- Restituisce workspace completo inclusi `documents`

---

## 7. Pipeline audio (browser)

**File:** `lib/lean-event/ffmpeg-client.ts`

### Input supportati

| Tipo | Estensioni |
|------|------------|
| Video | mp4, webm, mov, mkv, avi |
| Audio | mp3, m4a, wav |
| Testo | txt, vtt, srt (salta FFmpeg) |

### Limiti

| Parametro | Valore | Note |
|-----------|--------|------|
| `MAX_INPUT_BYTES` | 2 GB | File sorgente max |
| `MAX_API_UPLOAD_BYTES` | 3 MB | Per singola richiesta transcribe |
| `SEGMENT_SECONDS` | 90 s | Split WAV (~2,9 MB/chunk a 16 kHz mono) |
| Chunk max per video | 120 | ~3 ore di audio |
| FFmpeg core | 0.12.6 | Self-hosted `/ffmpeg/ffmpeg-core.js` + `.wasm` |
| Timeout load FFmpeg | 120 s | |

### Elaborazione FFmpeg

1. Se file audio ≤ 3 MB e non video → upload diretto.
2. Altrimenti: estrazione traccia `0:a:0?` → WAV **mono 16 kHz s16le**.
3. Se WAV &gt; 3 MB → segmentazione `-f segment -segment_time 90`.
4. Ogni chunk inviato sequenzialmente a `/transcribe`.
5. Parti unite con `mergeTranscriptParts()` (doppio newline).

### Header browser (COEP)

`next.config.ts` imposta `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` su:

- `/lean-event/*`
- `/_next/static/chunks/*`

Necessario per `SharedArrayBuffer` usato da FFmpeg.wasm.

---

## 8. Pipeline OpenAI (server)

**File:** `lib/lean-event/leonardo-processor.ts`

### 8.1 Trascrizione (Whisper)

| Parametro | Valore |
|-----------|--------|
| Endpoint | `https://api.openai.com/v1/audio/transcriptions` |
| Modello default | `whisper-1` (`OPENAI_TRANSCRIPTION_MODEL`) |
| Lingua | `it` (fissa) |
| Limite segmento server | 24 MB (OpenAI); i chunk arrivano già ≤ 3 MB |
| Min bytes | 512 |
| Normalizzazione MIME | `lib/lean-event/audio-upload.ts` |
| Pulizia output | `lib/lean-event/transcription-cleanup.ts` (rimozione hallucination Whisper: “sottotitoli amara.org”, “grazie per aver guardato”, ecc.) |

### 8.2 Strutturazione (Chat Completions)

| Parametro | Valore |
|-----------|--------|
| Endpoint | `https://api.openai.com/v1/chat/completions` |
| Modello default | `gpt-4.1-mini` (`OPENAI_STRUCTURING_MODEL`) |
| `response_format` | `{ type: "json_object" }` |
| `temperature` | 0.2 |
| Segmentazione testo | max **9000 caratteri** per segmento, split su paragrafi |
| Parallelismo | **3 segmenti** contemporanei (`mapWithConcurrency`) |
| Merge parziali | `mergeStructuredPartials()` — array concatenati, oggetti merged |

### 8.3 Prompt e template

**File configurazione:** `data/lean-event/prompts.json`

| Chiave | Contenuto |
|--------|-----------|
| `templates[]` | 3 system prompt per tipo riunione |
| `schemaInstructions` | Schema JSON obbligatorio per l’output strutturato |
| `documentGuidelines` | Regole redazione verbale dettagliato, sintetico, keywords |
| `emailFollowupInstructions` | Template email post-riunione |

**Tipi riunione** (`data/lean-event/config.json`):

| `meetingType` | Label UI | Template prompt |
|---------------|----------|-----------------|
| `client_meeting` | Riunione cliente | Segretario direzionale senior, tono corporate |
| `scientific_committee` | Comitato scientifico | Linguaggio formale, decisioni, rischi, no invenzioni cliniche |
| `internal_meeting` | Riunione interna | Office manager, focus task/scadenze/actionable |

**Contesto inviato a OpenAI per ogni segmento:**

```
Titolo, Cliente, Organizzazione, Data, Tipo, Partecipanti, Moderatore, Segretario, Note
+ segmento N/M della trascrizione
```

### 8.4 Compaction keywords

**File:** `lib/lean-event/keyword-compaction.ts`

Limiti post-processing (deduplica case-insensitive, varianti prefix):

| Gruppo | Max voci |
|--------|----------|
| keywords | 10 |
| topics | 6 |
| people | 8 |
| companies | 6 |
| software | 4 |
| projects | 5 |
| recurring_themes | 5 |

---

## 9. Documenti generati

**File rendering:** `lib/lean-event/document-renderer.ts`

| ID documento | Label UI | Contenuto |
|--------------|----------|-----------|
| `integral_transcript` | Trascrizione integrale | Testo completo + speaker |
| `detailed_minutes` | Verbale dettagliato | Prosa: introduzione, sintesi, sviluppo per argomento, allegato operativo |
| `synthetic_minutes` | Verbale sintetico | Riassunto + elenchi decisioni/azioni |
| `keywords_topics` | Keywords & Topics | Tag compattati per categoria |
| `executive_report` | Executive Report | Decisioni, opportunità, rischi, priorità |
| `action_plan` | Piano d'azione | Tabella attività/responsabile/scadenza/stato |
| `email_followup` | Email di follow-up | Oggetto + corpo email professionale |

**Formato export:** HTML wrappato (`wrapWordHtml`) con estensione `.doc` — apribile in Microsoft Word.  
**Branding documenti:** footer “Powered by Lean.Agent.AI”.

---

## 10. Variabili d'ambiente

| Variabile | Obbligatoria | Descrizione |
|-----------|--------------|-------------|
| `LEAN_EVENT_SESSION_SECRET` | Sì | Firma cookie sessione |
| `LEAN_EVENT_TENANTS_JSON` | Sì (prod) | JSON tenant/utenti/moduli |
| `OPENAI_API_KEY` | Sì | Trascrizione + strutturazione |
| `OPENAI_TRANSCRIPTION_MODEL` | No | Default `whisper-1` |
| `OPENAI_STRUCTURING_MODEL` | No | Default `gpt-4.1-mini` |
| `BLOB_READ_WRITE_TOKEN` | Sì (prod) | Persistenza workspace |
| `NEXT_PUBLIC_SITE_URL` | Sì | URL canonico (es. `https://demo.leanme.it`) |
| `LEAN_EVENT_DATA_DIR` | No (locale) | Default `.lean-event-data` |

Template: `.env.example`

---

## 11. Sicurezza e audit

- **Auth:** email/password o token URL (`/lean-event/login?token=...`)
- **Session cookie:** `withSessionCookie()` su NextResponse
- **RBAC:** modulo `leonardo` in `tenant.modules[]`
- **Audit log (locale):** `.lean-event-data/audit/{tenantId}/events.jsonl`
- **Audit log (Vercel):** stdout prefisso `leanyou_audit` → Vercel Logs
- **Eventi workspace:** `workspace_create`, `workspace_update`, `workspace_process_start/complete/failed`

---

## 12. Vincoli Vercel (produzione)

| Vincolo | Valore | Mitigazione implementata |
|---------|--------|--------------------------|
| Request body API | 4,5 MB | Chunk audio 3 MB max |
| Function timeout default | 60 s | `maxDuration = 300` su `/process`, `120` su `/transcribe` |
| Filesystem | Effimero | Vercel Blob per workspace |
| FFmpeg | Non disponibile server-side | FFmpeg.wasm nel browser |

**Piano Vercel:** `maxDuration = 300` richiede **Pro** (Hobby max 10 s non compatibile con generazione verbali lunghe).

---

## 13. Struttura file sorgente (generazione verbali)

```
app/
  leanyou/[tenantSlug]/leonardo/          # Pagine UI
  api/lean-event/workspaces/                 # CRUD workspace
  api/lean-event/workspaces/[id]/transcribe # Whisper
  api/lean-event/workspaces/[id]/process    # Generazione verbali

components/lean-event/
  LeonardoWorkspaceDetail.tsx             # Orchestrazione client (upload → transcribe → process)
  LeonardoWorkspaceForm.tsx
  LeonardoWorkspaceList.tsx
  LeonardoWorkspaceMetadataForm.tsx

lib/lean-event/
  ffmpeg-client.ts                        # Preparazione audio browser
  leonardo-processor.ts                   # Whisper + Chat Completions
  document-renderer.ts                    # HTML documenti
  upload-payload.ts                       # Limiti upload / base64
  transcription-cleanup.ts                # Pulizia trascrizione
  transcription-merge.ts                  # Merge chunk
  keyword-compaction.ts                   # Deduplica keywords
  audio-upload.ts                         # Normalizzazione MIME audio
  openai-multipart.ts                     # Multipart Whisper
  workspace-storage.ts                    # Astrazione Blob/filesystem
  workspace-blob-storage.ts               # Vercel Blob

data/lean-event/
  config.json                             # Tipi riunione, tipi documento, nav
  prompts.json                            # Prompt OpenAI (modificabile senza deploy codice*)

public/ffmpeg/
  ffmpeg-core.js                          # Copiato in build (npm run copy:ffmpeg)
  ffmpeg-core.wasm
```

\* I prompt richiedono comunque redeploy se serviti come import statico; in v1 sono bundled a build time.

---

## 14. Input utente e UX

### Metadati workspace (form)

- Titolo, cliente, organizzazione, data (gg/mm/aaaa), tipo riunione, tag, partecipanti, moderatore, segretario, note.

### Sorgenti contenuto

1. **File media** — video/audio (pipeline FFmpeg + Whisper)
2. **Informazioni testuali** — textarea integrativa
3. **Combinazione** — video + note unite con separatore `---`

### Stati UI durante elaborazione

| Stage | Messaggio esempio |
|-------|-------------------|
| loading | Download motore audio (~30 MB) |
| extracting | Estrazione audio dal video (WAV 16 kHz) |
| splitting | Suddivisione audio in parti da ~90 secondi |
| ready | Trascrizione parte N/M… |
| ready | Salvataggio trascrizione… |
| ready | Generazione verbali e documenti (può richiedere alcuni minuti) |

### Retry

Se la generazione verbali fallisce (timeout 504): la **trascrizione resta salvata** — l’utente può ripremere «Genera verbali» senza ricaricare il video.

---

## 15. Performance osservata (produzione)

**Ambiente:** `demo.leanme.it`, tenant I&C, deploy post-fix chunk + maxDuration (commit `65bfd23`).

| Metrica | Valore |
|---------|--------|
| Tempo end-to-end tipico | ~10 minuti |
| Tempo end-to-end precedente (con failure) | ~20 min + errore timeout |

Dipende da: durata video, numero chunk, lunghezza trascrizione, numero segmenti OpenAI.

---

## 16. Limitazioni note e roadmap

| Limitazione | Stato | Prossimo step possibile |
|-------------|-------|-------------------------|
| FFmpeg solo browser | v1 | Job server-side con Inngest + storage temporaneo |
| Export `.doc` HTML, non DOCX nativo | v1 | Libreria DOCX |
| Riunioni molto lunghe (&gt;3 h audio) | Limite 120 chunk | Aumentare loop o segmenti più corti |
| Audit non persistente su Vercel | v1 | Postgres / Log Drain |
| Prompt bundled staticamente | v1 | Admin UI o Blob per prompts |
| Nessuna diarizzazione speaker automatica | v1 | Whisper verbose_json / modello diarization |

---

## 17. Commit di riferimento (fix produzione 2026-07)

| Commit | Contenuto |
|--------|-----------|
| `0549b76` | Chunk transcribe 3 MB (limite Vercel 4,5 MB) |
| `07efc25` | Self-host FFmpeg |
| `c929651` | Allineamento versioni FFmpeg + COEP chunks |
| `65bfd23` | maxDuration 300s, salvataggio transcript pre-process, parallelismo OpenAI ×3 |

---

## 18. Riferimenti interni

- Panoramica Lean Event: `docs/lean-event.md`
- Config UI: `data/lean-event/config.json`
- Prompt OpenAI: `data/lean-event/prompts.json`
- Env template: `.env.example`
- Script accesso tenant: `npm run lean-event:access`
- Sync Vercel env: `npm run lean-event:sync-vercel`

---

*Documento archivio — LeanMe / Lean Event · Leonardo Secretary Assistant · generazione verbali.*
