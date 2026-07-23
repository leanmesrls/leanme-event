# ADR: Assistant Registry

## Context

Lean.Event must ship as an enterprise product with definitive architecture.

## Problem

Ambiguous or provisional technical choices would force structural rewrites after customers are live.

## Decision

Neutral technical profiles with configurable display names.

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
