/**
 * Create missing Neon databases in the existing project and write env refs.
 * Reuses host/user/password from LEAN_EVENT_DATABASE_URL.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sourceUrl = process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!sourceUrl) {
  console.error("LEAN_EVENT_DATABASE_URL missing");
  process.exit(1);
}

function withDatabase(url, databaseName) {
  const normalized = url.replace(/^postgres(ql)?:/i, "http:");
  const parsed = new URL(normalized);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString().replace(/^http:/i, "postgresql:");
}

function listMissing(existing, required) {
  return required.filter((name) => !existing.includes(name));
}

function upsertEnv(filePath, entries) {
  let content = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (!content.endsWith("\n") && content.length > 0) {
    content += "\n";
  }
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content += `${line}\n`;
    }
  }
  writeFileSync(filePath, content, "utf8");
}

const required = [
  "lean_event_control_plane",
  "lean_event_t_iec",
  "lean_event_t_demo",
];
const sql = neon(sourceUrl);

const rows = await sql`
  SELECT datname
  FROM pg_database
  WHERE datistemplate = false
`;
const existing = rows.map((row) => row.datname);
console.log(`EXISTING=${existing.join(",")}`);

const missing = listMissing(existing, required);
for (const name of missing) {
  console.log(`CREATE=${name}`);
  await sql.query(`CREATE DATABASE ${name}`);
}

const after = await sql`
  SELECT datname
  FROM pg_database
  WHERE datistemplate = false
  ORDER BY datname
`;
console.log(`AFTER=${after.map((row) => row.datname).join(",")}`);

const controlPlaneUrl = withDatabase(sourceUrl, "lean_event_control_plane");
const iecUrl = withDatabase(sourceUrl, "lean_event_t_iec");
const demoUrl = withDatabase(sourceUrl, "lean_event_t_demo");

// Verify connections
const cp = neon(controlPlaneUrl);
const iec = neon(iecUrl);
const demo = neon(demoUrl);
const cpDb = await cp`select current_database() as db`;
const iecDb = await iec`select current_database() as db`;
const demoDb = await demo`select current_database() as db`;
console.log(`VERIFY_CP=${cpDb[0].db}`);
console.log(`VERIFY_IEC=${iecDb[0].db}`);
console.log(`VERIFY_DEMO=${demoDb[0].db}`);

if (
  cpDb[0].db !== "lean_event_control_plane" ||
  iecDb[0].db !== "lean_event_t_iec" ||
  demoDb[0].db !== "lean_event_t_demo"
) {
  console.error("VERIFY_FAIL");
  process.exit(1);
}

upsertEnv(".env.local", {
  LEAN_EVENT_CONTROL_PLANE_DATABASE_URL: controlPlaneUrl,
  LEAN_EVENT_TENANT_IEC_DATABASE_URL: iecUrl,
  LEAN_EVENT_TENANT_DEMO_DATABASE_URL: demoUrl,
});

console.log("ENV_UPDATED=.env.local");
console.log("PROVISION_NEON_OK");
console.log(`CREATED_NOW=${missing.join(",") || "(none-already-present)"}`);
