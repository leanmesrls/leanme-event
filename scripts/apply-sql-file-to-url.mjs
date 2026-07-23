/**
 * Apply a SQL file (split on ';' after stripping -- comments) to a target DATABASE_URL env var.
 * Usage: node --env-file=.env.local scripts/apply-sql-file-to-url.mjs LEAN_EVENT_TENANT_IEC_DATABASE_URL docs/sql/006_lean_event_normalized.sql
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const envName = process.argv[2];
const filePath = process.argv[3];
if (!envName || !filePath) {
  console.error(
    "Usage: node scripts/apply-sql-file-to-url.mjs <ENV_URL_NAME> <sqlFile>"
  );
  process.exit(2);
}

const url = process.env[envName]?.trim();
if (!url) {
  console.error(`Missing env ${envName}`);
  process.exit(2);
}

const ddl = readFileSync(filePath, "utf8");
const statements = ddl
  .split(";")
  .map((part) =>
    part
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

const sql = neon(url);
let applied = 0;
for (const statement of statements) {
  await sql.query(statement);
  applied += 1;
}

const db = await sql`select current_database() as d`;
console.log(`TARGET_DB=${db[0].d}`);
console.log(`STATEMENTS=${applied}`);
console.log(`FILE=${filePath}`);
console.log("APPLY_SQL_OK");
