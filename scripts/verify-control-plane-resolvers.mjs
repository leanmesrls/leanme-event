/**
 * Verify Tenant Registry + DB/Storage secret refs for iec (no secret values printed).
 */
import { neon } from "@neondatabase/serverless";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const cpUrl = requireEnv("LEAN_EVENT_CONTROL_PLANE_DATABASE_URL");
const sql = neon(cpUrl);

const rows = await sql`
  SELECT slug, status, database_ref, storage_ref, schema_version, migration_status
  FROM lean_event_tenants
  WHERE slug = 'iec'
  LIMIT 1
`;
if (!rows[0]) {
  console.error("IEC_NOT_IN_REGISTRY");
  process.exit(1);
}

const tenant = rows[0];
console.log(`REGISTRY_SLUG=${tenant.slug}`);
console.log(`REGISTRY_STATUS=${tenant.status}`);
console.log(`REGISTRY_DB_REF=${tenant.database_ref}`);
console.log(`REGISTRY_STORAGE_REF=${tenant.storage_ref}`);

const dbUrl = requireEnv(tenant.database_ref);
const blob = requireEnv(tenant.storage_ref);
const tenantSql = neon(dbUrl);
const db = await tenantSql`select current_database() as d`;
console.log(`RESOLVED_DB=${db[0].d}`);
console.log(`STORAGE_REF_RESOLVES=${blob ? "yes" : "no"}`);

if (db[0].d !== "lean_event_t_iec") {
  console.error("WRONG_TENANT_DB");
  process.exit(1);
}

console.log(`INNGEST_EVENT=${process.env.INNGEST_EVENT_KEY?.trim() ? "SET" : "MISSING"}`);
console.log(`INNGEST_SIGN=${process.env.INNGEST_SIGNING_KEY?.trim() ? "SET" : "MISSING"}`);
console.log("RESOLVER_VERIFY_OK");
