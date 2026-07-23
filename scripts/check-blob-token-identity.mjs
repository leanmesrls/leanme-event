/**
 * Compare blob token identities without printing secrets.
 */
import { readFileSync } from "node:fs";

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    map.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, ""));
  }
  return map;
}

function ok(v) {
  return /^vercel_blob_rw_/.test(v || "") && (v || "").length >= 40;
}

const env = parseEnv(readFileSync(".env.local", "utf8"));
const blob = env.get("BLOB_READ_WRITE_TOKEN") || "";
const iec = env.get("LEAN_EVENT_TENANT_IEC_BLOB_TOKEN") || "";
const demo = env.get("LEAN_EVENT_TENANT_DEMO_BLOB_TOKEN") || "";

console.log(`BLOB_OK=${ok(blob) ? "yes" : "no"}`);
console.log(`IEC_OK=${ok(iec) ? "yes" : "no"}`);
console.log(`DEMO_OK=${ok(demo) ? "yes" : "no"}`);
console.log(`BLOB_EQ_IEC=${blob && blob === iec ? "yes" : "no"}`);
console.log(`BLOB_EQ_DEMO=${blob && blob === demo ? "yes" : "no"}`);
console.log(`IEC_EQ_DEMO=${iec && iec === demo ? "yes" : "no"}`);
