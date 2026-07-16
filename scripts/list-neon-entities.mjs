/**
 * Elenco tabelle + eventi/contatti da Neon.
 * Usage: node scripts/list-neon-entities.mjs [--env-file=.env.vercel.pull]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { loadEnvFileIntoProcess } from "./load-env-file.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
const envFile = envFileArg
  ? path.join(root, envFileArg.slice("--env-file=".length))
  : path.join(root, ".env.local");

loadEnvFileIntoProcess(path.join(root, ".env.local"), { override: false });
loadEnvFileIntoProcess(envFile, { override: true });

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Manca LEAN_EVENT_DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log("=== TABELLE (public) ===");
for (const t of tables) {
  console.log(`- ${t.table_name}`);
}

const counts = await sql`
  SELECT entity_type, COUNT(*)::int AS n
  FROM lean_event_entities
  GROUP BY entity_type
  ORDER BY entity_type
`;
console.log("\n=== CONTEGGI PER TIPO ===");
for (const c of counts) {
  console.log(`${c.entity_type}: ${c.n}`);
}

const events = await sql`
  SELECT
    id,
    tenant_id,
    revision,
    deleted_at IS NOT NULL AS in_trash,
    payload->>'title' AS title,
    payload->>'cdc' AS cdc,
    updated_at
  FROM lean_event_entities
  WHERE entity_type = 'event'
  ORDER BY tenant_id, updated_at DESC
`;

console.log("\n=== EVENTI ===");
if (events.length === 0) {
  console.log("(nessuno)");
} else {
  for (const e of events) {
    console.log(
      `[${e.tenant_id}] ${e.title ?? "(senza titolo)"} | cdc=${e.cdc ?? "—"} | rev=${e.revision} | trash=${e.in_trash} | id=${e.id}`
    );
  }
}

const contacts = await sql`
  SELECT
    id,
    tenant_id,
    revision,
    deleted_at IS NOT NULL AS in_trash,
    payload->>'firstName' AS first_name,
    payload->>'lastName' AS last_name,
    payload->>'email' AS email,
    updated_at
  FROM lean_event_entities
  WHERE entity_type = 'contact'
  ORDER BY tenant_id, payload->>'lastName', payload->>'firstName'
`;

console.log("\n=== CONTATTI ===");
if (contacts.length === 0) {
  console.log("(nessuno)");
} else {
  for (const c of contacts) {
    const name = [c.last_name, c.first_name].filter(Boolean).join(" ") || "(senza nome)";
    console.log(
      `[${c.tenant_id}] ${name} | ${c.email || "—"} | rev=${c.revision} | trash=${c.in_trash} | id=${c.id}`
    );
  }
}
