# ADR: Database per tenant

## Context

Lean.Event must ship as an enterprise product with definitive architecture.

## Problem

Ambiguous or provisional technical choices would force structural rewrites after customers are live.

## Decision

Each customer gets a dedicated Postgres database; tenant_id is defense-in-depth only.

### Neon project convention (frozen 2026-07-22)

- The **existing Lean.Event Neon project** is the official project. Do not create additional Neon projects without an explicit architectural decision (Enterprise exception only).
- **`neondb`** is solely the **cutover/migration source** for existing data. It is not the Control Plane and not the long-term runtime SoT.
- **`lean_event_control_plane`** is the **only** Control Plane database.
- Every tenant database is named **`lean_event_t_<slug>`** and lives in the **same** Neon project (unless a future Enterprise decision mandates a dedicated Neon project per customer).
- Provisioning rule: reuse existing compatible resources; create only what is missing; verify each step before the next.

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
