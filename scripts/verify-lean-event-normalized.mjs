/**
 * Confronta conteggi lean_event_entities vs tabelle tipizzate.
 * - FAIL se tipizzate < entities (perdita dati)
 * - OK se uguali
 * - OK (ahead) se tipizzate > entities (atteso dopo N4: mirror spento, write solo tipizzate)
 *
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

let failed = false;
for (const [entityType, table] of map) {
  const [src] = await sql`
    SELECT COUNT(*)::int AS n FROM lean_event_entities WHERE entity_type = ${entityType}
  `;
  const dest = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  const srcN = src?.n ?? 0;
  const destN = dest[0]?.n ?? 0;

  const missing = await sql.query(
    `
    SELECT e.id
    FROM lean_event_entities e
    LEFT JOIN ${table} t
      ON t.tenant_id = e.tenant_id AND t.id = e.id
    WHERE e.entity_type = $1 AND t.id IS NULL
    LIMIT 20
    `,
    [entityType]
  );

  if (missing.length > 0) {
    failed = true;
    console.log(
      `FAIL ${entityType}: ${missing.length}+ id in entities assenti da ${table}`
    );
    continue;
  }

  if (destN < srcN) {
    failed = true;
    console.log(`FAIL ${entityType}: entities=${srcN} → ${table}=${destN}`);
  } else if (destN > srcN) {
    console.log(
      `OK (ahead) ${entityType}: entities=${srcN} → ${table}=${destN}`
    );
  } else {
    console.log(`OK ${entityType}: entities=${srcN} → ${table}=${destN}`);
  }
}

const meta = await sql`
  SELECT key, value FROM lean_event_schema_meta ORDER BY key
`;
console.log("meta:", meta);
process.exit(failed ? 2 : 0);
