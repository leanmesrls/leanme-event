import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import configData from "@/data/lean-event/config.json";
import promptsData from "@/data/lean-event/prompts.json";
import type {
  LeanEventConfig,
  LeanEventPromptTemplate,
  LeanEventTenantsFile,
} from "@/types/lean-event";

import {
  readLeanEventDataDir,
  readLeanEventTenantsFile,
  readLeanEventTenantsJson,
} from "@/lib/lean-event/env";

const DATA_ROOT = readLeanEventDataDir();
const TENANTS_FILE = readLeanEventTenantsFile(DATA_ROOT);

export function getDataRoot(): string {
  return path.isAbsolute(DATA_ROOT)
    ? DATA_ROOT
    : path.join(process.cwd(), DATA_ROOT);
}

function parseTenantsJson(raw: string): LeanEventTenantsFile {
  return JSON.parse(raw) as LeanEventTenantsFile;
}

export function getLeanEventConfig(): LeanEventConfig {
  return configData as LeanEventConfig;
}

export function getLeanEventPrompts(): {
  templates: LeanEventPromptTemplate[];
  schemaInstructions: string;
  documentGuidelines: string;
  emailFollowupInstructions: string;
} {
  const data = promptsData as {
    templates: LeanEventPromptTemplate[];
    schemaInstructions: string;
    documentGuidelines?: string;
    emailFollowupInstructions?: string;
  };

  return {
    templates: data.templates,
    schemaInstructions: data.schemaInstructions,
    documentGuidelines: data.documentGuidelines ?? "",
    emailFollowupInstructions: data.emailFollowupInstructions ?? "",
  };
}

export async function loadTenantsFile(): Promise<LeanEventTenantsFile> {
  const envJson = readLeanEventTenantsJson();
  if (envJson) {
    try {
      return parseTenantsJson(envJson);
    } catch (error) {
      console.error("[lean-event] LEAN_EVENT_TENANTS_JSON non valido:", error);
    }
  }

  const fallback = path.join(process.cwd(), "data/lean-event/tenants.example.json");
  const target = path.isAbsolute(TENANTS_FILE)
    ? TENANTS_FILE
    : path.join(process.cwd(), TENANTS_FILE);

  try {
    const raw = await readFile(target, "utf8");
    return parseTenantsJson(raw);
  } catch {
    const raw = await readFile(fallback, "utf8");
    return parseTenantsJson(raw);
  }
}

export function getWorkspaceDir(tenantId: string): string {
  return path.join(getDataRoot(), "workspaces", tenantId);
}

export function getWorkspaceFilePath(
  tenantId: string,
  workspaceId: string
): string {
  return path.join(getWorkspaceDir(tenantId), `${workspaceId}.json`);
}

export async function ensureDataDirs(): Promise<void> {
  await mkdir(path.join(getDataRoot(), "workspaces"), {
    recursive: true,
  });
  await mkdir(path.join(getDataRoot(), "versions"), {
    recursive: true,
  });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function deleteJsonFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // ignore missing file
  }
}

export async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((entry) => entry.endsWith(".json"));
  } catch {
    return [];
  }
}
