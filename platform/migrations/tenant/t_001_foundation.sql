-- Canonical tenant schema foundation (Lean.Event v1.0)
-- Applied per tenant database. No commercial agent names in object identifiers.

CREATE TABLE IF NOT EXISTS lean_event_schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lean_event_domain_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  actor TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lean_event_domain_events_tenant_created
  ON lean_event_domain_events (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lean_event_domain_event_dead_letters (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  error TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
