# LeanMe Event

Gemello di `leanme-site` — area Lean Event / Leonardo (eventi, verbali, rubrica).

> Fase attuale: clone funzionante con repo e deploy separati. La pulizia (solo eventi qui, solo sito pubblico in `leanme-site`) avverrà in un secondo momento.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Vercel deployment + Vercel Blob

## Sviluppo locale

```bash
npm install
copy .env.example .env.local   # Windows — poi compila i secret
npm run lean-event:access         # genera tenant locali
npm run dev
```

Apri [http://localhost:3012](http://localhost:3012) (porta **3012** — `leanme-site` resta su **3011**).

Login Lean Event: `/lean-event/login`

## Build

```bash
npm run build
npm start
```

## Deploy (GitHub + Vercel)

Progetto **separato** da `leanme-site`:

| | leanme-site | leanme-event |
|---|-------------|--------------|
| Dev | :3011 | :3012 |
| Produzione | demo.leanme.it | events.leanme.it |
| Repo | leanmesrls/leanme-site | leanmesrls/leanme-event |

Guida passo-passo: **`docs/deploy-leanme-event.md`** (Blob Store dedicato, env vars, dominio).

```powershell
gh repo create leanmesrls/leanme-event --private --source=. --remote=origin --push
npx vercel login
npx vercel link
npm run lean-event:sync-vercel -- --deploy
```
