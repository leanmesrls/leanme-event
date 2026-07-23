/**
 * Copy blobs for one tenant from legacy store → dedicated tenant store.
 *
 * Source auth (first match):
 *   1) LEAN_EVENT_LEGACY_BLOB_TOKEN / BLOB_READ_WRITE_TOKEN if valid RW and != dest
 *   2) OIDC: VERCEL_OIDC_TOKEN + LEAN_EVENT_LEGACY_BLOB_STORE_ID (or BLOB_STORE_ID)
 *      optionally loaded from --source-env=.env.vercel.production.pull
 *
 * Dest:
 *   LEAN_EVENT_TENANT_<SLUG>_BLOB_TOKEN
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-blob-tenant-store.mjs demo \
 *     --source-env=.env.vercel.production.pull [--dry]
 */
import { readFileSync, existsSync } from "node:fs";
import { list, get, put } from "@vercel/blob";

const tenantId = process.argv[2];
const dry = process.argv.includes("--dry");
const sourceEnvArg = process.argv.find((a) => a.startsWith("--source-env="));
const sourceEnvPath = sourceEnvArg?.slice("--source-env=".length);

if (!tenantId) {
  console.error(
    "Usage: node --env-file=.env.local scripts/migrate-blob-tenant-store.mjs <tenantSlug> [--source-env=FILE] [--dry]"
  );
  process.exit(1);
}

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(line.slice(0, idx).trim(), value);
  }
  return map;
}

function isRw(token) {
  return Boolean(token && /^vercel_blob_rw_/.test(token) && token.length >= 40);
}

if (sourceEnvPath && existsSync(sourceEnvPath)) {
  const pulled = parseEnv(readFileSync(sourceEnvPath, "utf8"));
  for (const [key, value] of pulled.entries()) {
    if (!process.env[key] || key === "VERCEL_OIDC_TOKEN" || key === "BLOB_STORE_ID") {
      process.env[key] = value;
    }
  }
  // Prefer pulled OIDC/store id for legacy source even if local has other values
  if (pulled.get("VERCEL_OIDC_TOKEN")) {
    process.env.VERCEL_OIDC_TOKEN = pulled.get("VERCEL_OIDC_TOKEN");
  }
  if (pulled.get("BLOB_STORE_ID")) {
    process.env.LEAN_EVENT_LEGACY_BLOB_STORE_ID =
      process.env.LEAN_EVENT_LEGACY_BLOB_STORE_ID || pulled.get("BLOB_STORE_ID");
  }
}

const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const destToken = process.env[`LEAN_EVENT_TENANT_${slug}_BLOB_TOKEN`]?.trim();
if (!isRw(destToken)) {
  console.error(`FAIL: LEAN_EVENT_TENANT_${slug}_BLOB_TOKEN missing/invalid`);
  process.exit(2);
}

const legacyRw =
  process.env.LEAN_EVENT_LEGACY_BLOB_TOKEN?.trim() ||
  process.env.BLOB_READ_WRITE_TOKEN?.trim();
const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
const storeId = (
  process.env.LEAN_EVENT_LEGACY_BLOB_STORE_ID ||
  process.env.BLOB_STORE_ID ||
  ""
).trim();

let sourceMode = "";
let sourceOpts = {};

if (isRw(legacyRw) && legacyRw !== destToken) {
  sourceMode = "rw-token";
  sourceOpts = { token: legacyRw };
} else if (oidcToken && storeId) {
  sourceMode = "oidc";
  sourceOpts = { oidcToken, storeId };
} else {
  console.error(
    "FAIL: no legacy source auth (need distinct RW token, or OIDC+BLOB_STORE_ID via --source-env)"
  );
  process.exit(2);
}

const PREFIXES = [
  `lean-event/events/${tenantId}/`,
  `lean-event/contacts/${tenantId}/`,
  `lean-event/venues/${tenantId}/`,
  `lean-event/event-assignments/${tenantId}/`,
  `lean-event/workspaces/${tenantId}/`,
  `lean-event/suppliers/${tenantId}/`,
  `lean-event/event-suppliers/${tenantId}/`,
  `lean-event/event-chats/${tenantId}/`,
  `lean-event/travel-docs/${tenantId}/`,
  `lean-event/documents/${tenantId}/`,
];

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000, ...sourceOpts });
    blobs.push(...(page.blobs || []));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

console.log(`TENANT=${tenantId}`);
console.log(`MODE=${dry ? "dry" : "write"}`);
console.log(`SOURCE_MODE=${sourceMode}`);
console.log(`SOURCE_STORE=${storeId || "(rw-token)"}`);

let total = 0;
let copied = 0;
let failed = 0;

for (const prefix of PREFIXES) {
  const blobs = await listAll(prefix);
  console.log(`PREFIX=${prefix} count=${blobs.length}`);
  total += blobs.length;
  if (dry) continue;

  for (const blob of blobs) {
    const pathname = blob.pathname;
    try {
      const result = await get(pathname, {
        access: "private",
        useCache: false,
        ...sourceOpts,
      });
      if (!result?.stream) {
        throw new Error("empty stream");
      }
      const body = Buffer.from(await new Response(result.stream).arrayBuffer());
      await put(pathname, body, {
        access: "private",
        token: destToken,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: blob.contentType || undefined,
      });
      copied += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `FAIL ${pathname}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

console.log(`TOTAL_SOURCE=${total}`);
console.log(`COPIED=${copied}`);
console.log(`FAILED=${failed}`);
console.log(failed === 0 ? "BLOB_MIGRATE_OK" : "BLOB_MIGRATE_PARTIAL");
process.exit(failed === 0 ? 0 : 1);
