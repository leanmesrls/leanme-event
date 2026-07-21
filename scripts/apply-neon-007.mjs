/**
 * Applica docs/sql/007_lean_event_documents_fk.sql
 * Usage: npm.cmd run lean-event:apply-neon-007
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

const sqlFile = path.join(root, "docs/sql/007_lean_event_documents_fk.sql");
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
console.log(`Applico ${statements.length} statement da 007 (documents FK)...`);

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

console.log("OK: 007 applicato (FK NOT VALID).");
