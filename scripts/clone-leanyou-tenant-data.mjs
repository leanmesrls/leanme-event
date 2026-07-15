#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, process.env.LEANYOU_DATA_DIR ?? ".leanyou-data");

const [sourceTenantId, targetTenantId, targetUserId] = process.argv.slice(2);

if (!sourceTenantId || !targetTenantId) {
  console.error(
    "Uso: node scripts/clone-leanyou-tenant-data.mjs <sourceTenant> <targetTenant> [targetUserId]"
  );
  process.exit(1);
}

const targetCreatedBy = targetUserId ?? `${targetTenantId}-admin`;

const tenantScopedDirs = [
  "events",
  "event-assignments",
  "contacts",
  "venues",
  "workspaces",
  "travel-docs",
  "event-chat",
];

async function existsDir(dirPath) {
  try {
    await readdir(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function cloneJsonTree(relativeDir) {
  const sourceDir = path.join(dataDir, relativeDir, sourceTenantId);
  const targetDir = path.join(dataDir, relativeDir, targetTenantId);

  if (!(await existsDir(sourceDir))) {
    return 0;
  }

  await mkdir(targetDir, { recursive: true });
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".json"));
  let count = 0;

  for (const file of files) {
    const raw = await readFile(path.join(sourceDir, file), "utf8");
    const parsed = JSON.parse(raw);
    const next = rewriteEntity(parsed);
    await writeFile(path.join(targetDir, file), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    count += 1;
  }

  return count;
}

function rewriteEntity(value) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteEntity(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const next = { ...value };
  if ("tenantId" in next && typeof next.tenantId === "string") {
    next.tenantId = targetTenantId;
  }
  if ("createdBy" in next && typeof next.createdBy === "string") {
    next.createdBy = targetCreatedBy;
  }

  for (const key of Object.keys(next)) {
    next[key] = rewriteEntity(next[key]);
  }
  return next;
}

async function cloneNestedTree(relativeDir) {
  const sourceDir = path.join(dataDir, relativeDir, sourceTenantId);
  const targetDir = path.join(dataDir, relativeDir, targetTenantId);

  if (!(await existsDir(sourceDir))) {
    return 0;
  }

  await mkdir(targetDir, { recursive: true });
  const eventDirs = await readdir(sourceDir, { withFileTypes: true });
  let count = 0;

  for (const entry of eventDirs) {
    if (!entry.isDirectory()) {
      continue;
    }
    const from = path.join(sourceDir, entry.name);
    const to = path.join(targetDir, entry.name);
    await cp(from, to, { recursive: true, force: true });
    count += 1;
  }

  return count;
}

async function main() {
  let total = 0;

  for (const dir of tenantScopedDirs) {
    if (dir === "travel-docs" || dir === "event-chat") {
      total += await cloneNestedTree(dir);
    } else {
      total += await cloneJsonTree(dir);
    }
  }

  console.log(
    `Clonati dati tenant ${sourceTenantId} → ${targetTenantId} (${total} elementi/cartelle).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
