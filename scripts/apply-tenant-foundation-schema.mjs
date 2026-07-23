import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const envName = (process.argv[2] || "LEAN_EVENT_TENANT_IEC_DATABASE_URL").trim();
const url = process.env[envName]?.trim();
if (!url) {
  console.error(`FAIL: ${envName} missing`);
  process.exit(2);
}

const migrationId = "t_001_foundation";
const schemaPath = join(
  process.cwd(),
  "platform/migrations/tenant/t_001_foundation.sql"
);
const ddl = readFileSync(schemaPath, "utf8");
const sql = neon(url);

const statements = ddl
  .split(";")
  .map((part) =>
    part
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

await sql`
  INSERT INTO lean_event_schema_migrations (id)
  VALUES (${migrationId})
  ON CONFLICT (id) DO NOTHING
`;

const check = await sql`
  SELECT current_database() AS db, count(*)::int AS migrations
  FROM lean_event_schema_migrations
`;
console.log(`TENANT_DB=${check[0].db}`);
console.log(`MIGRATIONS=${check[0].migrations}`);
console.log("TENANT_FOUNDATION_SCHEMA_OK");
