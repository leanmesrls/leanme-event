-- Lean Event · Schema Neon Postgres (Fase B)
-- Versione: 2026-07-15
-- Non eseguito automaticamente: applicare a mano / script dopo creazione DB Neon.
-- Source of truth documentale: docs/leanyou-data-resilience.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipi entità allineati a LeanEventManagedEntityType (+ link fornitore evento)
-- ---------------------------------------------------------------------------
-- event | contact | supplier | venue | assignment | workspace | event_supplier_link

CREATE TABLE IF NOT EXISTS lean_event_entities (
  id            TEXT NOT NULL,
  tenant_id     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  revision      INT NOT NULL DEFAULT 1,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,
  created_by    TEXT,
  updated_by    TEXT,
  deleted_at    TIMESTAMPTZ,
  deleted_by    TEXT,
  purge_after   TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, entity_type, id)
);

CREATE INDEX IF NOT EXISTS idx_lean_event_entities_tenant_type
  ON lean_event_entities (tenant_id, entity_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_entities_trash
  ON lean_event_entities (tenant_id, purge_after)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_entities_updated
  ON lean_event_entities (tenant_id, entity_type, updated_at DESC);

-- Indici di ricerca frequenti (estratti da payload)
CREATE INDEX IF NOT EXISTS idx_lean_event_events_linked
  ON lean_event_entities ((payload->>'linkedEventId'))
  WHERE entity_type = 'workspace' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_assignments_event
  ON lean_event_entities ((payload->>'eventId'))
  WHERE entity_type = 'assignment' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_entity_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  revision        INT NOT NULL,
  snapshot        JSONB NOT NULL,
  changed_by      TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary  TEXT,
  UNIQUE (tenant_id, entity_type, entity_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_lean_event_versions_lookup
  ON lean_event_entity_versions (tenant_id, entity_type, entity_id, revision DESC);

-- Presence (Fase D — tabella creata ora, usage opzionale)
CREATE TABLE IF NOT EXISTS lean_event_entity_presence (
  tenant_id     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  user_label    TEXT,
  section       TEXT,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lean_event_presence_ttl
  ON lean_event_entity_presence (last_seen_at);
