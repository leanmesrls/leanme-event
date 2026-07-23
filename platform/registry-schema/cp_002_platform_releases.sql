-- Lean.Event Control Plane — platform product releases (Info + campanella)
-- SoT: Neon Control Plane only. Never tenant DB. Never JSON files as SoT.

CREATE TABLE IF NOT EXISTS lean_event_platform_releases (
  version TEXT PRIMARY KEY,
  published_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  changes_from_previous TEXT NOT NULL DEFAULT '',
  architecture_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lean_event_platform_releases_highlights_array
    CHECK (jsonb_typeof(highlights) = 'array'),
  CONSTRAINT lean_event_platform_releases_refs_array
    CHECK (jsonb_typeof(technical_refs) = 'array')
);

CREATE INDEX IF NOT EXISTS lean_event_platform_releases_published_idx
  ON lean_event_platform_releases (published_at DESC);
