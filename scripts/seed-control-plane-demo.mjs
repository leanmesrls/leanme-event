/**
 * Seed Tenant Registry with demo pointing at dedicated DB/storage secret refs.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_CONTROL_PLANE_DATABASE_URL missing");
  process.exit(2);
}

if (!process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL?.trim()) {
  console.error("FAIL: LEAN_EVENT_TENANT_DEMO_DATABASE_URL missing");
  process.exit(2);
}
if (!process.env.LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN?.trim()) {
  console.error("FAIL: LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN missing");
  process.exit(2);
}

const modules = [
  { id: "core", version: "1.0.0", active: true },
  { id: "ai", version: "1.0.0", active: true },
  { id: "finance", version: "1.0.0", active: true },
];

const assistantProfileIds = [
  "meeting-minutes-assistant",
  "customer-support-assistant",
];

const sql = neon(url);
const now = new Date().toISOString();

await sql`
  INSERT INTO lean_event_tenants (
    id, slug, display_name, status, environment,
    database_ref, storage_ref, secrets_ref,
    schema_version, migration_status,
    modules_json, commercial_pack, ai_provider,
    assistant_profile_ids, settings_json,
    provisioning_status, backup_status, health_status,
    created_at, updated_at
  ) VALUES (
    'demo',
    'demo',
    'Lean.Event Demo',
    'active',
    'development',
    'LEAN_EVENT_TENANT_DEMO_DATABASE_URL',
    'LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN',
    'LEAN_EVENT_SESSION_SECRET',
    '1',
    'up_to_date',
    ${JSON.stringify(modules)}::jsonb,
    'AI',
    'openai',
    ${JSON.stringify(assistantProfileIds)}::jsonb,
    '{}'::jsonb,
    'ready',
    'unknown',
    'unknown',
    ${now}::timestamptz,
    ${now}::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    status = EXCLUDED.status,
    environment = EXCLUDED.environment,
    database_ref = EXCLUDED.database_ref,
    storage_ref = EXCLUDED.storage_ref,
    secrets_ref = EXCLUDED.secrets_ref,
    schema_version = EXCLUDED.schema_version,
    migration_status = EXCLUDED.migration_status,
    modules_json = EXCLUDED.modules_json,
    commercial_pack = EXCLUDED.commercial_pack,
    ai_provider = EXCLUDED.ai_provider,
    assistant_profile_ids = EXCLUDED.assistant_profile_ids,
    provisioning_status = EXCLUDED.provisioning_status,
    updated_at = EXCLUDED.updated_at
`;

const row = await sql`
  SELECT slug, status, database_ref, storage_ref
  FROM lean_event_tenants
  WHERE id = 'demo'
`;

console.log(`SEEDED_SLUG=${row[0].slug}`);
console.log(`SEEDED_STATUS=${row[0].status}`);
console.log(`SEEDED_DB_REF=${row[0].database_ref}`);
console.log(`SEEDED_STORAGE_REF=${row[0].storage_ref}`);
console.log("SEED_DEMO_OK");
