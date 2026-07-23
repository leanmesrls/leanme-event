/**
 * Renames LeonardoEvent* product domain types to TenantEvent*.
 * Word-boundary aware to avoid mangling LeonardoEventiPath, etc.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["types", "lib", "components", "app", "core", "modules", "contracts"];
const replacements = [
  ["LeonardoEventCategoryId", "TenantEventCategoryId"],
  ["LeonardoEventStatus", "TenantEventStatus"],
  ["LeonardoEventType", "TenantEventType"],
  ["LeonardoEventVenueDetails", "TenantEventVenueDetails"],
  ["LeonardoEventSponsorRecord", "TenantEventSponsorRecord"],
  ["LeonardoEventHotelBlock", "TenantEventHotelBlock"],
  ["LeonardoEventHotelConfig", "TenantEventHotelConfig"],
  ["LeonardoEventChatAttachment", "TenantEventChatAttachment"],
  ["LeonardoEventChatMessage", "TenantEventChatMessage"],
  ["LeonardoEventRegistration", "TenantEventRegistration"],
  ["LeonardoEventRoleCategory", "TenantEventRoleCategory"],
  ["normalizeLeonardoEvent", "normalizeTenantEvent"],
  ["LeonardoEvent", "TenantEvent"],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function replaceBounded(content, from, to) {
  const pattern = new RegExp(`\\b${from}\\b`, "g");
  return content.replace(pattern, to);
}

let changedFiles = 0;
for (const root of roots) {
  const abs = join(process.cwd(), root);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  for (const file of walk(abs)) {
    let content = readFileSync(file, "utf8");
    const original = content;
    for (const [from, to] of replacements) {
      content = replaceBounded(content, from, to);
    }
    if (content !== original) {
      writeFileSync(file, content, "utf8");
      changedFiles += 1;
    }
  }
}

console.log(`TENANT_EVENT_CODEMOD_OK files=${changedFiles}`);
