/**
 * After creating lean-event-iec store, Vercel may overwrite BLOB_READ_WRITE_TOKEN.
 * This script:
 * 1) copies current BLOB_READ_WRITE_TOKEN -> LEAN_EVENT_TENANT_IEC_BLOB_TOKEN
 * 2) restores BLOB_READ_WRITE_TOKEN from production env pull (legacy leanme-event store)
 * Never prints secret values.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    map.set(line.slice(0, idx), line.slice(idx + 1));
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

const localPath = ".env.local";
const local = parseEnv(readFileSync(localPath, "utf8"));
const currentBlob = local.get("BLOB_READ_WRITE_TOKEN");
if (!currentBlob) {
  console.error("BLOB_READ_WRITE_TOKEN missing in .env.local");
  process.exit(1);
}

upsertEnv(localPath, {
  LEAN_EVENT_TENANT_IEC_BLOB_TOKEN: currentBlob,
});
console.log("IEC_BLOB_REF=SET_FROM_CURRENT_BLOB");

const pullPath = ".env.vercel-production.pull";
const pull = spawnSync(
  "npx",
  [
    "--yes",
    "vercel",
    "env",
    "pull",
    pullPath,
    "--environment",
    "production",
    "--yes",
    "--non-interactive",
  ],
  { encoding: "utf8", shell: true }
);

if (pull.status !== 0) {
  console.error("PROD_ENV_PULL_FAIL");
  console.error(pull.stderr || pull.stdout);
  process.exit(1);
}

const prod = parseEnv(readFileSync(pullPath, "utf8"));
const legacyBlob = prod.get("BLOB_READ_WRITE_TOKEN");
if (!legacyBlob) {
  console.error("PROD_BLOB_MISSING");
  process.exit(1);
}

upsertEnv(localPath, {
  BLOB_READ_WRITE_TOKEN: legacyBlob,
});
console.log("LEGACY_BLOB_RESTORED_FROM_PRODUCTION");

try {
  unlinkSync(pullPath);
} catch {
  // ignore
}

const verify = parseEnv(readFileSync(localPath, "utf8"));
console.log(
  `HAS_IEC=${verify.get("LEAN_EVENT_TENANT_IEC_BLOB_TOKEN") ? "yes" : "no"}`
);
console.log(
  `HAS_LEGACY_BLOB=${verify.get("BLOB_READ_WRITE_TOKEN") ? "yes" : "no"}`
);
console.log(
  `TOKENS_DIFFER=${
    verify.get("LEAN_EVENT_TENANT_IEC_BLOB_TOKEN") !==
    verify.get("BLOB_READ_WRITE_TOKEN")
      ? "yes"
      : "no"
  }`
);
console.log("FIX_BLOB_ENV_OK");
