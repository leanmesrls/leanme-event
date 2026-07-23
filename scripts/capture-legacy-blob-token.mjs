/**
 * Capture production BLOB_READ_WRITE_TOKEN into LEAN_EVENT_LEGACY_BLOB_TOKEN
 * without overwriting tenant demo/iec tokens.
 * Never prints the secret.
 *
 * Usage: node scripts/capture-legacy-blob-token.mjs [production]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const environment = process.argv[2] || "production";
const localPath = ".env.local";
const targetKey = "LEAN_EVENT_LEGACY_BLOB_TOKEN";

function upsertEnv(filePath, entries) {
  let content = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (content.length > 0 && !content.endsWith("\n")) content += "\n";
  for (const [name, value] of Object.entries(entries)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    if (pattern.test(content)) content = content.replace(pattern, line);
    else content += `${line}\n`;
  }
  writeFileSync(filePath, content, "utf8");
}

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    map.set(
      line.slice(0, idx).trim(),
      line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    );
  }
  return map;
}

const marker = `__CAPTURE_BLOB_READ_WRITE_TOKEN__=`;
const result = spawnSync(
  "npx.cmd",
  [
    "--yes",
    "vercel",
    "env",
    "run",
    "--environment",
    environment,
    "--",
    "node",
    "scripts/_print-env-marker.mjs",
    "BLOB_READ_WRITE_TOKEN",
  ],
  { encoding: "utf8", shell: true, cwd: process.cwd() }
);

const out = String(result.stdout || "");
const idx = out.lastIndexOf(marker);
if (idx < 0) {
  console.error("FAIL: capture marker not found");
  console.error(`STATUS=${result.status}`);
  console.error((result.stderr || "").slice(0, 400));
  process.exit(1);
}

const value = out.slice(idx + marker.length).trim();
const valid = /^vercel_blob_rw_/.test(value) && value.length >= 40;
if (!valid) {
  console.error(`FAIL: captured value invalid len=${value.length}`);
  process.exit(1);
}

upsertEnv(localPath, { [targetKey]: value });
const local = parseEnv(readFileSync(localPath, "utf8"));
const demo = local.get("LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN") || "";
const iec = local.get("LEAN_EVENT_TENANT_IEC_BLOB_TOKEN") || "";
const legacy = local.get(targetKey) || "";
const fp = (v) => createHash("sha256").update(v).digest("hex").slice(0, 12);

console.log(`CAPTURED=${targetKey}`);
console.log(`LEN=${legacy.length}`);
console.log(`VALID=yes`);
console.log(`FP=${fp(legacy)}`);
console.log(`EQ_DEMO=${legacy && legacy === demo ? "yes" : "no"}`);
console.log(`EQ_IEC=${legacy && legacy === iec ? "yes" : "no"}`);
console.log("CAPTURE_LEGACY_BLOB_OK");
