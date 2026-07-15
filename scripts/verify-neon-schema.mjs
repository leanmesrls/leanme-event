/**
 * Verifica connessione Neon + schema lean_event_*.
 * Usage: node --env-file=.env.local scripts/verify-neon-schema.mjs
 * Non stampa secrets.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: manca LEAN_EVENT_DATABASE_URL (o DATABASE_URL)");
  process.exit(1);
}

const masked = url.replace(/:[^:@/]+@/, ":***@");
console.log("Connect:", masked.replace(/^[^@]+@/, "(user)@"));

const sql = neon(url);

const expectedTables = [
  "lean_event_entities",
  "lean_event_entity_versions",
  "lean_event_entity_presence",
];

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'lean_event%'
    ORDER BY table_name
  `;
  const names = tables.map((r) => r.table_name);
  console.log("Tables:", names.join(", ") || "(none)");

  const missing = expectedTables.filter((t) => !names.includes(t));
  if (missing.length) {
    console.error("FAIL: tabelle mancanti:", missing.join(", "));
    process.exit(1);
  }

  const counts = await sql`
    SELECT 'entities' AS t, COUNT(*)::int AS n FROM lean_event_entities
    UNION ALL
    SELECT 'versions', COUNT(*)::int FROM lean_event_entity_versions
    UNION ALL
    SELECT 'presence', COUNT(*)::int FROM lean_event_entity_presence
  `;
  console.log("Row counts:", Object.fromEntries(counts.map((r) => [r.t, r.n])));

  const pks = await sql`
    SELECT
      tc.table_name,
      string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position) AS pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_name LIKE 'lean_event%'
    GROUP BY tc.table_name
    ORDER BY tc.table_name
  `;
  console.log("Primary keys:");
  for (const row of pks) {
    console.log(`  ${row.table_name}: (${row.pk_cols})`);
  }

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename LIKE 'lean_event%'
    ORDER BY indexname
  `;
  console.log(
    "Indexes:",
    indexes.map((r) => r.indexname).join(", ")
  );

  console.log("\nOK: schema Neon raggiungibile e completo.");
  if (counts.find((c) => c.t === "entities")?.n > 0) {
    console.log(
      "NOTE: dual-write attivo in codice. Letture UI ancora da Blob/FS fino al cutover."
    );
  } else {
    console.log(
      "NOTE: tabella vuota — esegui npm run lean-event:migrate-neon (locale) o migrazione Blob prod."
    );
  }
} catch (error) {
  console.error("VERIFY_FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
}
