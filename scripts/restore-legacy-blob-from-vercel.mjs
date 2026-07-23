/**
 * Restore BLOB_READ_WRITE_TOKEN from Vercel production via `vercel env get`
 * (env pull may redact as [SENSITIVE]).
 * Never prints the secret value.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
  const v = (value || "").replace(/^["']|["']$/g, "");
  return /^vercel_blob_rw_/.test(v) && v.length >= 40;
}

const current = parseEnv(readFileSync(localPath, "utf8")).get("BLOB_READ_WRITE_TOKEN") || "";
if (looksValidBlobToken(current)) {
  console.log("NO_CHANGE_NEEDED");
  process.exit(0);
}

const result = spawnSync(
  "npx.cmd",
  ["--yes", "vercel", "env", "get", "BLOB_READ_WRITE_TOKEN", "production", "--non-interactive"],
  { encoding: "utf8", shell: true, cwd: process.cwd() }
);

if (result.status !== 0) {
  console.error("VERCEL_ENV_GET_FAIL");
  console.error((result.stderr || result.stdout || "").slice(0, 400));
  process.exit(1);
}

const raw = String(result.stdout || "");
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((l) => !l.startsWith("Vercel CLI") && !l.startsWith("npm warn") && !l.startsWith("Retrieving"));

let token = "";
for (const line of lines) {
  const candidate = line.replace(/^BLOB_READ_WRITE_TOKEN=/, "").replace(/^["']|["']$/g, "");
  if (looksValidBlobToken(candidate)) {
    token = candidate;
    break;
  }
}

if (!token) {
  // fallback: search anywhere in stdout
  const match = raw.match(/vercel_blob_rw_[A-Za-z0-9_]+/);
  token = match?.[0] || "";
}

if (!looksValidBlobToken(token)) {
  console.error("FAIL: could not extract valid BLOB_READ_WRITE_TOKEN from vercel env get");
  console.error(`STDOUT_LEN=${raw.length}`);
  process.exit(1);
}

upsertEnv(localPath, { BLOB_READ_WRITE_TOKEN: token });
const verify = parseEnv(readFileSync(localPath, "utf8")).get("BLOB_READ_WRITE_TOKEN") || "";
console.log(`RESTORED_VALID=${looksValidBlobToken(verify) ? "yes" : "no"}`);
console.log("RESTORE_LEGACY_BLOB_FROM_VERCEL_OK");
