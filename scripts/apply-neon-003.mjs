/**
 * Applica docs/sql/003_lean_event_indexes_solidity.sql su Neon.
 * Usage: npm.cmd run lean-event:apply-neon-003
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

const sqlFile = path.join(root, "docs/sql/003_lean_event_indexes_solidity.sql");
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
console.log(`Applico ${statements.length} statement da 003...`);

for (const [index, statement] of statements.entries()) {
  try {
    await sql.query(statement);
    console.log(`OK ${index + 1}/${statements.length}`);
  } catch (error) {
    console.error(`FAIL statement ${index + 1}:`, statement.slice(0, 120));
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const indexes = await sql`
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_lean_event_%'
  ORDER BY indexname
`;
console.log(`Indici lean_event: ${indexes.length}`);
console.log("OK: 003 applicato.");
