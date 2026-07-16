-- Lean Event · Indici scala + solidità documenti (post Fase C)
-- Versione: 2026-07-16
-- Applicare dopo 001 + 002
-- Fonte: docs/lean-event-document-architecture.md, integrity-status

-- ---------------------------------------------------------------------------
-- event_supplier_link: lista fornitori di un evento a scala
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_supplier_links_event
  ON lean_event_entities ((payload->>'eventId'))
  WHERE entity_type = 'event_supplier_link' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_supplier_links_supplier
  ON lean_event_entities ((payload->>'supplierId'))
  WHERE entity_type = 'event_supplier_link' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- event_chat: thread per evento
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_chat_event
  ON lean_event_entities ((payload->>'eventId'))
  WHERE entity_type = 'event_chat' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Contatti: lookup email (import / dedupe)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_contacts_email
  ON lean_event_entities ((lower(payload->>'email')))
  WHERE entity_type = 'contact' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Documenti: supplier / workspace / cestino
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_documents_supplier
  ON lean_event_documents (tenant_id, supplier_id)
  WHERE deleted_at IS NULL AND supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_workspace
  ON lean_event_documents (tenant_id, workspace_id)
  WHERE deleted_at IS NULL AND workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_documents_trash
  ON lean_event_documents (tenant_id, purge_after)
  WHERE deleted_at IS NOT NULL;
