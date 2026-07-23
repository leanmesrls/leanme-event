/**
 * Inspect token shape in an env file without printing secrets.
 * Usage: node scripts/inspect-env-token-shape.mjs .env.vercel.pull BLOB_READ_WRITE_TOKEN
 */
import { readFileSync, existsSync } from "node:fs";

const file = process.argv[2] || ".env.local";
const key = process.argv[3] || "BLOB_READ_WRITE_TOKEN";

if (!existsSync(file)) {
  console.error(`FAIL: missing ${file}`);
  process.exit(1);
}

const content = readFileSync(file, "utf8");
const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
const value = (match?.[1] || "").trim().replace(/^["']|["']$/g, "");

console.log(`FILE=${file}`);
console.log(`KEY=${key}`);
console.log(`PRESENT=${value ? "yes" : "no"}`);
console.log(`LEN=${value.length}`);
console.log(`SENSITIVE_PLACEHOLDER=${value === "[SENSITIVE]" ? "yes" : "no"}`);
console.log(`PREFIX=${JSON.stringify(value.slice(0, 12))}`);
console.log(`MATCHES_VERCEL_BLOB_RW=${/^vercel_blob_rw_/.test(value) ? "yes" : "no"}`);
console.log(`HAS_UNDERSCORE=${value.includes("_") ? "yes" : "no"}`);
