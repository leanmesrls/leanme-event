/**
 * Compare blob token presence/equality across env files WITHOUT printing secrets.
 * Usage: node scripts/compare-blob-token-sources.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

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

function shape(v) {
  if (!v) return { present: false, valid: false, fp: null, len: 0 };
  const valid = /^vercel_blob_rw_/.test(v) && v.length >= 40;
  const fp = createHash("sha256").update(v).digest("hex").slice(0, 12);
  return { present: true, valid, fp, len: v.length };
}

const files = [
  ".env.local",
  ".env.vercel.pull",
  ".env.vercel.production.pull",
];

const keys = [
  "BLOB_READ_WRITE_TOKEN",
  "LEAN_EVENT_TENANT_IEC_BLOB_TOKEN",
  "LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN",
  "LEAN_EVENT_LEGACY_BLOB_TOKEN",
];

const table = [];
for (const file of files) {
  if (!existsSync(file)) {
    console.log(`FILE=${file} MISSING`);
    continue;
  }
  const env = parseEnv(readFileSync(file, "utf8"));
  for (const key of keys) {
    const s = shape(env.get(key));
    table.push({ file, key, ...s });
    console.log(
      `${file} ${key} present=${s.present ? "yes" : "no"} valid=${s.valid ? "yes" : "no"} len=${s.len} fp=${s.fp || "-"}`
    );
  }
}

// Equality matrix for BLOB across files
const blobFps = table
  .filter((r) => r.key === "BLOB_READ_WRITE_TOKEN" && r.fp)
  .map((r) => `${r.file}:${r.fp}`);
console.log(`BLOB_FPS=${blobFps.join(" | ") || "(none)"}`);
