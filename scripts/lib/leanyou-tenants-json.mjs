import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadMinifiedTenantsJson(root = process.cwd()) {
  const dataDir = path.join(root, process.env.LEANYOU_DATA_DIR ?? ".leanyou-data");
  const tenantsPath = path.join(dataDir, "tenants.json");
  const raw = await readFile(tenantsPath, "utf8");
  return JSON.stringify(JSON.parse(raw));
}

export function getTenantsPath(root = process.cwd()) {
  const dataDir = path.join(root, process.env.LEANYOU_DATA_DIR ?? ".leanyou-data");
  return path.join(dataDir, "tenants.json");
}
