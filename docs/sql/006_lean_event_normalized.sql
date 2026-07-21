-- Lean Event · Schema normalizzato (cutover totale da JSONB SoT)
-- Versione: 2026-07-21
-- Apply: npm run lean-event:apply-neon-006
-- Fonte: docs/lean-event-normalized-cutover.md
--
-- Convenzioni:
--   PK (tenant_id, id)
--   FK composite (tenant_id, …) ON DELETE RESTRICT
--   Soft delete: deleted_at IS NOT NULL (riga resta → FK valide)
--   Eccezione JSONB: solo workspaces.structured

-- ===========================================================================
-- 1. Anagrafiche (senza dipendenze dominio)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lean_event_venues (
  tenant_id         TEXT NOT NULL,
  id                TEXT NOT NULL,
  name              TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  city              TEXT NOT NULL DEFAULT '',
  province          TEXT NOT NULL DEFAULT '',
  region            TEXT,
  postal_code       TEXT NOT NULL DEFAULT '',
  country           TEXT,
  phone             TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  website           TEXT NOT NULL DEFAULT '',
  external_url      TEXT NOT NULL DEFAULT '',
  cover_image_url   TEXT NOT NULL DEFAULT '',
  star_category     TEXT NOT NULL DEFAULT '',
  internal_rating   TEXT NOT NULL DEFAULT '',
  internal_review   TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  revision          INT NOT NULL DEFAULT 1,
  created_by        TEXT,
  updated_by        TEXT,
  deleted_at        TIMESTAMPTZ,
  deleted_by        TEXT,
  purge_after       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_le_venues_tenant_updated
  ON lean_event_venues (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_contacts (
  tenant_id                 TEXT NOT NULL,
  id                        TEXT NOT NULL,
  vocative                  TEXT,
  honorific_title           TEXT,
  first_name                TEXT NOT NULL DEFAULT '',
  last_name                 TEXT NOT NULL DEFAULT '',
  email                     TEXT NOT NULL DEFAULT '',
  fiscal_code               TEXT,
  birth_date                TEXT,
  address                   TEXT,
  city                      TEXT,
  province                  TEXT,
  region                    TEXT,
  postal_code               TEXT,
  country                   TEXT,
  organization              TEXT NOT NULL DEFAULT '',
  organization_address      TEXT,
  organization_city         TEXT,
  organization_province     TEXT,
  organization_region       TEXT,
  organization_postal_code  TEXT,
  organization_country      TEXT,
  organization_role         TEXT,
  dietary_notes             TEXT,
  mobility_notes            TEXT,
  personal_requests         TEXT,
  notes                     TEXT NOT NULL DEFAULT '',
  revision                  INT NOT NULL DEFAULT 1,
  created_by                TEXT,
  updated_by                TEXT,
  deleted_at                TIMESTAMPTZ,
  deleted_by                TEXT,
  purge_after               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL,
  updated_at                TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_le_contacts_tenant_updated
  ON lean_event_contacts (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_le_contacts_email
  ON lean_event_contacts (tenant_id, lower(email))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_contact_emails (
  tenant_id   TEXT NOT NULL,
  contact_id  TEXT NOT NULL,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  address     TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, contact_id, id),
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_contact_phones (
  tenant_id   TEXT NOT NULL,
  contact_id  TEXT NOT NULL,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  number      TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, contact_id, id),
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_contact_tags (
  tenant_id   TEXT NOT NULL,
  contact_id  TEXT NOT NULL,
  tag         TEXT NOT NULL,
  PRIMARY KEY (tenant_id, contact_id, tag),
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_contact_privacy_consents (
  tenant_id   TEXT NOT NULL,
  contact_id  TEXT NOT NULL,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  granted     BOOLEAN NOT NULL DEFAULT false,
  granted_at  TEXT,
  PRIMARY KEY (tenant_id, contact_id, id),
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_suppliers (
  tenant_id       TEXT NOT NULL,
  id              TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  category_id     TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL DEFAULT '',
  province        TEXT NOT NULL DEFAULT '',
  region          TEXT,
  postal_code     TEXT,
  country         TEXT,
  vat_number      TEXT NOT NULL DEFAULT '',
  contact_person  TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  revision        INT NOT NULL DEFAULT 1,
  created_by      TEXT,
  updated_by      TEXT,
  deleted_at      TIMESTAMPTZ,
  deleted_by      TEXT,
  purge_after     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_le_suppliers_tenant_cat
  ON lean_event_suppliers (tenant_id, category_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_supplier_agreements (
  tenant_id      TEXT NOT NULL,
  supplier_id    TEXT NOT NULL,
  id             TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  kind           TEXT NOT NULL DEFAULT 'altro',
  document_date  TEXT NOT NULL DEFAULT '',
  file_name      TEXT NOT NULL DEFAULT '',
  file_url       TEXT NOT NULL DEFAULT '',
  mime_type      TEXT NOT NULL DEFAULT '',
  size_bytes     BIGINT NOT NULL DEFAULT 0,
  notes          TEXT NOT NULL DEFAULT '',
  uploaded_by    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, supplier_id, id),
  FOREIGN KEY (tenant_id, supplier_id)
    REFERENCES lean_event_suppliers (tenant_id, id) ON DELETE RESTRICT
);

-- ===========================================================================
-- 2. Eventi
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lean_event_events (
  tenant_id                   TEXT NOT NULL,
  id                          TEXT NOT NULL,
  created_by                  TEXT NOT NULL DEFAULT '',
  cdc                         TEXT NOT NULL DEFAULT '',
  title                       TEXT NOT NULL DEFAULT '',
  venue                       TEXT NOT NULL DEFAULT '',
  venue_id                    TEXT,
  venue_name                  TEXT,
  venue_address               TEXT,
  venue_city                  TEXT,
  venue_province              TEXT,
  venue_region                TEXT,
  venue_postal_code           TEXT,
  venue_country               TEXT,
  venue_is_online             BOOLEAN NOT NULL DEFAULT false,
  venue_online_url            TEXT,
  venue_notes                 TEXT,
  start_date                  TEXT NOT NULL DEFAULT '',
  end_date                    TEXT NOT NULL DEFAULT '',
  category_id                 TEXT NOT NULL DEFAULT '',
  health_area_id              TEXT,
  ecm_enabled                 BOOLEAN,
  ecm_modality                TEXT,
  formation_event_type_id     TEXT,
  formation_structure_name    TEXT,
  legacy_type                 TEXT,
  status                      TEXT NOT NULL DEFAULT 'draft',
  notes                       TEXT NOT NULL DEFAULT '',
  is_favorite                 BOOLEAN NOT NULL DEFAULT false,
  project_leader_user_id      TEXT,
  registration_paid           BOOLEAN,
  registration_refunds_enabled BOOLEAN,
  registration_refund_rules   TEXT NOT NULL DEFAULT '',
  revision                    INT NOT NULL DEFAULT 1,
  updated_by                  TEXT,
  deleted_at                  TIMESTAMPTZ,
  deleted_by                  TEXT,
  purge_after                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL,
  updated_at                  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, venue_id)
    REFERENCES lean_event_venues (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_le_events_tenant_updated
  ON lean_event_events (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_le_events_favorite
  ON lean_event_events (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL AND is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_le_events_start_date
  ON lean_event_events (tenant_id, start_date DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_event_project_managers (
  tenant_id   TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_id, user_id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_registration_fees (
  tenant_id   TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  amount      TEXT NOT NULL DEFAULT '',
  valid_from  TEXT NOT NULL DEFAULT '',
  valid_to    TEXT NOT NULL DEFAULT '',
  notes       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_sponsors (
  tenant_id          TEXT NOT NULL,
  event_id           TEXT NOT NULL,
  id                 TEXT NOT NULL,
  contact_id         TEXT,
  company_name       TEXT NOT NULL DEFAULT '',
  contact_name       TEXT,
  agreement_summary  TEXT,
  contract_ref       TEXT,
  sponsorship_type   TEXT,
  amount             TEXT,
  notes              TEXT,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_related (
  tenant_id                 TEXT NOT NULL,
  event_id                  TEXT NOT NULL,
  id                        TEXT NOT NULL,
  kind                      TEXT NOT NULL DEFAULT 'altro',
  title                     TEXT NOT NULL DEFAULT '',
  starts_at                 TEXT NOT NULL DEFAULT '',
  ends_at                   TEXT NOT NULL DEFAULT '',
  venue                     TEXT NOT NULL DEFAULT '',
  venue_id                  TEXT,
  notes                     TEXT NOT NULL DEFAULT '',
  companions_allowed        BOOLEAN NOT NULL DEFAULT false,
  max_companions_per_guest  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_program_sessions (
  tenant_id       TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  id              TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'session',
  day_date        TEXT,
  start_time      TEXT NOT NULL DEFAULT '',
  end_time        TEXT NOT NULL DEFAULT '',
  title           TEXT NOT NULL DEFAULT '',
  moderators      TEXT NOT NULL DEFAULT '',
  speakers        TEXT NOT NULL DEFAULT '',
  other_speakers  TEXT NOT NULL DEFAULT '',
  sort_order      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_ecm_grids (
  tenant_id                         TEXT NOT NULL,
  event_id                          TEXT NOT NULL,
  is_corporate_training_project     BOOLEAN,
  concerns_infant_nutrition         BOOLEAN,
  effective_duration_hours          INT,
  effective_duration_minutes        INT,
  formative_objective_code          INT,
  skills_technical_professional     TEXT NOT NULL DEFAULT '',
  skills_process                    TEXT NOT NULL DEFAULT '',
  skills_system                     TEXT NOT NULL DEFAULT '',
  workshop_inside_congress          BOOLEAN,
  interactive_residential_training  BOOLEAN,
  interactive_duration_hours        INT,
  faculty_relevance                 TEXT,
  italian_only                      BOOLEAN,
  foreign_languages                 TEXT NOT NULL DEFAULT '',
  simultaneous_translation          BOOLEAN,
  participation_paid                BOOLEAN,
  participation_fee                 TEXT NOT NULL DEFAULT '',
  expected_participants             INT,
  online_registration               BOOLEAN,
  direct_recruitment                TEXT,
  participant_provenance            TEXT,
  learning_verification_id          TEXT,
  durable_material                  TEXT NOT NULL DEFAULT '',
  is_sponsored                      BOOLEAN,
  other_funding                     BOOLEAN,
  has_partner                       BOOLEAN,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_ecm_profession_targets (
  tenant_id     TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  id            TEXT NOT NULL,
  profession    TEXT NOT NULL DEFAULT '',
  discipline    TEXT NOT NULL DEFAULT '',
  sort_order    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_ecm_people (
  tenant_id      TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  id             TEXT NOT NULL,
  role           TEXT NOT NULL,
  contact_id     TEXT,
  last_name      TEXT NOT NULL DEFAULT '',
  first_name     TEXT NOT NULL DEFAULT '',
  fiscal_code    TEXT NOT NULL DEFAULT '',
  phone          TEXT,
  mobile         TEXT,
  email          TEXT,
  qualification  TEXT,
  sort_order     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_ecm_string_ids (
  tenant_id   TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  kind        TEXT NOT NULL,
  value       TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, kind, value),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_ecm_sponsors (
  tenant_id   TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  id          TEXT NOT NULL,
  kind        TEXT NOT NULL,
  company     TEXT NOT NULL DEFAULT '',
  amount      TEXT NOT NULL DEFAULT '',
  modality    TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_hotel_blocks (
  tenant_id       TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  id              TEXT NOT NULL,
  venue_id        TEXT NOT NULL DEFAULT '',
  check_in_date   TEXT NOT NULL DEFAULT '',
  check_out_date  TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  sort_order      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_night_allotments (
  tenant_id       TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  hotel_block_id  TEXT NOT NULL,
  id              TEXT NOT NULL,
  night_date      TEXT NOT NULL DEFAULT '',
  sort_order      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, hotel_block_id, id),
  FOREIGN KEY (tenant_id, event_id, hotel_block_id)
    REFERENCES lean_event_event_hotel_blocks (tenant_id, event_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_room_allotments (
  tenant_id           TEXT NOT NULL,
  event_id            TEXT NOT NULL,
  hotel_block_id      TEXT NOT NULL,
  night_allotment_id  TEXT NOT NULL,
  id                  TEXT NOT NULL,
  code                TEXT NOT NULL DEFAULT '',
  label               TEXT NOT NULL DEFAULT '',
  quantity            INT NOT NULL DEFAULT 0,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, event_id, hotel_block_id, night_allotment_id, id),
  FOREIGN KEY (tenant_id, event_id, hotel_block_id, night_allotment_id)
    REFERENCES lean_event_event_night_allotments
      (tenant_id, event_id, hotel_block_id, id)
    ON DELETE RESTRICT
);

-- ===========================================================================
-- 3. Assignment (FK evento + contatto)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lean_event_assignments (
  tenant_id       TEXT NOT NULL,
  id              TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  contact_id      TEXT NOT NULL,
  role_category   TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  revision        INT NOT NULL DEFAULT 1,
  updated_by      TEXT,
  deleted_at      TIMESTAMPTZ,
  deleted_by      TEXT,
  purge_after     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, contact_id)
    REFERENCES lean_event_contacts (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_le_assignments_event
  ON lean_event_assignments (tenant_id, event_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_le_assignments_contact
  ON lean_event_assignments (tenant_id, contact_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_assignment_hospitality (
  tenant_id                       TEXT NOT NULL,
  assignment_id                   TEXT NOT NULL,
  status                          TEXT NOT NULL DEFAULT 'pending',
  hotel_block_id                  TEXT NOT NULL DEFAULT '',
  night_allotment_id              TEXT NOT NULL DEFAULT '',
  room_allotment_id               TEXT NOT NULL DEFAULT '',
  room_type_code                  TEXT NOT NULL DEFAULT '',
  check_in                        TEXT NOT NULL DEFAULT '',
  check_out                       TEXT NOT NULL DEFAULT '',
  roommate_contact_id             TEXT,
  roommate_first_name             TEXT NOT NULL DEFAULT '',
  roommate_last_name              TEXT NOT NULL DEFAULT '',
  roommate_phone                  TEXT NOT NULL DEFAULT '',
  roommate_email                  TEXT NOT NULL DEFAULT '',
  roommate_name                   TEXT NOT NULL DEFAULT '',
  roommate_role                   TEXT,
  transfer_in                     BOOLEAN,
  transfer_out                    BOOLEAN,
  transfer_in_minutes_after       INT,
  transfer_out_minutes_before     INT,
  transfer_in_time                TEXT,
  transfer_in_time_manual         BOOLEAN,
  transfer_out_time               TEXT,
  transfer_out_time_manual        BOOLEAN,
  transfer_notes                  TEXT NOT NULL DEFAULT '',
  dietary_requirements            TEXT NOT NULL DEFAULT '',
  allergies                       TEXT NOT NULL DEFAULT '',
  accessibility_notes             TEXT NOT NULL DEFAULT '',
  internal_notes                  TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id, assignment_id),
  FOREIGN KEY (tenant_id, assignment_id)
    REFERENCES lean_event_assignments (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_assignment_night_stays (
  tenant_id           TEXT NOT NULL,
  assignment_id       TEXT NOT NULL,
  id                  TEXT NOT NULL,
  night_date          TEXT NOT NULL DEFAULT '',
  hotel_block_id      TEXT NOT NULL DEFAULT '',
  night_allotment_id  TEXT NOT NULL DEFAULT '',
  room_allotment_id   TEXT NOT NULL DEFAULT '',
  room_type_code      TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id, assignment_id, id),
  FOREIGN KEY (tenant_id, assignment_id)
    REFERENCES lean_event_assignments (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_assignment_travels (
  tenant_id             TEXT NOT NULL,
  assignment_id         TEXT NOT NULL,
  id                    TEXT NOT NULL,
  direction             TEXT NOT NULL DEFAULT 'outbound',
  mode                  TEXT NOT NULL DEFAULT 'other',
  carrier               TEXT NOT NULL DEFAULT '',
  loyalty_program       TEXT NOT NULL DEFAULT '',
  loyalty_code          TEXT NOT NULL DEFAULT '',
  origin_city           TEXT NOT NULL DEFAULT '',
  origin_airport        TEXT NOT NULL DEFAULT '',
  destination_city      TEXT NOT NULL DEFAULT '',
  destination_airport   TEXT NOT NULL DEFAULT '',
  departure_at          TEXT NOT NULL DEFAULT '',
  arrival_at            TEXT NOT NULL DEFAULT '',
  document_url          TEXT NOT NULL DEFAULT '',
  document_front_url    TEXT NOT NULL DEFAULT '',
  document_back_url     TEXT NOT NULL DEFAULT '',
  notes                 TEXT NOT NULL DEFAULT '',
  sort_order            INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, assignment_id, id),
  FOREIGN KEY (tenant_id, assignment_id)
    REFERENCES lean_event_assignments (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_assignment_related_participations (
  tenant_id         TEXT NOT NULL,
  assignment_id     TEXT NOT NULL,
  related_event_id  TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  notes             TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id, assignment_id, related_event_id),
  FOREIGN KEY (tenant_id, assignment_id)
    REFERENCES lean_event_assignments (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_assignment_related_companions (
  tenant_id         TEXT NOT NULL,
  assignment_id     TEXT NOT NULL,
  related_event_id  TEXT NOT NULL,
  id                TEXT NOT NULL,
  contact_id        TEXT,
  first_name        TEXT NOT NULL DEFAULT '',
  last_name         TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  sort_order        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, assignment_id, related_event_id, id),
  FOREIGN KEY (tenant_id, assignment_id, related_event_id)
    REFERENCES lean_event_assignment_related_participations
      (tenant_id, assignment_id, related_event_id)
    ON DELETE RESTRICT
);

-- ===========================================================================
-- 4. Link fornitori evento
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lean_event_event_supplier_links (
  tenant_id     TEXT NOT NULL,
  id            TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  supplier_id   TEXT NOT NULL,
  category_id   TEXT NOT NULL DEFAULT '',
  role_notes    TEXT NOT NULL DEFAULT '',
  revision      INT NOT NULL DEFAULT 1,
  updated_by    TEXT,
  deleted_at    TIMESTAMPTZ,
  deleted_by    TEXT,
  purge_after   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, supplier_id)
    REFERENCES lean_event_suppliers (tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_le_esl_event
  ON lean_event_event_supplier_links (tenant_id, event_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS lean_event_event_supplier_documents (
  tenant_id      TEXT NOT NULL,
  link_id        TEXT NOT NULL,
  id             TEXT NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  kind           TEXT NOT NULL DEFAULT 'altro',
  document_date  TEXT NOT NULL DEFAULT '',
  file_name      TEXT NOT NULL DEFAULT '',
  file_url       TEXT NOT NULL DEFAULT '',
  mime_type      TEXT NOT NULL DEFAULT '',
  size_bytes     BIGINT NOT NULL DEFAULT 0,
  notes          TEXT NOT NULL DEFAULT '',
  uploaded_by    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, link_id, id),
  FOREIGN KEY (tenant_id, link_id)
    REFERENCES lean_event_event_supplier_links (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_supplier_emails (
  tenant_id     TEXT NOT NULL,
  link_id       TEXT NOT NULL,
  id            TEXT NOT NULL,
  subject       TEXT NOT NULL DEFAULT '',
  occurred_at   TEXT NOT NULL DEFAULT '',
  direction     TEXT NOT NULL DEFAULT 'outbound',
  from_email    TEXT NOT NULL DEFAULT '',
  to_email      TEXT NOT NULL DEFAULT '',
  summary       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, link_id, id),
  FOREIGN KEY (tenant_id, link_id)
    REFERENCES lean_event_event_supplier_links (tenant_id, id) ON DELETE RESTRICT
);

-- ===========================================================================
-- 5. Workspace / chat
-- ===========================================================================

CREATE TABLE IF NOT EXISTS lean_event_workspaces (
  tenant_id         TEXT NOT NULL,
  id                TEXT NOT NULL,
  created_by        TEXT NOT NULL DEFAULT '',
  title             TEXT NOT NULL DEFAULT '',
  client            TEXT NOT NULL DEFAULT '',
  organization      TEXT NOT NULL DEFAULT '',
  meeting_date      TEXT NOT NULL DEFAULT '',
  meeting_type      TEXT NOT NULL DEFAULT 'internal_meeting',
  participants      TEXT NOT NULL DEFAULT '',
  moderator         TEXT NOT NULL DEFAULT '',
  secretary         TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  linked_event_id   TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  transcript        TEXT NOT NULL DEFAULT '',
  structured        JSONB,
  error_message     TEXT,
  revision          INT NOT NULL DEFAULT 1,
  updated_by        TEXT,
  deleted_at        TIMESTAMPTZ,
  deleted_by        TEXT,
  purge_after       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, linked_event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_workspace_tags (
  tenant_id     TEXT NOT NULL,
  workspace_id  TEXT NOT NULL,
  tag           TEXT NOT NULL,
  PRIMARY KEY (tenant_id, workspace_id, tag),
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES lean_event_workspaces (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_workspace_documents (
  tenant_id     TEXT NOT NULL,
  workspace_id  TEXT NOT NULL,
  doc_type      TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (tenant_id, workspace_id, doc_type),
  FOREIGN KEY (tenant_id, workspace_id)
    REFERENCES lean_event_workspaces (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_chat_threads (
  tenant_id   TEXT NOT NULL,
  id          TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  revision    INT NOT NULL DEFAULT 1,
  updated_by  TEXT,
  deleted_at  TIMESTAMPTZ,
  deleted_by  TEXT,
  purge_after TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id)
    REFERENCES lean_event_events (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_event_chat_messages (
  tenant_id         TEXT NOT NULL,
  thread_id         TEXT NOT NULL,
  id                TEXT NOT NULL,
  event_id          TEXT NOT NULL,
  author_user_id    TEXT NOT NULL DEFAULT '',
  author_name       TEXT NOT NULL DEFAULT '',
  author_email      TEXT NOT NULL DEFAULT '',
  body              TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL,
  sort_order        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, thread_id, id),
  FOREIGN KEY (tenant_id, thread_id)
    REFERENCES lean_event_event_chat_threads (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lean_event_teresa_chat_threads (
  tenant_id   TEXT NOT NULL,
  id          TEXT NOT NULL,
  user_id     TEXT NOT NULL DEFAULT '',
  user_email  TEXT NOT NULL DEFAULT '',
  user_name   TEXT NOT NULL DEFAULT '',
  title       TEXT,
  revision    INT NOT NULL DEFAULT 1,
  updated_by  TEXT,
  deleted_at  TIMESTAMPTZ,
  deleted_by  TEXT,
  purge_after TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS lean_event_teresa_chat_messages (
  tenant_id          TEXT NOT NULL,
  thread_id          TEXT NOT NULL,
  id                 TEXT NOT NULL,
  role               TEXT NOT NULL,
  content            TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL,
  context_label      TEXT,
  context_kind       TEXT,
  context_entity_id  TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, thread_id, id),
  FOREIGN KEY (tenant_id, thread_id)
    REFERENCES lean_event_teresa_chat_threads (tenant_id, id) ON DELETE RESTRICT
);

-- Flag cutover applicato
CREATE TABLE IF NOT EXISTS lean_event_schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO lean_event_schema_meta (key, value)
VALUES ('normalized_schema', '006')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
