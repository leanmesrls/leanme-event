-- Lean Event · Schema documenti + indici scala (Fase C / C+)
-- Versione: 2026-07-16
-- Applicare dopo 001_lean_event_schema.sql
-- Fonte: docs/lean-event-document-architecture.md

-- ---------------------------------------------------------------------------
-- Indice assignment per contatto "eventi di un contatto/docente" a scala
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_assignments_contact
  ON lean_event_entities ((payload->>'contactId'))
  WHERE entity_type = 'assignment' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Registry documenti (metadati Neon, binario su Blob)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lean_event_documents (
  id              TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  kind            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ready',
  -- ready | generating | failed | archived
  title           TEXT,
  filename        TEXT NOT NULL,
  mime            TEXT NOT NULL,
  bytes           BIGINT NOT NULL DEFAULT 0,
  sha256          TEXT,
  blob_path       TEXT NOT NULL,
  revision        INT NOT NULL DEFAULT 1,
  person_id       TEXT,
  event_id        TEXT,
  assignment_id   TEXT,
  supplier_id     TEXT,
  workspace_id    TEXT,
  created_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  created_by      TEXT,
  updated_by      TEXT,
  deleted_at      TIMESTAMPTZ,
  deleted_by      TEXT,
  purge_after     TIMESTAMPTZ,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_tenant_kind
  ON lean_event_documents (tenant_id, kind)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_person
  ON lean_event_documents (tenant_id, person_id)
  WHERE deleted_at IS NULL AND person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_event
  ON lean_event_documents (tenant_id, event_id)
  WHERE deleted_at IS NULL AND event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_assignment
  ON lean_event_documents (tenant_id, assignment_id)
  WHERE deleted_at IS NULL AND assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_updated
  ON lean_event_documents (tenant_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Audit append-only Fase C - chi ha toccato cosa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lean_event_audit_events (
  id              BIGSERIAL PRIMARY KEY,
  ts              TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id       TEXT,
  action          TEXT NOT NULL,
  user_id         TEXT,
  user_email      TEXT,
  resource_type   TEXT,
  resource_id     TEXT,
  detail          TEXT,
  ip              TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lean_event_audit_tenant_ts
  ON lean_event_audit_events (tenant_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_lean_event_audit_resource
  ON lean_event_audit_events (tenant_id, resource_type, resource_id, ts DESC);
