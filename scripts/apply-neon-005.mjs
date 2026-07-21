/**
 * Applica docs/sql/005_lean_event_filter_promotion.sql su Neon.
 * Usage: npm.cmd run lean-event:apply-neon-005
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: manca LEAN_EVENT_DATABASE_URL");
  process.exit(1);
}

const sqlFile = path.join(root, "docs/sql/005_lean_event_filter_promotion.sql");
const raw = await readFile(sqlFile, "utf8");

const statements = raw
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

const sql = neon(url);
console.log(`Applico ${statements.length} statement da 005 (filter promotion)...`);

for (const [index, statement] of statements.entries()) {
  try {
    await sql.query(statement);
    console.log(`OK ${index + 1}/${statements.length}`);
  } catch (error) {
    console.error(`FAIL statement ${index + 1}:`, statement.slice(0, 160));
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const indexes = await sql`
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_lean_event_events_favorite',
      'idx_lean_event_events_start_date'
    )
  ORDER BY indexname
`;
const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'lean_event_entities'
    AND column_name = 'is_favorite'
`;
console.log(`Colonna is_favorite: ${cols.length ? "OK" : "MISSING"}`);
console.log(`Indici 005: ${indexes.length}/2`);
console.log("OK: 005 applicato.");
