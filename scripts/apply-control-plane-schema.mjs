import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
if (!url) {
  console.error(
    "FAIL: LEAN_EVENT_CONTROL_PLANE_DATABASE_URL missing. See docs/operations/credentials-required.md"
  );
  process.exit(2);
}

const sql = neon(url);
const schemaDir = join(process.cwd(), "platform/registry-schema");

function splitStatements(ddl) {
  return ddl
    .split(";")
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

const files = readdirSync(schemaDir)
  .filter((name) => /^cp_\d+_.*\.sql$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "en"));

for (const file of files) {
  const migrationId = file.replace(/\.sql$/i, "");
  const applied = await sql`
    SELECT 1 AS ok
    FROM lean_event_schema_migrations_platform
    WHERE id = ${migrationId}
    LIMIT 1
  `.catch(() => []);

  if (applied.length > 0) {
    console.log(`SKIP_MIGRATION=${migrationId}`);
    continue;
  }

  const ddl = readFileSync(join(schemaDir, file), "utf8");
  for (const statement of splitStatements(ddl)) {
    await sql.query(statement);
  }

  // Migrations table exists after cp_001; for first file create-if-needed is in DDL.
  await sql`
    INSERT INTO lean_event_schema_migrations_platform (id)
    VALUES (${migrationId})
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(`APPLIED_MIGRATION=${migrationId}`);
}

const verify = await sql`
  SELECT current_database() AS db,
         to_regclass('public.lean_event_tenants') IS NOT NULL AS has_tenants,
         to_regclass('public.lean_event_platform_releases') IS NOT NULL AS has_releases
`;
console.log(`CONTROL_PLANE_DB=${verify[0].db}`);
console.log(`HAS_TENANTS_TABLE=${verify[0].has_tenants}`);
console.log(`HAS_PLATFORM_RELEASES_TABLE=${verify[0].has_releases}`);
console.log("CONTROL_PLANE_SCHEMA_OK");
