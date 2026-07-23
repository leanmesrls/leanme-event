-- Lean.Event Control Plane — product announcements (campanella, non-release)
-- SoT: Neon Control Plane only. Not Blob. Not JSON files.

CREATE TABLE IF NOT EXISTS lean_event_platform_announcements (
  id TEXT PRIMARY KEY,
  published_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lean_event_platform_announcements_published_idx
  ON lean_event_platform_announcements (published_at DESC);
