/**
 * Applica docs/sql/006_lean_event_normalized.sql su Neon.
 * Usage: npm.cmd run lean-event:apply-neon-006
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

const sqlFile = path.join(root, "docs/sql/006_lean_event_normalized.sql");
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
console.log(`Applico ${statements.length} statement da 006 (normalized)...`);

for (const [index, statement] of statements.entries()) {
  try {
    await sql.query(statement);
    console.log(`OK ${index + 1}/${statements.length}`);
  } catch (error) {
    console.error(`FAIL statement ${index + 1}:`, statement.slice(0, 200));
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const tables = await sql`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'lean_event_%'
    AND tablename NOT IN (
      'lean_event_entities',
      'lean_event_entity_versions',
      'lean_event_entity_presence',
      'lean_event_documents',
      'lean_event_audit_events'
    )
  ORDER BY tablename
`;
console.log(`Tabelle normalizzate: ${tables.length}`);
console.log("OK: 006 applicato.");
