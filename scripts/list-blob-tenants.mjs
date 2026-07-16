/**
 * Elenca i tenantId presenti su Blob sotto lean-event collections.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { list } from "@vercel/blob";
import { loadEnvFileIntoProcess } from "./load-env-file.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFileIntoProcess(path.join(root, ".env.local"), { override: true });

if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  console.error("Manca BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const roots = [
  "lean-event/events/",
  "lean-event/contacts/",
  "lean-event/workspaces/",
  "lean-event/venues/",
  "lean-event/event-assignments/",
];

const tenants = new Map();

for (const prefix of roots) {
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000, mode: "folded" });
    // folded may not work - fall back to parsing pathnames
    for (const blob of page.blobs ?? []) {
      const parts = blob.pathname.replace(prefix, "").split("/");
      const tenantId = parts[0];
      if (!tenantId) continue;
      const entry = tenants.get(tenantId) || {
        id: tenantId,
        events: 0,
        contacts: 0,
        venues: 0,
        assignments: 0,
        workspaces: 0,
      };
      if (prefix.includes("/events/")) entry.events += 1;
      if (prefix.includes("/contacts/")) entry.contacts += 1;
      if (prefix.includes("/venues/")) entry.venues += 1;
      if (prefix.includes("/event-assignments/")) entry.assignments += 1;
      if (prefix.includes("/workspaces/")) entry.workspaces += 1;
      tenants.set(tenantId, entry);
    }
    // Also try folders if API returns them
    for (const folder of page.folders ?? []) {
      const tenantId = folder.replace(prefix, "").replace(/\/$/, "");
      if (tenantId && !tenants.has(tenantId)) {
        tenants.set(tenantId, {
          id: tenantId,
          events: 0,
          contacts: 0,
          venues: 0,
          assignments: 0,
          workspaces: 0,
        });
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

console.log("=== Tenant ID trovati su Blob ===");
for (const t of tenants.values()) {
  console.log(
    `${t.id} | events=${t.events} contacts=${t.contacts} venues=${t.venues} assignments=${t.assignments} workspaces=${t.workspaces}`
  );
}
if (tenants.size === 0) {
  console.log("(nessun path trovato sotto lean-event/)");
}
