-- Lean Event · Indirizzi geo (nazione / regione / provincia)
-- Versione: 2026-07-21
-- I campi vivono in payload JSONB (nessuna colonna dedicata).
-- Questo script aggiunge indici operativi per filtri per nazione/regione.
-- Applicare su Neon: npm.cmd run lean-event:apply-neon-004
--
-- Campi payload: country, region, province, city, address, postalCode
-- (contact anche organizationCountry / organizationRegion / …)
-- event.venueDetails.country per sede evento
-- Ordine UI: Nazione → Indirizzo → Città → Provincia → Regione (solo IT) → CAP

CREATE INDEX IF NOT EXISTS idx_lean_event_contacts_country
  ON lean_event_entities ((payload->>'country'))
  WHERE entity_type = 'contact' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_contacts_region
  ON lean_event_entities ((payload->>'region'))
  WHERE entity_type = 'contact' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_contacts_org_country
  ON lean_event_entities ((payload->>'organizationCountry'))
  WHERE entity_type = 'contact' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_venues_country
  ON lean_event_entities ((payload->>'country'))
  WHERE entity_type = 'venue' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_suppliers_country
  ON lean_event_entities ((payload->>'country'))
  WHERE entity_type = 'supplier' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lean_event_events_venue_country
  ON lean_event_entities ((payload->'venueDetails'->>'country'))
  WHERE entity_type = 'event' AND deleted_at IS NULL;
