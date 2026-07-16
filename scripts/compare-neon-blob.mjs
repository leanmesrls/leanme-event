/**
 * Confronta Neon vs Blob: evidenzia entità solo in Neon (orfani locali).
 * Usage: node scripts/compare-neon-blob.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { list, get } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { loadEnvFileIntoProcess } from "./load-env-file.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFileIntoProcess(path.join(root, ".env.local"), { override: true });

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url || !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  console.error("Servono LEAN_EVENT_DATABASE_URL e BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const COLLECTIONS = [
  { entityType: "event", blobRoot: "lean-event/events" },
  { entityType: "contact", blobRoot: "lean-event/contacts" },
  { entityType: "venue", blobRoot: "lean-event/venues" },
  { entityType: "assignment", blobRoot: "lean-event/event-assignments" },
  { entityType: "supplier", blobRoot: "lean-event/suppliers" },
  { entityType: "workspace", blobRoot: "lean-event/workspaces" },
];

async function blobIds(tenantId, blobRoot) {
  const prefix = `${blobRoot}/${tenantId}/`;
  const ids = new Set();
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith(".json")) continue;
      const id = blob.pathname.split("/").pop().replace(/\.json$/, "");
      ids.add(id);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return ids;
}

const sql = neon(url);
const neonRows = await sql`
  SELECT tenant_id, entity_type, id,
         payload->>'title' AS title,
         payload->>'firstName' AS first_name,
         payload->>'lastName' AS last_name,
         payload->>'email' AS email
  FROM lean_event_entities
  ORDER BY tenant_id, entity_type, id
`;

const tenants = [...new Set(neonRows.map((r) => r.tenant_id))];
const blobMap = new Map(); // key tenant|type -> Set ids

for (const tenantId of tenants) {
  for (const col of COLLECTIONS) {
    const ids = await blobIds(tenantId, col.blobRoot);
    blobMap.set(`${tenantId}|${col.entityType}`, ids);
  }
}

const orphans = [];
for (const row of neonRows) {
  const set = blobMap.get(`${row.tenant_id}|${row.entity_type}`) || new Set();
  if (!set.has(row.id)) {
    orphans.push(row);
  }
}

console.log(`Neon rows: ${neonRows.length}`);
console.log(`Orfani (in Neon ma NON su Blob): ${orphans.length}\n`);

for (const row of orphans) {
  const label =
    row.entity_type === "contact"
      ? `${row.last_name || ""} ${row.first_name || ""} <${row.email || ""}>`.trim()
      : row.title || row.id;
  console.log(
    `- [${row.tenant_id}] ${row.entity_type} | ${label} | id=${row.id}`
  );
}

if (process.argv.includes("--delete-orphans")) {
  console.log("\nDeleting orphans from Neon...");
  let n = 0;
  for (const row of orphans) {
    await sql`
      DELETE FROM lean_event_entities
      WHERE tenant_id = ${row.tenant_id}
        AND entity_type = ${row.entity_type}
        AND id = ${row.id}
    `;
    n += 1;
  }
  console.log(`Deleted: ${n}`);
} else {
  console.log("\nPer rimuoverli da Neon: node scripts/compare-neon-blob.mjs --delete-orphans");
}
