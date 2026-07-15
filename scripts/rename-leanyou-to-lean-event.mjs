#!/usr/bin/env node
/**
 * One-shot rename LeanYou → Lean Event (leanme-event repo).
 * Run after directory git mv (app/lean-event, lib/lean-event, …).
 */
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".next-prod",
  ".git",
  "dist",
  "out",
]);

const REPLACEMENTS = [
  // URLs (api first)
  ["/api/leanyou", "/api/lean-event"],
  ["/assets/official/leanyou/", "/assets/official/lean-event/"],
  ["/assets/leanyou/", "/assets/lean-event/"],
  ["/leanyou", "/lean-event"],
  // Blob / storage roots (after URL pass — avoid double-replace on paths)
  ['"leanyou/workspaces"', '"lean-event/workspaces"'],
  ['"leanyou/events"', '"lean-event/events"'],
  ['"leanyou/contacts"', '"lean-event/contacts"'],
  ['"leanyou/venues"', '"lean-event/venues"'],
  ['"leanyou/suppliers"', '"lean-event/suppliers"'],
  ['"leanyou/event-suppliers"', '"lean-event/event-suppliers"'],
  ['"leanyou/event-assignments"', '"lean-event/event-assignments"'],
  ['"leanyou/travel-docs"', '"lean-event/travel-docs"'],
  ['"leanyou/venue-covers"', '"lean-event/venue-covers"'],
  ['"leanyou/supplier-documents"', '"lean-event/supplier-documents"'],
  ['"leanyou/event-chat"', '"lean-event/event-chat"'],
  ['"leanyou/versions"', '"lean-event/versions"'],
  // Import paths
  ["@/lib/leanyou/", "@/lib/lean-event/"],
  ["@/components/leanyou/", "@/components/lean-event/"],
  ["@/types/leanyou-trash", "@/types/lean-event-trash"],
  ["@/types/leanyou", "@/types/lean-event"],
  ["data/leanyou/", "data/lean-event/"],
  // Env vars (code reads both via helpers where noted)
  ["LEANYOU_PROD_BUILD", "LEAN_EVENT_PROD_BUILD"],
  ["LEANYOU_SKIP_VERCEL_SYNC", "LEAN_EVENT_SKIP_VERCEL_SYNC"],
  ["LEANYOU_TENANTS_FILE", "LEAN_EVENT_TENANTS_FILE"],
  ["LEANYOU_TENANTS_JSON", "LEAN_EVENT_TENANTS_JSON"],
  ["LEANYOU_DATA_DIR", "LEAN_EVENT_DATA_DIR"],
  ["LEANYOU_SESSION_SECRET", "LEAN_EVENT_SESSION_SECRET"],
  [".leanyou-data", ".lean-event-data"],
  // Cookie & session
  ["leanyou_session", "lean_event_session"],
  // Constants
  ["LEANYOU_IMPORT_TEMPLATE_PATHS", "LEAN_EVENT_IMPORT_TEMPLATE_PATHS"],
  // Function / path helpers (leanyouX → leanEventX)
  ["leanyouLeonardo", "leanEventLeonardo"],
  ["leanyouTenant", "leanEventTenant"],
  ["leanyouLogin", "leanEventLogin"],
  ["leanyouRoot", "leanEventRoot"],
  ["isLegacyLeanYouLeonardoPath", "isLegacyLeanEventLeonardoPath"],
  ["mapLegacyLeanYouLeonardoPath", "mapLegacyLeanEventLeonardoPath"],
  // Types & interfaces
  ["LeanYouRevisionConflictError", "LeanEventRevisionConflictError"],
  ["LeanYouManagedEntityType", "LeanEventManagedEntityType"],
  ["LeanYouImportResult", "LeanEventImportResult"],
  ["LeanYouPromptTemplate", "LeanEventPromptTemplate"],
  ["LeanYouNavItem", "LeanEventNavItem"],
  ["LeanYouConfig", "LeanEventConfig"],
  ["LeanYouTenantsFile", "LeanEventTenantsFile"],
  ["LeanYouSession", "LeanEventSession"],
  ["LeanYouContact", "LeanEventContact"],
  ["LeanYouSupplier", "LeanEventSupplier"],
  ["LeanYouUserRole", "LeanEventUserRole"],
  ["LeanYouModule", "LeanEventModule"],
  ["LeanYouLeonardoCapabilities", "LeanEventLeonardoCapabilities"],
  // Components
  ["LeanYouUpgradeHint", "LeanEventUpgradeHint"],
  ["LeanYouTokenLogin", "LeanEventTokenLogin"],
  ["LeanYouLoginPageContent", "LeanEventLoginPageContent"],
  ["LeanYouLoginForm", "LeanEventLoginForm"],
  ["LeanYouShell", "LeanEventShell"],
  // Config getters
  ["getLeanYouConfig", "getLeanEventConfig"],
  ["getLeanYouPrompts", "getLeanEventPrompts"],
  // UI strings
  ["LeanYou ·", "Lean Event ·"],
  ["LeanYou", "Lean Event"],
  // Log tags
  ["[leanyou]", "[lean-event]"],
  // File / asset names in strings
  ["leanyou-rubrica-contatti", "lean-event-rubrica-contatti"],
  ["leanyou-rubrica-sedi", "lean-event-rubrica-sedi"],
  // npm script names in docs/strings
  ["leanyou:sync-vercel", "lean-event:sync-vercel"],
  ["leanyou:vercel-env", "lean-event:vercel-env"],
  ["leanyou:import-templates", "lean-event:import-templates"],
  ["leanyou:access", "lean-event:access"],
  // Script file references
  ["sync-leanyou-vercel-env.mjs", "sync-lean-event-vercel-env.mjs"],
  ["print-leanyou-vercel-env.mjs", "print-lean-event-vercel-env.mjs"],
  ["generate-leanyou-access.mjs", "generate-lean-event-access.mjs"],
  ["generate-leanyou-import-templates.mjs", "generate-lean-event-import-templates.mjs"],
  ["leanyou-tenants-json.mjs", "lean-event-tenants-json.mjs"],
  ["clone-leanyou-tenant-data.mjs", "clone-lean-event-tenant-data.mjs"],
];

const FILE_RENAME_MAP = [
  [/^types\/leanyou-trash\.ts$/, "types/lean-event-trash.ts"],
  [/^types\/leanyou\.ts$/, "types/lean-event.ts"],
  [/^scripts\/sync-leanyou-vercel-env\.mjs$/, "scripts/sync-lean-event-vercel-env.mjs"],
  [/^scripts\/print-leanyou-vercel-env\.mjs$/, "scripts/print-lean-event-vercel-env.mjs"],
  [/^scripts\/generate-leanyou-access\.mjs$/, "scripts/generate-lean-event-access.mjs"],
  [/^scripts\/generate-leanyou-import-templates\.mjs$/, "scripts/generate-lean-event-import-templates.mjs"],
  [/^scripts\/lib\/leanyou-tenants-json\.mjs$/, "scripts/lib/lean-event-tenants-json.mjs"],
  [/^scripts\/clone-leanyou-tenant-data\.mjs$/, "scripts/clone-lean-event-tenant-data.mjs"],
  [/^components\/lean-event\/LeanYouShell\.tsx$/, "components/lean-event/LeanEventShell.tsx"],
  [/^components\/lean-event\/LeanYouLoginForm\.tsx$/, "components/lean-event/LeanEventLoginForm.tsx"],
  [/^components\/lean-event\/LeanYouLoginPageContent\.tsx$/, "components/lean-event/LeanEventLoginPageContent.tsx"],
  [/^components\/lean-event\/LeanYouTokenLogin\.tsx$/, "components/lean-event/LeanEventTokenLogin.tsx"],
  [/^components\/lean-event\/LeanYouUpgradeHint\.tsx$/, "components/lean-event/LeanEventUpgradeHint.tsx"],
  [/^docs\/leanyou\.md$/, "docs/lean-event.md"],
  [/^\.cursor\/rules\/leanyou-vercel-deploy\.mdc$/, ".cursor/rules/lean-event-vercel-deploy.mdc"],
];

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") {
      if (entry.name === ".cursor") {
        // include .cursor/rules
      } else if (entry.name !== ".cursor") {
        continue;
      }
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

function shouldProcess(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  if (rel.includes("node_modules")) return false;
  if (rel.includes("rename-leanyou-to-lean-event.mjs")) return false;
  if (rel.endsWith(".png") || rel.endsWith(".jpg") || rel.endsWith(".webp")) return false;
  return true;
}

async function main() {
  const files = await walk(root);
  let changed = 0;

  for (const file of files) {
    if (!shouldProcess(file)) continue;
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const raw = await readFile(file, "utf8");
    const next = applyReplacements(raw);
    if (next !== raw) {
      await writeFile(file, next, "utf8");
      changed += 1;
      console.log("updated:", rel);
    }
  }

  for (const [pattern, target] of FILE_RENAME_MAP) {
    for (const file of files) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      if (pattern.test(rel)) {
        const dest = path.join(root, target);
        await rename(file, dest);
        console.log("renamed:", rel, "→", target);
      }
    }
  }

  console.log(`\nDone. ${changed} file(s) updated.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
