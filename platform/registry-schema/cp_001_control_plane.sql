-- Lean.Event Control Plane schema (no customer operational data)

CREATE TABLE IF NOT EXISTS lean_event_tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'suspended', 'archived')),
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  database_ref TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  secrets_ref TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '0',
  migration_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (migration_status IN ('pending', 'up_to_date', 'failed', 'migrating')),
  modules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  commercial_pack TEXT NOT NULL DEFAULT 'CORE'
    CHECK (commercial_pack IN ('CORE', 'PRO', 'AI', 'PLATINUM')),
  ai_provider TEXT NOT NULL DEFAULT 'openai',
  assistant_profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  provisioning_status TEXT NOT NULL DEFAULT 'pending',
  backup_status TEXT NOT NULL DEFAULT 'unknown',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lean_event_platform_jobs (
  job_id TEXT PRIMARY KEY,
  provider_job_id TEXT,
  type TEXT NOT NULL,
  tenant_id TEXT REFERENCES lean_event_tenants(id),
  status TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  error TEXT,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lean_event_platform_audit (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT,
  action TEXT NOT NULL,
  tenant_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lean_event_module_catalog (
  id TEXT PRIMARY KEY,
  technical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL,
  manifest_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lean_event_schema_migrations_platform (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
