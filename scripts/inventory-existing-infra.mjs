/**
 * Read-only inventory of existing Lean.Event infra (no secrets printed).
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function flag(name) {
  return process.env[name]?.trim() ? "SET" : "MISSING";
}

function parseUrl(url) {
  const normalized = url.replace(/^postgres(ql)?:/i, "http:");
  const u = new URL(normalized);
  const db = (u.pathname || "").replace(/^\//, "") || "(none)";
  return {
    host: u.hostname,
    db,
    pooled: u.hostname.includes("-pooler"),
  };
}

const keys = [
  "LEAN_EVENT_CONTROL_PLANE_DATABASE_URL",
  "LEAN_EVENT_DATABASE_URL",
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "OPENAI_API_KEY",
  "LEAN_EVENT_SESSION_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "VERCEL_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
  "LEAN_EVENT_TENANT_IEC_DATABASE_URL",
  "LEAN_EVENT_TENANT_DEMO_DATABASE_URL",
  "LEAN_EVENT_TENANT_IEC_BLOB_TOKEN",
  "LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN",
];

console.log("=== ENV FLAGS ===");
for (const key of keys) {
  console.log(`${key}=${flag(key)}`);
}

const primary =
  process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim() ||
  process.env.LEAN_EVENT_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!primary) {
  console.log("PRIMARY_NEON_URL=MISSING");
  process.exit(0);
}

const parsed = parseUrl(primary);
console.log("=== PRIMARY NEON URL (masked) ===");
console.log(`HOST=${parsed.host}`);
console.log(`DB_IN_URL=${parsed.db}`);
console.log(`POOLED=${parsed.pooled}`);

const sql = neon(primary);
const connected = await sql`select current_database() as db, current_user as usr`;
console.log(`CONNECTED_DB=${connected[0].db}`);
console.log(`CONNECTED_USER=${connected[0].usr}`);

const databases = await sql`
  SELECT datname
  FROM pg_database
  WHERE datistemplate = false
  ORDER BY datname
`;
console.log(`DATABASES=${databases.map((row) => row.datname).join(",")}`);

const tableCount = await sql`
  SELECT count(*)::int AS c
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`;
console.log(`PUBLIC_TABLES=${tableCount[0].c}`);

const leanTables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name LIKE 'lean_event%'
  ORDER BY table_name
`;
console.log(
  `LEAN_EVENT_TABLES=${leanTables.map((row) => row.table_name).join(",")}`
);

const cp = await sql`
  SELECT to_regclass('public.lean_event_tenants') IS NOT NULL AS has_tenants
`;
console.log(`HAS_CONTROL_PLANE_TENANTS_TABLE=${cp[0].has_tenants}`);

const entityCount = await sql`
  SELECT to_regclass('public.lean_event_entities') IS NOT NULL AS has_entities
`;
console.log(`HAS_LEGACY_ENTITIES_TABLE=${entityCount[0].has_entities}`);

if (entityCount[0].has_entities) {
  const counts = await sql`
    SELECT entity_type, count(*)::int AS c
    FROM lean_event_entities
    GROUP BY entity_type
    ORDER BY entity_type
  `;
  console.log(
    `ENTITY_COUNTS=${counts.map((row) => `${row.entity_type}:${row.c}`).join(",")}`
  );
}

const tenantsFile =
  process.env.LEAN_EVENT_TENANTS_FILE?.trim() || ".lean-event-data/tenants.json";
if (existsSync(tenantsFile)) {
  const json = JSON.parse(readFileSync(tenantsFile, "utf8"));
  const tenants = Array.isArray(json.tenants) ? json.tenants : [];
  console.log("=== TENANTS FILE ===");
  console.log(`TENANT_COUNT=${tenants.length}`);
  console.log(
    `TENANT_SLUGS=${tenants.map((t) => t.slug || t.id).join(",")}`
  );
}

if (existsSync(".vercel/project.json")) {
  console.log("=== VERCEL LINK ===");
  console.log("VERCEL_LINK=yes");
} else {
  console.log("VERCEL_LINK=no");
}

console.log("INVENTORY_OK");
