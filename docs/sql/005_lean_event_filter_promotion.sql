-- Lean Event · Promotion filtri (L1/L2) — preferiti evento + sort startDate
-- Versione: 2026-07-21
-- Applicare dopo 001–004: npm run lean-event:apply-neon-005
-- Fonte: docs/lean-event-filter-index-catalog.md

-- ---------------------------------------------------------------------------
-- L2: is_favorite (da payload.isFavorite) — eventi preferiti
-- ---------------------------------------------------------------------------
ALTER TABLE lean_event_entities
  ADD COLUMN IF NOT EXISTS is_favorite boolean
  GENERATED ALWAYS AS (
    CASE
      WHEN lower(coalesce(payload->>'isFavorite', 'false')) IN ('true', 't', '1')
        THEN true
      ELSE false
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_lean_event_events_favorite
  ON lean_event_entities (tenant_id, updated_at DESC)
  WHERE entity_type = 'event'
    AND deleted_at IS NULL
    AND is_favorite = true;

-- ---------------------------------------------------------------------------
-- L1: startDate eventi (prep sort/range SQL)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lean_event_events_start_date
  ON lean_event_entities (tenant_id, (payload->>'startDate') DESC)
  WHERE entity_type = 'event' AND deleted_at IS NULL;
