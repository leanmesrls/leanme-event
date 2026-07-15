/**
 * Dry-run migrazione Fase B: conta entità JSON per tenant (filesystem locale).
 * Non scrive su Neon. Non modifica Blob.
 *
 * Usage: npm run lean-event:migrate-neon-dry
 */
import fs from "node:fs/promises";
import path from "node:path";

const DATA_ROOT =
  process.env.LEAN_EVENT_DATA_DIR?.trim() ||
  process.env.LEANYOU_DATA_DIR?.trim() ||
  path.join(process.cwd(), ".lean-event-data");

const COLLECTIONS = [
  { entityType: "event", fsDir: "events" },
  { entityType: "contact", fsDir: "contacts" },
  { entityType: "supplier", fsDir: "suppliers" },
  { entityType: "venue", fsDir: "venues" },
  { entityType: "assignment", fsDir: "event-assignments" },
  { entityType: "workspace", fsDir: "workspaces" },
];

async function listTenantIds() {
  const tenantsPath = path.join(DATA_ROOT, "tenants.json");
  try {
    const raw = await fs.readFile(tenantsPath, "utf8");
    const data = JSON.parse(raw);
    return (data.tenants ?? []).map((t) => t.id);
  } catch {
    const dirs = await fs.readdir(DATA_ROOT, { withFileTypes: true }).catch(() => []);
    // Fallback: infer from events/ subdirs if present
    const eventsDir = path.join(DATA_ROOT, "events");
    try {
      const entries = await fs.readdir(eventsDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return dirs.filter((d) => d.isDirectory()).map((d) => d.name);
    }
  }
}

async function countJson(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function main() {
  console.log(`Data root: ${DATA_ROOT}`);
  console.log("Dry-run only — nessuna scrittura Neon/Blob.\n");

  const tenantIds = await listTenantIds();
  if (tenantIds.length === 0) {
    console.log("Nessun tenant trovato in locale. In produzione usare list Blob + DATABASE_URL.");
    return;
  }

  const totals = Object.fromEntries(COLLECTIONS.map((c) => [c.entityType, 0]));

  for (const tenantId of tenantIds) {
    console.log(`Tenant: ${tenantId}`);
    for (const collection of COLLECTIONS) {
      const dir = path.join(DATA_ROOT, collection.fsDir, tenantId);
      const n = await countJson(dir);
      totals[collection.entityType] += n;
      console.log(`  ${collection.entityType.padEnd(12)} ${n}`);
    }
    console.log("");
  }

  console.log("Totale (tutti i tenant):");
  for (const [type, n] of Object.entries(totals)) {
    console.log(`  ${type.padEnd(12)} ${n}`);
  }
  console.log("\nProssimi passi Fase B:");
  console.log("  1. Creare DB Neon e applicare docs/sql/001_lean_event_schema.sql");
  console.log("  2. Impostare LEAN_EVENT_DATABASE_URL (o DATABASE_URL) su Vercel");
  console.log("  3. Attivare dual-write + script migrazione Blob → Neon");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
