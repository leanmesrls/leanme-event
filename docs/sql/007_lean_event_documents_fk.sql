-- Lean Event · FK logiche documents → entità tipizzate (opzionale, NOT VALID)
-- Versione: 2026-07-21
-- Apply: npm run lean-event:apply-neon-007
-- Fonte: docs/lean-event-normalized-cutover.md
--
-- NOT VALID: non fallisce su orfani storici. Poi: VALIDATE CONSTRAINT dopo cleanup.

ALTER TABLE lean_event_documents
  DROP CONSTRAINT IF EXISTS fk_lean_event_documents_event;

ALTER TABLE lean_event_documents
  ADD CONSTRAINT fk_lean_event_documents_event
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES lean_event_events (tenant_id, id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE lean_event_documents
  DROP CONSTRAINT IF EXISTS fk_lean_event_documents_person;

ALTER TABLE lean_event_documents
  ADD CONSTRAINT fk_lean_event_documents_person
  FOREIGN KEY (tenant_id, person_id)
  REFERENCES lean_event_contacts (tenant_id, id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE lean_event_documents
  DROP CONSTRAINT IF EXISTS fk_lean_event_documents_supplier;

ALTER TABLE lean_event_documents
  ADD CONSTRAINT fk_lean_event_documents_supplier
  FOREIGN KEY (tenant_id, supplier_id)
  REFERENCES lean_event_suppliers (tenant_id, id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE lean_event_documents
  DROP CONSTRAINT IF EXISTS fk_lean_event_documents_workspace;

ALTER TABLE lean_event_documents
  ADD CONSTRAINT fk_lean_event_documents_workspace
  FOREIGN KEY (tenant_id, workspace_id)
  REFERENCES lean_event_workspaces (tenant_id, id)
  ON DELETE RESTRICT
  NOT VALID;

INSERT INTO lean_event_schema_meta (key, value)
VALUES ('documents_fk', '007')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
