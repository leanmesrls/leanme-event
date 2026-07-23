/**
 * Compare row counts for a tenant between legacy shared DB (neondb) and dedicated tenant DB.
 * Usage:
 *   node --env-file=.env.local scripts/compare-tenant-db-counts.mjs iec
 */
import { neon } from "@neondatabase/serverless";

const tenantId = process.argv[2] || "iec";
const srcUrl = process.env.LEAN_EVENT_DATABASE_URL;
const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const dstUrl =
  process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`] ||
  process.env.LEAN_EVENT_TENANT_IEC_DATABASE_URL;

if (!srcUrl || !dstUrl) {
  console.error("FAIL: missing LEAN_EVENT_DATABASE_URL or tenant DATABASE_URL");
  process.exit(1);
}

const src = neon(srcUrl);
const dst = neon(dstUrl);

const TABLES = [
  "lean_event_entities",
  "lean_event_entity_versions",
  "lean_event_documents",
  "lean_event_audit_events",
  "lean_event_venues",
  "lean_event_contacts",
  "lean_event_suppliers",
  "lean_event_events",
  "lean_event_assignments",
  "lean_event_workspaces",
  "lean_event_teresa_chat_threads",
  "lean_event_workspace_documents",
];

async function count(sql, table, withTenant) {
  try {
    if (withTenant) {
      const rows = await sql.query(
        `SELECT count(*)::int AS c FROM ${table} WHERE tenant_id = $1`,
        [tenantId]
      );
      return rows[0]?.c ?? 0;
    }
    const rows = await sql.query(`SELECT count(*)::int AS c FROM ${table}`, []);
    return rows[0]?.c ?? 0;
  } catch (error) {
    return `ERR:${String(error.message || error).split("\n")[0]}`;
  }
}

console.log(`TENANT=${tenantId}`);
console.log("TABLE\tSRC\tDST\tDELTA");
let mismatches = 0;
for (const table of TABLES) {
  const a = await count(src, table, true);
  const b = await count(dst, table, true);
  const delta =
    typeof a === "number" && typeof b === "number" ? b - a : "n/a";
  if (typeof a === "number" && typeof b === "number" && a !== b) {
    mismatches += 1;
  }
  console.log(`${table}\t${a}\t${b}\t${delta}`);
}
console.log(mismatches === 0 ? "COMPARE_OK_OR_EMPTY_DST" : `MISMATCHES=${mismatches}`);
