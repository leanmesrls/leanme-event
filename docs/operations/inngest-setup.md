# Inngest setup (Lean.Event)

## Local env

Required in `.env.local`:

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

App client id: `lean-event` (`core/infrastructure/jobs/inngest-client.ts`).  
Serve endpoint: `/api/v1/platform/inngest`.

## Sync with Inngest Cloud

1. Start the app (`npm run dev` → http://localhost:3012).
2. Verify endpoint responds (not 500):  
   `http://localhost:3012/api/v1/platform/inngest`
3. In [Inngest Dashboard](https://app.inngest.com) → your app → **Sync** / **Manage App**.
4. Set the app URL to:  
   `http://localhost:3012/api/v1/platform/inngest` (local)  
   or `https://events.leanme.it/api/v1/platform/inngest` (production).
5. Confirm functions appear (at least `lean-event-job-runner`).

Alternatively for local-only development:

```powershell
npx inngest-cli@latest dev -u http://localhost:3012/api/v1/platform/inngest
```

## SDK note

Package `inngest@4` uses:

```ts
inngest.createFunction(
  { id: "...", triggers: { event: "lean-event/job.*" } },
  async ({ event, step }) => { /* ... */ }
);
```

## Verify keys (no secret print)

```powershell
node --env-file=.env.local -e "console.log('EVENT='+(process.env.INNGEST_EVENT_KEY?'SET':'MISSING')); console.log('SIGN='+(process.env.INNGEST_SIGNING_KEY?'SET':'MISSING'))"
```
