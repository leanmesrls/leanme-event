/**
 * Restore BLOB_READ_WRITE_TOKEN in .env.local from a Vercel production env pull
 * when the local value is missing/placeholder/invalid.
 *
 * Does NOT touch LEAN_EVENT_TENANT_*_BLOB_TOKEN.
 *
 * Usage:
 *   node scripts/restore-legacy-blob-token.mjs [.env.vercel.pull]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const pullPath = process.argv[2] || ".env.vercel.pull";
const localPath = ".env.local";

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
  let content = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (content.length > 0 && !content.endsWith("\n")) content += "\n";
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(content)) content = content.replace(pattern, line);
    else content += `${line}\n`;
  }
  writeFileSync(filePath, content, "utf8");
}

function looksValidBlobToken(value) {
  return Boolean(value && /^vercel_blob_rw_/.test(value) && value.length >= 40);
}

if (!existsSync(localPath)) {
  console.error("FAIL: .env.local missing");
  process.exit(1);
}
if (!existsSync(pullPath)) {
  console.error(`FAIL: pull file missing: ${pullPath}`);
  process.exit(1);
}

const local = parseEnv(readFileSync(localPath, "utf8"));
const pull = parseEnv(readFileSync(pullPath, "utf8"));
const current = local.get("BLOB_READ_WRITE_TOKEN") || "";
const fromPull = pull.get("BLOB_READ_WRITE_TOKEN") || "";

console.log(`CURRENT_VALID=${looksValidBlobToken(current) ? "yes" : "no"}`);
console.log(`PULL_VALID=${looksValidBlobToken(fromPull) ? "yes" : "no"}`);

if (looksValidBlobToken(current)) {
  console.log("NO_CHANGE_NEEDED");
  process.exit(0);
}

if (!looksValidBlobToken(fromPull)) {
  console.error("FAIL: production pull does not contain a valid BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

upsertEnv(localPath, { BLOB_READ_WRITE_TOKEN: fromPull });
const verify = parseEnv(readFileSync(localPath, "utf8"));
console.log(
  `RESTORED_VALID=${looksValidBlobToken(verify.get("BLOB_READ_WRITE_TOKEN") || "") ? "yes" : "no"}`
);
console.log("RESTORE_LEGACY_BLOB_OK");
