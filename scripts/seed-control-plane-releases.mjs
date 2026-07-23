/**
 * Idempotent seed of platform product releases into Control Plane (Neon).
 * Source of truth after seed: lean_event_platform_releases — not JSON files.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_CONTROL_PLANE_DATABASE_URL missing");
  process.exit(2);
}

const sql = neon(url);

const releases = [
  {
    version: "0.1.0",
    publishedAt: "2026-07-23T13:00:00.000Z",
    title: "Lean Event 0.1.0 — Info e aggiornamenti prodotto",
    summary:
      "Nuova voce Info nel menu account con versione software e storico rilasci. Ogni nuovo rilascio compare anche nella campanella Notifiche.",
    highlights: [
      "Menu account: voce Info (ultima voce prima di Esci)",
      "Pagina Info con versione corrente e dettagli dei rilasci",
      "Notifica automatica in campanella a ogni nuovo rilascio prodotto",
    ],
    technicalRefs: [
      "UI: /leanyou/{tenant}/info",
      "Menu: LeanEventShell → Info",
    ],
    changesFromPrevious:
      "Prima release con sezione Info dedicata e storico aggiornamenti consultabile dagli utenti.",
    architectureVersion: "1.0.0",
  },
  {
    version: "0.2.0",
    publishedAt: "2026-07-23T14:30:00.000Z",
    title: "Lean Event 0.2.0 — Release notes su Neon Control Plane",
    summary:
      "Lo storico versioni e i riassunti di release non vivono più in file JSON: SoT su PostgreSQL/Neon (Control Plane). Info mostra riferimenti tecnici e differenza rispetto alla release precedente.",
    highlights: [
      "Tabella Control Plane lean_event_platform_releases",
      "Info: versione online, refs tecnici, delta vs release precedente",
      "Campanella: notifiche release lette da Neon via API",
      "Conferma architettura: Postgres/Neon SoT, niente Object Storage come SoT",
    ],
    technicalRefs: [
      "CP schema: platform/registry-schema/cp_002_platform_releases.sql",
      "Apply: npm run lean-event:apply-control-plane",
      "Seed: npm run lean-event:seed-control-plane-releases",
      "API: GET /api/leanyou/product-notifications",
      "Architettura: docs/architecture/LEAN-EVENT-ARCHITECTURE-V1.0-CONSTITUTION.md",
      "Document store: lean_event_documents + chunks (BYTEA) su DB tenant",
    ],
    changesFromPrevious:
      "Rispetto a 0.1.0: SoT rilasci spostato da JSON a Neon Control Plane; Info arricchita con refs tecnici e riassunto delta; campanella allineata alla stessa fonte.",
    architectureVersion: "1.0.0",
  },
];

const table = await sql`
  SELECT to_regclass('public.lean_event_platform_releases') IS NOT NULL AS ok
`;
if (!table[0]?.ok) {
  console.error(
    "FAIL: lean_event_platform_releases missing. Run: npm run lean-event:apply-control-plane"
  );
  process.exit(2);
}

for (const release of releases) {
  await sql`
    INSERT INTO lean_event_platform_releases (
      version,
      published_at,
      title,
      summary,
      highlights,
      technical_refs,
      changes_from_previous,
      architecture_version,
      updated_at
    )
    VALUES (
      ${release.version},
      ${release.publishedAt},
      ${release.title},
      ${release.summary},
      ${JSON.stringify(release.highlights)}::jsonb,
      ${JSON.stringify(release.technicalRefs)}::jsonb,
      ${release.changesFromPrevious},
      ${release.architectureVersion},
      now()
    )
    ON CONFLICT (version) DO UPDATE SET
      published_at = EXCLUDED.published_at,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      highlights = EXCLUDED.highlights,
      technical_refs = EXCLUDED.technical_refs,
      changes_from_previous = EXCLUDED.changes_from_previous,
      architecture_version = EXCLUDED.architecture_version,
      updated_at = now()
  `;
  console.log(`UPSERT_RELEASE=${release.version}`);
}

const count = await sql`
  SELECT COUNT(*)::int AS n FROM lean_event_platform_releases
`;
console.log(`PLATFORM_RELEASES_COUNT=${count[0].n}`);
console.log("CONTROL_PLANE_RELEASES_SEED_OK");
