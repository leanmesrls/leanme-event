/**
 * Elenca eventi/contatti dal Blob produzione (sola lettura).
 * Usage: node scripts/list-blob-entities.mjs [.env.vercel.pull]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { list, get } from "@vercel/blob";
import { loadEnvFileIntoProcess } from "./load-env-file.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envArg = process.argv[2] || ".env.vercel.pull";

loadEnvFileIntoProcess(path.join(root, ".env.local"), { override: false });
loadEnvFileIntoProcess(path.join(root, envArg), { override: true });

const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
if (!blobEnabled) {
  console.error(
    "Manca BLOB_READ_WRITE_TOKEN. Usa: node scripts/list-blob-entities.mjs .env.vercel.pull"
  );
  process.exit(1);
}

function tenantsFromEnv() {
  const json = process.env.LEAN_EVENT_TENANTS_JSON?.trim();
  if (!json) return [];
  try {
    return (JSON.parse(json).tenants ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
    }));
  } catch {
    return [];
  }
}

async function listJson(prefix) {
  const pathnames = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    pathnames.push(
      ...page.blobs.map((b) => b.pathname).filter((p) => p.endsWith(".json"))
    );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return pathnames;
}

async function readJson(pathname) {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result?.stream) return null;
  const raw = await new Response(result.stream).text();
  return JSON.parse(raw);
}

const tenants = tenantsFromEnv();
console.log("=== TENANT (da LEAN_EVENT_TENANTS_JSON) ===");
for (const t of tenants) {
  console.log(`- ${t.slug || t.id} (${t.id}) ${t.name || ""}`);
}

const collections = [
  { label: "eventi", root: "lean-event/events" },
  { label: "contatti", root: "lean-event/contacts" },
];

for (const tenant of tenants) {
  console.log(`\n######## Tenant ${tenant.slug || tenant.id} ########`);
  for (const col of collections) {
    const paths = await listJson(`${col.root}/${tenant.id}/`);
    console.log(`\n=== ${col.label.toUpperCase()} Blob (${paths.length}) ===`);
    for (const pathname of paths) {
      try {
        const entity = await readJson(pathname);
        if (!entity) continue;
        if (col.label === "eventi") {
          console.log(
            `- ${entity.title || "(senza titolo)"} | cdc=${entity.cdc || "—"} | trash=${Boolean(entity.deletedAt)} | id=${entity.id}`
          );
        } else {
          const name = [entity.lastName, entity.firstName]
            .filter(Boolean)
            .join(" ");
          console.log(
            `- ${name || "(senza nome)"} | ${entity.email || "—"} | trash=${Boolean(entity.deletedAt)} | id=${entity.id}`
          );
        }
      } catch (error) {
        console.warn(`Skip ${pathname}:`, error.message);
      }
    }
  }
}
