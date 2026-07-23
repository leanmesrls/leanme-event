/**
 * List distinct tenant_id values in legacy shared Neon DB.
 * Usage: node --env-file=.env.local scripts/list-neon-tenants.mjs
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);

const tables = await sql`
  SELECT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'tenant_id'
    AND table_name LIKE 'lean_event_%'
  ORDER BY table_name
`;

console.log("TABLES_WITH_TENANT_ID=" + tables.length);

const totals = await sql`
  SELECT tenant_id, count(*)::int AS c
  FROM lean_event_entities
  GROUP BY tenant_id
  ORDER BY c DESC
`;
console.log("ENTITIES_BY_TENANT");
for (const row of totals) {
  console.log(`${row.tenant_id}\t${row.c}`);
}

const typed = [
  "lean_event_venues",
  "lean_event_contacts",
  "lean_event_events",
  "lean_event_workspaces",
  "lean_event_documents",
];

for (const table of typed) {
  try {
    const rows = await sql.query(
      `SELECT tenant_id, count(*)::int AS c FROM ${table} GROUP BY tenant_id ORDER BY c DESC`
    );
    console.log(`TABLE=${table}`);
    for (const row of rows) {
      console.log(`  ${row.tenant_id}\t${row.c}`);
    }
  } catch (error) {
    console.log(`TABLE=${table}\tERR=${String(error.message || error).split("\n")[0]}`);
  }
}
