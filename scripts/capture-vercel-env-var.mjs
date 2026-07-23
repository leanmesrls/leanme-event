/**
 * Capture one env var from `vercel env run` into .env.local without printing it.
 *
 * Usage:
 *   node scripts/capture-vercel-env-var.mjs BLOB_READ_WRITE_TOKEN [production]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const key = process.argv[2];
const environment = process.argv[3] || "production";
const localPath = ".env.local";

if (!key) {
  console.error("Usage: node scripts/capture-vercel-env-var.mjs <ENV_NAME> [environment]");
  process.exit(1);
}

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

const marker = `__CAPTURE_${key}__=`;
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
    key,
  ],
  { encoding: "utf8", shell: true, cwd: process.cwd() }
);

const out = String(result.stdout || "");
const idx = out.lastIndexOf(marker);
if (idx < 0) {
  console.error("FAIL: capture marker not found");
  console.error(`STATUS=${result.status}`);
  console.error((result.stderr || "").slice(0, 300));
  process.exit(1);
}

const value = out.slice(idx + marker.length).trim();
if (!value || value === "[SENSITIVE]" || value.length < 20) {
  console.error(`FAIL: captured value invalid len=${value.length}`);
  process.exit(1);
}

upsertEnv(localPath, { [key]: value });
console.log(`CAPTURED=${key}`);
console.log(`LEN=${value.length}`);
console.log(`VALID_PREFIX=${/^vercel_blob_rw_/.test(value) ? "yes" : "n/a"}`);
console.log("CAPTURE_ENV_OK");
