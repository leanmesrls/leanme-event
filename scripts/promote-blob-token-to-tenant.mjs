/**
 * Copy current BLOB_READ_WRITE_TOKEN -> LEAN_EVENT_TENANT_<SLUG>_BLOB_TOKEN
 * without printing secrets.
 *
 * Usage: node scripts/promote-blob-token-to-tenant.mjs demo
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const slug = (process.argv[2] || "").trim().toLowerCase();
if (!slug) {
  console.error("Usage: node scripts/promote-blob-token-to-tenant.mjs <tenantSlug>");
  process.exit(1);
}

const localPath = ".env.local";
if (!existsSync(localPath)) {
  console.error("FAIL: .env.local missing");
  process.exit(1);
}

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    map.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  }
  return map;
}

function upsertEnv(filePath, entries) {
  let content = readFileSync(filePath, "utf8");
  if (content.length > 0 && !content.endsWith("\n")) content += "\n";
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(content)) content = content.replace(pattern, line);
    else content += `${line}\n`;
  }
  writeFileSync(filePath, content, "utf8");
}

const env = parseEnv(readFileSync(localPath, "utf8"));
const blob = (env.get("BLOB_READ_WRITE_TOKEN") || "").replace(/^["']|["']$/g, "");
if (!/^vercel_blob_rw_/.test(blob) || blob.length < 40) {
  console.error("FAIL: BLOB_READ_WRITE_TOKEN invalid");
  process.exit(1);
}

const key = `LEAN_EVENT_TENANT_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_BLOB_TOKEN`;
upsertEnv(localPath, { [key]: blob });

const after = parseEnv(readFileSync(localPath, "utf8"));
const saved = (after.get(key) || "").replace(/^["']|["']$/g, "");
console.log(`TARGET=${key}`);
console.log(`SAVED=${saved === blob && /^vercel_blob_rw_/.test(saved) ? "yes" : "no"}`);
console.log(`LEN=${saved.length}`);
console.log("PROMOTE_BLOB_OK");
