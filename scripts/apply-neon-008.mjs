/**
 * Apply docs/sql/008_lean_event_documents_postgres_store.sql with dollar-quote awareness.
 * Usage:
 *   node --env-file=.env.local scripts/apply-neon-008.mjs
 *   node --env-file=.env.local scripts/apply-neon-008.mjs LEAN_EVENT_TENANT_DEMO_DATABASE_URL
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const envName = process.argv[2] || "LEAN_EVENT_DATABASE_URL";
const url =
  process.env[envName]?.trim() ||
  process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL?.trim() ||
  process.env.LEAN_EVENT_DATABASE_URL?.trim();

if (!url) {
  console.error(`FAIL: missing ${envName} / tenant / legacy DATABASE_URL`);
  process.exit(2);
}

function splitSql(ddl) {
  const statements = [];
  let current = "";
  let i = 0;
  let inDollar = null;

  while (i < ddl.length) {
    if (!inDollar && ddl.startsWith("--", i)) {
      const nl = ddl.indexOf("\n", i);
      i = nl === -1 ? ddl.length : nl + 1;
      continue;
    }

    if (ddl[i] === "$") {
      const rest = ddl.slice(i);
      const match = rest.match(/^\$([A-Za-z_]*)\$/);
      if (match) {
        const tag = match[0];
        if (!inDollar) {
          inDollar = tag;
          current += tag;
          i += tag.length;
          continue;
        }
        if (inDollar === tag) {
          inDollar = null;
          current += tag;
          i += tag.length;
          continue;
        }
      }
    }

    const ch = ddl[i];
    if (!inDollar && ch === ";") {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

const filePath = join(process.cwd(), "docs/sql/008_lean_event_documents_postgres_store.sql");
const ddl = readFileSync(filePath, "utf8");
const statements = splitSql(ddl);
const sql = neon(url);

for (const statement of statements) {
  try {
    await sql.query(statement);
  } catch (error) {
    // PG13 and earlier use EXECUTE PROCEDURE; retry if FUNCTION unsupported
    const message = error instanceof Error ? error.message : String(error);
    if (
      statement.includes("EXECUTE FUNCTION") &&
      /EXECUTE FUNCTION|syntax error/i.test(message)
    ) {
      await sql.query(statement.replace(/EXECUTE FUNCTION/g, "EXECUTE PROCEDURE"));
    } else {
      console.error("STATEMENT_FAIL:\n", statement.slice(0, 240));
      throw error;
    }
  }
}

const db = await sql`select current_database() as d`;
const meta = await sql`
  SELECT value FROM lean_event_schema_meta WHERE key = 'documents_postgres_store'
`;
console.log(`TARGET_DB=${db[0].d}`);
console.log(`STATEMENTS=${statements.length}`);
console.log(`SCHEMA_META=${meta[0]?.value ?? "missing"}`);
console.log("APPLY_008_OK");
