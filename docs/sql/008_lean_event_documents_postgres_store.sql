-- Lean.Event · Document store on Postgres (no Object Storage runtime target)
-- Versione: 2026-07-22
-- Apply: npm run lean-event:apply-neon-008
-- Fonte: docs/design/lean-event-storage-architecture-correction-plan.md
-- NON modifica tabelle dominio tipizzate (events/contacts/…).

-- A) Metadati documento — nessun BYTEA
ALTER TABLE lean_event_documents
  ALTER COLUMN blob_path DROP NOT NULL;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lean_event_documents
  ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'standard';

COMMENT ON TABLE lean_event_documents IS
  'Document identity/classification/links/metadata only. Binary lives in chunks.';

-- B) Versioni immutabili — nessun BYTEA
CREATE TABLE IF NOT EXISTS lean_event_document_versions (
  tenant_id           TEXT NOT NULL,
  id                  TEXT NOT NULL,
  document_id         TEXT NOT NULL,
  version             INT NOT NULL CHECK (version >= 1),
  filename            TEXT NOT NULL,
  mime                TEXT NOT NULL,
  bytes               BIGINT NOT NULL CHECK (bytes >= 0),
  sha256              TEXT NOT NULL,
  compression         TEXT NOT NULL DEFAULT 'none'
                        CHECK (compression IN ('none', 'gzip')),
  chunk_count         INT NOT NULL CHECK (chunk_count >= 1),
  chunk_size          INT NOT NULL CHECK (chunk_size > 0),
  created_at          TIMESTAMPTZ NOT NULL,
  created_by          TEXT,
  source              TEXT NOT NULL DEFAULT 'upload'
                        CHECK (source IN ('upload', 'generated', 'migration', 'restore')),
  note                TEXT,
  audit_event_id      BIGINT,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, document_id, version),
  CONSTRAINT fk_doc_version_document
    FOREIGN KEY (tenant_id, document_id)
    REFERENCES lean_event_documents (tenant_id, id)
    ON DELETE RESTRICT
);

COMMENT ON TABLE lean_event_document_versions IS
  'Immutable version descriptors. No binary payload. Append-only.';

-- C) Chunk binari — unica sede del file
CREATE TABLE IF NOT EXISTS lean_event_document_chunks (
  tenant_id           TEXT NOT NULL,
  version_id          TEXT NOT NULL,
  chunk_index         INT NOT NULL CHECK (chunk_index >= 0),
  bytes               INT NOT NULL CHECK (bytes > 0),
  sha256              TEXT NOT NULL,
  payload             BYTEA NOT NULL,
  PRIMARY KEY (tenant_id, version_id, chunk_index),
  CONSTRAINT fk_doc_chunk_version
    FOREIGN KEY (tenant_id, version_id)
    REFERENCES lean_event_document_versions (tenant_id, id)
    ON DELETE RESTRICT
);

COMMENT ON TABLE lean_event_document_chunks IS
  'Binary file chunks only. Deterministic order by chunk_index.';

-- D) Policy per kind
CREATE TABLE IF NOT EXISTS lean_event_document_kind_policies (
  tenant_id              TEXT NOT NULL,
  kind                   TEXT NOT NULL,
  retention_class        TEXT NOT NULL DEFAULT 'standard',
  soft_delete_days       INT,
  allow_auto_purge       BOOLEAN NOT NULL DEFAULT TRUE,
  require_download_audit BOOLEAN NOT NULL DEFAULT FALSE,
  allow_preview          BOOLEAN NOT NULL DEFAULT TRUE,
  max_versions_keep      INT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, kind)
);

-- E) Ledger migrazione Blob → Postgres (cutover; non rimuovere Blob finché gate chiusi)
CREATE TABLE IF NOT EXISTS lean_event_blob_migration_ledger (
  tenant_id     TEXT NOT NULL,
  legacy_path   TEXT NOT NULL,
  document_id   TEXT,
  version_id    TEXT,
  sha256        TEXT,
  bytes         BIGINT,
  status        TEXT NOT NULL CHECK (status IN ('pending','done','failed','skipped')),
  error         TEXT,
  migrated_at   TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, legacy_path)
);

-- F) Indici
CREATE INDEX IF NOT EXISTS idx_lean_event_documents_kind_status
  ON lean_event_documents (tenant_id, kind, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_legal_hold
  ON lean_event_documents (tenant_id)
  WHERE legal_hold = TRUE;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_purge
  ON lean_event_documents (tenant_id, purge_after)
  WHERE deleted_at IS NOT NULL AND legal_hold = FALSE;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_sha256
  ON lean_event_documents (tenant_id, sha256)
  WHERE deleted_at IS NULL AND sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_doc
  ON lean_event_document_versions (tenant_id, document_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_sha256
  ON lean_event_document_versions (tenant_id, sha256);

CREATE INDEX IF NOT EXISTS idx_lean_event_doc_versions_created
  ON lean_event_document_versions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lean_event_blob_mig_status
  ON lean_event_blob_migration_ledger (tenant_id, status);

-- G) Immutability triggers (append-only versions/chunks)
-- Bypass only when lean_event.allow_doc_purge = on (set locally by purge function)
CREATE OR REPLACE FUNCTION lean_event_forbid_doc_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF current_setting('lean_event.allow_doc_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'lean_event_document_versions is append-only (immutable)';
END;
$fn$;

CREATE OR REPLACE FUNCTION lean_event_forbid_doc_chunk_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF current_setting('lean_event.allow_doc_purge', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'lean_event_document_chunks is append-only (immutable)';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_lean_event_doc_versions_immutable ON lean_event_document_versions;
CREATE TRIGGER trg_lean_event_doc_versions_immutable
  BEFORE UPDATE OR DELETE ON lean_event_document_versions
  FOR EACH ROW
  EXECUTE FUNCTION lean_event_forbid_doc_version_mutation();

DROP TRIGGER IF EXISTS trg_lean_event_doc_chunks_immutable ON lean_event_document_chunks;
CREATE TRIGGER trg_lean_event_doc_chunks_immutable
  BEFORE UPDATE OR DELETE ON lean_event_document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION lean_event_forbid_doc_chunk_mutation();

-- H) Controlled purge (bypasses immutability triggers; respects legal hold in app)
CREATE OR REPLACE FUNCTION lean_event_purge_document(p_tenant_id TEXT, p_document_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_legal_hold BOOLEAN;
  v_deleted_at TIMESTAMPTZ;
  v_purge_after TIMESTAMPTZ;
BEGIN
  SELECT legal_hold, deleted_at, purge_after
    INTO v_legal_hold, v_deleted_at, v_purge_after
  FROM lean_event_documents
  WHERE tenant_id = p_tenant_id AND id = p_document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_deleted_at IS NULL THEN
    RAISE EXCEPTION 'DOCUMENT_NOT_SOFT_DELETED';
  END IF;
  IF v_legal_hold IS TRUE THEN
    RAISE EXCEPTION 'DOCUMENT_LEGAL_HOLD';
  END IF;
  IF v_purge_after IS NOT NULL AND v_purge_after > now() THEN
    RAISE EXCEPTION 'DOCUMENT_PURGE_NOT_DUE';
  END IF;

  PERFORM set_config('lean_event.allow_doc_purge', 'on', true);

  DELETE FROM lean_event_document_chunks c
  USING lean_event_document_versions v
  WHERE c.tenant_id = p_tenant_id
    AND c.version_id = v.id
    AND v.tenant_id = p_tenant_id
    AND v.document_id = p_document_id;

  DELETE FROM lean_event_document_versions
  WHERE tenant_id = p_tenant_id AND document_id = p_document_id;

  DELETE FROM lean_event_documents
  WHERE tenant_id = p_tenant_id AND id = p_document_id;

  PERFORM set_config('lean_event.allow_doc_purge', 'off', true);
  RETURN TRUE;
END;
$fn$;

INSERT INTO lean_event_schema_meta (key, value)
VALUES ('documents_postgres_store', '008')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
