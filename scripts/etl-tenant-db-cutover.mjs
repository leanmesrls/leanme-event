/**
 * ETL: copy one tenant's rows from shared legacy DB (neondb) → dedicated tenant DB.
 *
 * Usage:
 *   node --env-file=.env.local scripts/etl-tenant-db-cutover.mjs iec [--dry]
 *
 * Source: LEAN_EVENT_DATABASE_URL
 * Target: LEAN_EVENT_TENANT_<SLUG>_DATABASE_URL
 *
 * Safe defaults:
 * - only tables that exist on both sides
 * - only rows with tenant_id = <tenant>
 * - ON CONFLICT DO NOTHING (idempotent re-run)
 * - never writes to Control Plane
 */
import { neon } from "@neondatabase/serverless";

const tenantId = process.argv[2];
const dry = process.argv.includes("--dry");

if (!tenantId) {
  console.error("Usage: node --env-file=.env.local scripts/etl-tenant-db-cutover.mjs <tenantSlug> [--dry]");
  process.exit(1);
}

const srcUrl = process.env.LEAN_EVENT_DATABASE_URL?.trim();
const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const dstUrl = process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`]?.trim();

if (!srcUrl || !dstUrl) {
  console.error("FAIL: missing LEAN_EVENT_DATABASE_URL or LEAN_EVENT_TENANT_" + slug + "_DATABASE_URL");
  process.exit(1);
}

const src = neon(srcUrl);
const dst = neon(dstUrl);

const FK_ORDER = [
  // roots
  "lean_event_venues",
  "lean_event_contacts",
  "lean_event_suppliers",
  "lean_event_events",
  "lean_event_workspaces",
  // contact children
  "lean_event_contact_emails",
  "lean_event_contact_phones",
  "lean_event_contact_privacy_consents",
  "lean_event_contact_tags",
  // event children (before assignments that may FK event)
  "lean_event_event_hotel_blocks",
  "lean_event_event_night_allotments",
  "lean_event_event_room_allotments",
  "lean_event_event_program_sessions",
  "lean_event_event_project_managers",
  "lean_event_event_registration_fees",
  "lean_event_event_related",
  "lean_event_event_sponsors",
  "lean_event_event_supplier_links",
  "lean_event_event_supplier_emails",
  "lean_event_event_supplier_documents",
  "lean_event_event_ecm_grids",
  "lean_event_event_ecm_people",
  "lean_event_event_ecm_profession_targets",
  "lean_event_event_ecm_sponsors",
  "lean_event_event_ecm_string_ids",
  "lean_event_event_chat_threads",
  "lean_event_event_chat_messages",
  // assignments tree
  "lean_event_assignments",
  "lean_event_assignment_hospitality",
  "lean_event_assignment_night_stays",
  "lean_event_assignment_related_companions",
  "lean_event_assignment_related_participations",
  "lean_event_assignment_travels",
  // workspace / AI / docs
  "lean_event_workspace_tags",
  "lean_event_workspace_documents",
  "lean_event_teresa_chat_threads",
  "lean_event_teresa_chat_messages",
  "lean_event_supplier_agreements",
  "lean_event_documents",
  "lean_event_entities",
  "lean_event_entity_versions",
  "lean_event_entity_presence",
  "lean_event_audit_events",
];

async function listPublicTables(sql) {
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return new Set(rows.map((r) => r.table_name));
}

async function hasTenantId(sql, table) {
  const rows = await sql`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = 'tenant_id'
    LIMIT 1
  `;
  return rows.length > 0;
}

async function columns(sql, table) {
  // Exclude generated columns (e.g. is_favorite) — INSERT cannot supply them.
  const rows = await sql`
    SELECT c.column_name
    FROM information_schema.columns c
    JOIN pg_class cls ON cls.relname = c.table_name
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace AND nsp.nspname = c.table_schema
    JOIN pg_attribute a ON a.attrelid = cls.oid AND a.attname = c.column_name
    WHERE c.table_schema = 'public'
      AND c.table_name = ${table}
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attgenerated = ''
    ORDER BY c.ordinal_position
  `;
  return rows.map((r) => r.column_name);
}

async function primaryKeyCols(sql, table) {
  const rows = await sql`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
      AND n.nspname = 'public'
      AND c.relname = ${table}
    ORDER BY a.attnum
  `;
  return rows.map((r) => r.column_name);
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function copyTable(table) {
  const srcCols = await columns(src, table);
  const dstCols = await columns(dst, table);
  const colSet = srcCols.filter((c) => dstCols.includes(c));
  if (!colSet.length) {
    console.log(`${table}\tSKIP\tno shared columns`);
    return { table, copied: 0, skipped: true };
  }

  const selectList = colSet.map(quoteIdent).join(", ");
  const rows = await src.query(
    `SELECT ${selectList} FROM ${quoteIdent(table)} WHERE tenant_id = $1`,
    [tenantId]
  );

  if (dry) {
    console.log(`${table}\tDRY\t${rows.length}`);
    return { table, copied: rows.length, dry: true };
  }

  if (!rows.length) {
    console.log(`${table}\tOK\t0`);
    return { table, copied: 0 };
  }

  const pk = await primaryKeyCols(dst, table);
  const conflict =
    pk.length > 0
      ? `ON CONFLICT (${pk.map(quoteIdent).join(", ")}) DO NOTHING`
      : "";

  let copied = 0;
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      const values = colSet.map((c) => row[c]);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");
      await dst.query(
        `INSERT INTO ${quoteIdent(table)} (${colSet.map(quoteIdent).join(", ")})
         VALUES (${placeholders})
         ${conflict}`,
        values
      );
      copied += 1;
    }
  }

  console.log(`${table}\tOK\t${copied}`);
  return { table, copied };
}

const srcTables = await listPublicTables(src);
const dstTables = await listPublicTables(dst);

const candidates = [];
for (const name of FK_ORDER) {
  if (srcTables.has(name) && dstTables.has(name)) {
    candidates.push(name);
  }
}
for (const name of [...srcTables].sort()) {
  if (!name.startsWith("lean_event_")) continue;
  if (candidates.includes(name)) continue;
  if (!dstTables.has(name)) continue;
  if (await hasTenantId(src, name)) {
    candidates.push(name);
  }
}

console.log(`TENANT=${tenantId}`);
console.log(`MODE=${dry ? "dry" : "write"}`);
console.log(`TABLES=${candidates.length}`);

const results = [];
for (const table of candidates) {
  if (!(await hasTenantId(src, table))) {
    console.log(`${table}\tSKIP\tno tenant_id`);
    continue;
  }
  results.push(await copyTable(table));
}

const total = results.reduce((sum, r) => sum + (r.copied || 0), 0);
console.log(`ETL_DONE total_rows=${total}`);
