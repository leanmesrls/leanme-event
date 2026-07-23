# Architecture Overview

```
Control Plane DB
  Tenant Registry · provisioning · module catalog · platform audit · job metadata

Tenant A DB + Blob A
Tenant B DB + Blob B

App (Next.js)
  → Auth
  → Tenant Registry
  → DB Resolver / Storage Resolver
  → Core | Modules (via contracts)
  → AI Gateway → providers
  → Domain Events
  → Jobs contract → Inngest
```

Hub: `/lean-event/{tenantSlug}`  
API: `/api/v1/lean-event/*`, `/api/v1/platform/*`
