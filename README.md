# LeanMe Event

Gemello di `leanme-site` — area LeanYou / Leonardo (eventi, verbali, rubrica).

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
npm run leanyou:access         # genera tenant locali
npm run dev
```

Apri [http://localhost:3012](http://localhost:3012) (porta **3012** — `leanme-site` resta su **3011**).

Login LeanYou: `/leanyou/login`

## Build

```bash
npm run build
npm start
```

## Deploy Vercel

Progetto Vercel **separato** da `leanme-site`. Blob Store dedicato. Vedi `docs/leanyou.md`.
