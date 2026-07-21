/**
 * Confronta conteggi lean_event_entities vs tabelle tipizzate.
 * Usage: npm.cmd run lean-event:verify-normalized
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: manca LEAN_EVENT_DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);

const map = [
  ["venue", "lean_event_venues"],
  ["contact", "lean_event_contacts"],
  ["supplier", "lean_event_suppliers"],
  ["event", "lean_event_events"],
  ["assignment", "lean_event_assignments"],
  ["event_supplier_link", "lean_event_event_supplier_links"],
  ["workspace", "lean_event_workspaces"],
  ["event_chat", "lean_event_event_chat_threads"],
  ["teresa_chat", "lean_event_teresa_chat_threads"],
];

let ok = true;
for (const [entityType, table] of map) {
  const [src] = await sql`
    SELECT COUNT(*)::int AS n FROM lean_event_entities WHERE entity_type = ${entityType}
  `;
  const dest = await sql.query(
    `SELECT COUNT(*)::int AS n FROM ${table}`
  );
  const srcN = src?.n ?? 0;
  const destN = dest[0]?.n ?? 0;
  const mark = srcN === destN ? "OK" : "DIFF";
  if (srcN !== destN) ok = false;
  console.log(`${mark} ${entityType}: entities=${srcN} → ${table}=${destN}`);
}

const meta = await sql`
  SELECT key, value FROM lean_event_schema_meta ORDER BY key
`;
console.log("meta:", meta);
process.exit(ok ? 0 : 2);
