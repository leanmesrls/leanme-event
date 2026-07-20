# LeanMe Event

Piattaforma **LeanEvent** (area riservata clienti): eventi, rubrica, verbali AI, Leonardo.

Il sito pubblico marketing vive nel repo separato `leanme-site`.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Vercel + Neon Postgres + Vercel Blob

## Sviluppo locale

```bash
npm install
copy .env.example .env.local   # Windows — poi compila i secret
npm run lean-event:access         # genera tenant locali
npm run dev
```

Apri [http://localhost:3012](http://localhost:3012) (porta **3012** — `leanme-site` resta su **3011**).

Entry: `/` e `/lean-event` → login. Dopo accesso: `/lean-event/{tenant}`

## Build

```bash
npm run build
npm start
```

## Deploy

| | leanme-site | leanme-event |
|---|-------------|--------------|
| Dev | :3011 | :3012 |
| Produzione | demo.leanme.it / leanme.it | event.leanme.it |
| Repo | leanmesrls/leanme-site | leanmesrls/leanme-event |

Guida: **`docs/deploy-leanme-event.md`**.

```powershell
npx vercel login
npx vercel link
npm run lean-event:sync-vercel -- --deploy
```
