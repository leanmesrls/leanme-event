# Deploy leanme-event (GitHub + Vercel)

**Progetto gemello di `leanme-site`** — repo e deploy **separati**.  
**Non toccare** `leanme-site` (3011 / `demo.leanme.it`).

| Ambiente | URL |
|----------|-----|
| Dev locale | http://localhost:3012 |
| Produzione (target) | https://events.leanme.it |

---

**Cheatsheet comandi PowerShell + query Neon:** `docs/lean-event-ops-cheatsheet.md`

## 1. GitHub — `leanmesrls/leanme-event`

Repo privato sull’org **leanmesrls**, branch principale `master`.

```powershell
cd C:\Cursor\leanme-event

# Se il repo non esiste ancora su GitHub:
gh auth login
gh repo create leanmesrls/leanme-event --private --source=. --remote=origin --push

# Se il repo esiste già:
git remote add origin https://github.com/leanmesrls/leanme-event.git
git push -u origin master
```

---

## 2. Vercel — progetto dedicato

1. [Vercel Dashboard](https://vercel.com) → **Add New… → Project**
2. Import **leanmesrls/leanme-event** (GitHub collegato)
3. Framework: **Next.js** (auto-detect) — **obbligatorio**
4. Nome progetto consigliato: `leanme-event`
5. **Non** collegare lo stesso Blob Store di `leanme-site`

> **Importante:** se il Framework Preset è **Other**, il middleware Edge va in errore (`__dirname is not defined`) e le route restituiscono 404/500.  
> Vercel → Project Settings → General → **Framework Preset: Next.js**.  
> CLI: `npx vercel project update leanme-event --framework nextjs --auto-detect output-directory --auto-detect build-command`

### Blob Store dedicato

Vercel → **Storage** → **Create Store** → **Blob**  
Nome suggerito: `leanme-event-blob`  
Collega **solo** al progetto `leanme-event` → Vercel imposta `BLOB_READ_WRITE_TOKEN` in Production.

> Workspace Lean Event in produzione restano in `/tmp` (effimeri) senza Blob.

### Link CLI locale

```powershell
npx vercel login
npx vercel link
# Seleziona team LeanMe e progetto leanme-event
```

---

## 3. Environment Variables (Production)

| Variabile | Valore | Note |
|-----------|--------|------|
| `LEAN_EVENT_SESSION_SECRET` | da `.env.local` | **Stesso secret di leanme-site** finché i tenant condividono sessioni cross-deploy; ruota solo se necessario |
| `LEAN_EVENT_TENANTS_JSON` | sync da `tenants.json` | **Non rigenerare** con `lean-event:access` se non serve ruotare token |
| `OPENAI_API_KEY` | da `.env.local` | Leonardo |
| `NEXT_PUBLIC_SITE_URL` | `https://events.leanme.it` | URL canonico produzione |
| `BLOB_READ_WRITE_TOKEN` | auto da Blob Store | Store **dedicato**, non condiviso |

### Tenant JSON (senza rigenerare)

Copia `tenants.json` da `leanme-site` (stessi tenant, deploy separato):

```powershell
mkdir .lean-event-data -Force
Copy-Item C:\Cursor\leanme-site\.lean-event-data\tenants.json .lean-event-data\tenants.json
```

Sync su Vercel:

```powershell
npm run lean-event:sync-vercel
npm run lean-event:sync-vercel -- --deploy
```

Fallback manuale: `npm run lean-event:vercel-env` → incolla in Vercel → Redeploy.

---

## 4. Dominio `events.leanme.it`

Vercel → Project `leanme-event` → **Settings → Domains** → Add `events.leanme.it`

DNS (registrar / Cloudflare):

| Tipo | Nome | Valore |
|------|------|--------|
| CNAME | `events` | `cname.vercel-dns.com` |

Dopo propagazione: verifica HTTPS e aggiorna `NEXT_PUBLIC_SITE_URL` se non già impostato.

---

## 5. Checklist post-deploy

- [ ] `/lean-event/login` — login email/password e token
- [ ] Leonardo — upload audio/video e generazione verbale
- [ ] Rubrica / sedi — CRUD e import Excel
- [ ] Workspace persistenti (Blob dedicato, non `/tmp`)
- [ ] `robots.txt` esclude `/lean-event`

---

## 6. Fase B — Neon Postgres

Vedi `docs/lean-event-data-resilience.md`. Postgres sostituirà il JSON per entità operative; Blob resta per file grandi.

**Ordine:** deploy funzionante con JSON + Blob dedicato → migrazione Neon in sprint dedicato.

---

## Separazione da leanme-site

| | leanme-site | leanme-event |
|---|-------------|--------------|
| Porta dev | 3011 | 3012 |
| Repo | leanmesrls/leanme-site | leanmesrls/leanme-event |
| Dominio | demo.leanme.it | events.leanme.it |
| Blob Store | dedicato sito | dedicato eventi |
| Scope futuro | Sito pubblico | Solo Lean Event / Leonardo |
