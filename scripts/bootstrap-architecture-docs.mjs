/**
 * Creates hierarchical docs + ADR stubs for Lean.Event architecture v1.0.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const docs = join(root, "docs");

const dirs = [
  "design",
  "architecture",
  "modules",
  "database",
  "api",
  "deployment",
  "operations",
  "security",
  "adr",
  "runbooks",
  "roadmap",
  "legacy",
];

for (const dir of dirs) {
  mkdirSync(join(docs, dir), { recursive: true });
}

function write(rel, content) {
  const path = join(docs, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
  console.log("wrote", rel);
}

write(
  "README.md",
  `# Lean.Event — Start here

**Product:** Lean.Event  
**Repo:** leanme-event  
**Dev:** http://localhost:3012  
**Prod target:** https://events.leanme.it  

## Read in this order

1. [Architecture Mandate](./design/lean-event-architecture-mandate.md)
2. [Design Principles](./design/lean-event-design-principles.md)
3. [Naming Conventions](./design/naming-conventions.md)
4. [Architecture Overview](./architecture/overview.md)
5. [ADR index](./adr/README.md)
6. Module docs under \`modules/\`
7. Operations / runbooks

## Structure

| Path | Content |
|------|---------|
| \`design/\` | Constitution, principles, naming, reviews |
| \`architecture/\` | System design |
| \`modules/\` | Per-module docs |
| \`database/\` | Control Plane + tenant DBs |
| \`api/\` | Versioned API contracts |
| \`deployment/\` | Environments, Vercel, build |
| \`operations/\` | Human ops procedures |
| \`security/\` | Security model |
| \`adr/\` | Architecture Decision Records |
| \`runbooks/\` | Incident / DR procedures |
| \`roadmap/\` | Product features only (not architecture migration) |
| \`legacy/\` | Temporary cutover notes (must expire) |

## Site LeanMe docs

Site content lives outside this product tree (see \`docs-site/\` if present). Do not mix brand-site pages into Lean.Event product docs.

## Safety baseline (2026-07-22)

- Backup: \`.lean-event-data/architecture-backups/20260722-145925/\`
- Git tag: \`safety/pre-architecture-v1-20260722-145925\`
`
);

write(
  "design/lean-event-design-principles.md",
  `# Lean.Event — Design Principles (Technical Constitution)

1. Maintainable without Cursor or any specific IDE.
2. Repository holds all critical knowledge.
3. Documentation is the technical contract.
4. Prefer clarity over cleverness.
5. No magic; explicit resolvers and contracts.
6. Single responsibility; small Core.
7. Modules independent; Core never imports module internals.
8. Commercial agent names are never technical identifiers.
9. Fail-closed for tenant/DB/storage/AI resolution.
10. Five-year test: would a new developer understand and extend this with 500 tenants?

If a request violates these principles, stop and propose an alternative.
`
);

write(
  "design/naming-conventions.md",
  `# Lean.Event — Naming Conventions

| Context | Form | Example |
|---------|------|---------|
| Product display | Lean.Event | UI copy, docs |
| Paths / packages | lean-event | \`/lean-event/{slug}\`, \`components/lean-event\` |
| Functions / vars | leanEvent | \`leanEventHubPath\` |
| Types / components | LeanEvent | \`LeanEventShell\` |
| Env / constants | LEAN_EVENT | \`LEAN_EVENT_SESSION_SECRET\` |
| SQL | lean_event_ | \`lean_event_events\` |
| Domain event type | TenantEvent | TypeScript event entity |

## Forbidden in technical architecture

- \`Leonardo\`, \`LeanYou\`, \`leanyou\` as product identifiers
- Commercial agent names in folders, routes, APIs, tables, types, env keys, job types

## AI technical IDs (examples)

- \`meeting-minutes-assistant\`
- \`customer-support-assistant\`
- \`marketing-content-assistant\`
- \`graphic-content-assistant\`

Display names are configured in Assistant Registry only.
`
);

write(
  "design/architecture-review.md",
  `# Architecture Review Procedure

At every significant milestone (v1.0, v1.5, v2.0, …):

1. Core still small and coherent?
2. Modules independent; no illegal Core→module imports?
3. No commercial agent names in technical layer?
4. Tenant DB + storage isolation intact?
5. Resolvers fail-closed?
6. Docs aligned with code?
7. Technical debt logged?
8. Security / DR / backups verified?

Outcome recorded under \`docs/design/reviews/\`.
`
);

write(
  "architecture/overview.md",
  `# Architecture Overview

\`\`\`
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
\`\`\`

Hub: \`/lean-event/{tenantSlug}\`  
API: \`/api/v1/lean-event/*\`, \`/api/v1/platform/*\`
`
);

const adrs = [
  ["0001-product-name-lean-event.md", "Product name Lean.Event", "Adopt Lean.Event as sole product name with standardized technical forms."],
  ["0002-eliminate-legacy-product-names.md", "Eliminate legacy product names", "Remove Leonardo/LeanYou as product identifiers from runtime and structure."],
  ["0003-agent-commercial-names-independent.md", "Independence from commercial agent names", "Use technical assistant profile IDs; commercial names only in registry display config."],
  ["0004-control-plane.md", "Control Plane", "Dedicated control-plane database for registry/provisioning/licensing; no customer operational data."],
  ["0005-database-per-tenant.md", "Database per tenant", "Each customer gets a dedicated Postgres database; tenant_id is defense-in-depth only."],
  ["0006-storage-per-tenant.md", "Storage per tenant", "Each customer gets dedicated Blob credentials/store; prefix-on-shared-store is not primary isolation."],
  ["0007-tenant-registry.md", "Tenant Registry", "Central registry resolves DB/storage/modules/AI for every request."],
  ["0008-database-connection-resolver.md", "Database Connection Resolver", "All tenant SQL goes through one typed resolver; fail-closed."],
  ["0009-core-vs-modules.md", "Core vs modules", "Small Core; modules communicate via public contracts only."],
  ["0010-module-registry-and-packs.md", "Module Registry and packs", "Central pack→module mapping; guards on UI and API."],
  ["0011-ai-gateway.md", "AI Gateway", "Single AI entry; OpenAI first provider behind gateway."],
  ["0012-assistant-registry.md", "Assistant Registry", "Neutral technical profiles with configurable display names."],
  ["0013-domain-events.md", "Domain Events", "In-app versioned domain events with idempotency and audit."],
  ["0014-versioned-apis.md", "Versioned APIs", "Official APIs under /api/v1/lean-event and /api/v1/platform."],
  ["0015-realtime-confined-to-connect.md", "Realtime confined to Connect", "No websocket in general admin; Connect module only."],
  ["0016-async-jobs-inngest.md", "Async jobs with Inngest", "Inngest is the execution engine; domain uses Jobs contract only."],
  ["0017-build-information.md", "Build Information", "Admin page with real build/schema/module/AI metadata, no secrets."],
  ["0018-backup-restore-dr.md", "Backup, restore, DR", "Per-tenant backup/restore tested before commercialization."],
  ["0019-documentation-as-contract.md", "Documentation as contract", "Docs updated with every structural change; hierarchical docs tree."],
  ["0020-tooling-independence.md", "Independence from Cursor/tools", "Knowledge lives in repo; any IDE can maintain the product."],
];

let adrIndex = `# Architecture Decision Records\n\n`;
for (const [file, title, decision] of adrs) {
  adrIndex += `- [${file.replace(".md", "")} — ${title}](./${file})\n`;
  write(
    `adr/${file}`,
    `# ADR: ${title}

## Context

Lean.Event must ship as an enterprise product with definitive architecture.

## Problem

Ambiguous or provisional technical choices would force structural rewrites after customers are live.

## Decision

${decision}

## Motivation

Commercialization, transferability, security isolation, and long-term maintainability.

## Alternatives considered

- Shared multi-tenant DB with tenant_id only — rejected for isolation/export/DR.
- Keeping commercial agent names in routes/code — rejected for white-label and renameability.
- Custom job queue instead of Inngest — rejected as temporary duplication of an execution engine.
- Permanent legacy aliases — rejected as dual architecture.

## Consequences

- Higher upfront implementation cost.
- Clearer ops model per tenant.
- Stricter CI gates on naming and isolation.

## Risks

- Neon/Vercel provisioning complexity — mitigated with scripts + runbooks.
- Cutover data risk — mitigated with backups, verify counts, restore tests.

## Verification

- Automated tests for isolation, resolvers, AI gateway, naming CI gates.
- Architecture Review at milestone completion.
`
  );
}

write("adr/README.md", adrIndex);

const moduleDocs = [
  ["ai.md", "AI module", "AI Gateway, providers, Assistant Registry, meeting-minutes and other capabilities."],
  ["events.md", "Events (Core)", "TenantEvent lifecycle, assignments, hotel/logistics sections."],
  ["contacts.md", "Contacts (Core)", "Global contacts registry per tenant."],
  ["documents.md", "Documents (Core)", "Document registry + storage resolver."],
];

for (const [file, title, body] of moduleDocs) {
  write(
    `modules/${file}`,
    `# ${title}

## Responsibility

${body}

## Dependencies

Core infrastructure resolvers; contracts only.

## Database

Tenant database (never Control Plane for operational rows).

## API

\`/api/v1/lean-event/...\`

## Domain events

See \`contracts/domain-events.ts\`.

## Related modules

See Module Registry.

## Roadmap

Feature delivery progressive; architecture foundations complete in v1.0.
`
  );
}

write(
  "database/control-plane.md",
  `# Control Plane Database

Holds Tenant Registry, provisioning state, module catalog, platform audit, job metadata (Inngest ids), health.

Never holds customer events/contacts/documents content.
`
);

write(
  "database/tenant.md",
  `# Tenant Database

One Postgres database per tenant. Canonical migrations in \`platform/migrations/tenant/\`.

\`tenant_id\` column remains as logical defense-in-depth.
`
);

write(
  "api/overview.md",
  `# API Overview

- Tenant product: \`/api/v1/lean-event/*\`
- Platform: \`/api/v1/platform/*\`
- AI functional namespaces: \`/api/v1/lean-event/ai/meeting-minutes\`, etc.
`
);

write(
  "deployment/environments.md",
  `# Environments

| Env | Notes |
|-----|-------|
| development | localhost:3012 |
| staging | optional |
| production | events.leanme.it |

Required env: \`LEAN_EVENT_CONTROL_PLANE_DATABASE_URL\`, \`LEAN_EVENT_SESSION_SECRET\`, Inngest keys, per-tenant secret refs.
`
);

write(
  "deployment/build-info.md",
  `# Build Information

UI: \`/lean-event/{tenantSlug}/sistema/informazioni-tecniche\`  
API: \`GET /api/v1/lean-event/system/build-info\`
`
);

write(
  "operations/human-ops.md",
  `# Human Operations

CLI scripts under \`scripts/\` for provision, migrate, backup, restore, export, health.

Critical ops require confirmation, audit, and documented recovery.
`
);

write(
  "security/overview.md",
  `# Security Overview

Fail-closed resolvers, least privilege, private documents, append-only audit, no legacy secret fallbacks.
`
);

write(
  "runbooks/disaster-recovery.md",
  `# Disaster Recovery Runbook

## Targets (initial)

- RPO: ≤ 24 hours (daily backup)
- RTO: ≤ 4 hours per tenant restore

## Steps

1. Identify tenant
2. Locate verified backup
3. Restore DB to isolated target
4. Restore storage
5. Verify counts + smoke
6. Switch registry refs
7. Audit outcome
`
);

write(
  "roadmap/product-features.md",
  `# Product feature roadmap

Architecture foundations are not listed here. This file tracks business features only (website, survey, connect, etc.).
`
);

write(
  "legacy/redirect-register.md",
  `# Legacy redirect register (temporary)

| From | To | Remove by |
|------|----|-----------|
| \`/leanyou/*\` | \`/lean-event/*\` | cutover + 14 days |
| \`/api/leanyou/*\` | \`/api/v1/lean-event/*\` | cutover + 14 days |

New code must never link to legacy paths.
`
);

write(
  "architecture/multi-tenant.md",
  `# Multi-tenant model

Infrastructure isolation: dedicated DB + dedicated storage per tenant.  
Application defense: \`tenant_id\` checks fail-closed.
`
);

write(
  "architecture/core.md",
  `# Core

Auth, tenant, users, events, contacts, documents, budget, finance, communications, lifecycle, security, infrastructure resolvers.
`
);

write(
  "architecture/modules.md",
  `# Modules

AI, website, participant-area, survey, badge, connect, marketplace — loaded via Module Registry manifests.
`
);

write(
  "architecture/security.md",
  `# Security architecture

See \`docs/security/overview.md\`.
`
);

// inventory pointer
const invSrc = join(
  root,
  ".lean-event-data/architecture-backups/20260722-145925/inventory/legacy-files.txt"
);
if (existsSync(invSrc)) {
  write(
    "legacy/inventory-20260722.md",
    `# Frozen legacy inventory (2026-07-22)

Source file list: \`.lean-event-data/architecture-backups/20260722-145925/inventory/legacy-files.txt\` (~302 paths).

Classification rules:

- Product legacy (\`leanyou\`, product \`Leonardo*\` components) → rename to Lean.Event
- Commercial agent display → Assistant Registry config only
- Technical AI → functional IDs (\`meeting-minutes-assistant\`, etc.)
`
  );
}

console.log("BOOTSTRAP_DOCS_OK");
