import path from "node:path";

import type { TeresaChatThread } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/teresa-chats";
const teresaBlob = createEntityBlobStore(BLOB_ROOT);

export function teresaChatThreadId(userId: string, threadKey?: string): string {
  const key = threadKey?.trim() || randomThreadKey();
  return `teresa_${userId}_${key}`;
}

/** Legacy: un solo thread per utente (prima della multi-conversazione). */
export function legacyTeresaChatThreadId(userId: string): string {
  return `teresa_${userId}`;
}

function randomThreadKey(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function getTeresaChatDir(tenantId: string): string {
  return path.join(getDataRoot(), "teresa-chats", tenantId);
}

export function getTeresaChatFilePath(
  tenantId: string,
  threadId: string
): string {
  const safeId = threadId.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return path.join(getTeresaChatDir(tenantId), `${safeId}.json`);
}

async function listFromBlobOrFs(tenantId: string): Promise<TeresaChatThread[]> {
  if (isEntityBlobStorageEnabled()) {
    return teresaBlob.listAll<TeresaChatThread>(tenantId);
  }
  const dir = getTeresaChatDir(tenantId);
  const files = await listJsonFiles(dir);
  const threads = await Promise.all(
    files.map((file) => readJsonFile<TeresaChatThread>(`${dir}/${file}`))
  );
  return threads.filter((thread): thread is TeresaChatThread => Boolean(thread));
}

async function getFromBlobOrFs(
  tenantId: string,
  threadId: string
): Promise<TeresaChatThread | null> {
  if (isEntityBlobStorageEnabled()) {
    return teresaBlob.get<TeresaChatThread>(tenantId, threadId);
  }
  return readJsonFile<TeresaChatThread>(
    getTeresaChatFilePath(tenantId, threadId)
  );
}

export async function listStoredTeresaChatThreads(
  tenantId: string
): Promise<TeresaChatThread[]> {
  return readManagedEntityList(tenantId, "teresa_chat", () =>
    listFromBlobOrFs(tenantId)
  );
}

/** Tutti i thread Teresa di un elenco tenant (Neon / Blob / FS per tenant). */
export async function listStoredTeresaChatThreadsForTenants(
  tenantIds: string[]
): Promise<TeresaChatThread[]> {
  const batches = await Promise.all(
    tenantIds.map((tenantId) => listStoredTeresaChatThreads(tenantId))
  );
  return batches.flat();
}

export async function getStoredTeresaChatThread(
  tenantId: string,
  threadId: string
): Promise<TeresaChatThread | null> {
  return readManagedEntity(tenantId, "teresa_chat", threadId, () =>
    getFromBlobOrFs(tenantId, threadId)
  );
}

export async function saveStoredTeresaChatThread(
  thread: TeresaChatThread
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await teresaBlob.save(thread);
    return;
  }
  await writeJsonFile(
    getTeresaChatFilePath(thread.tenantId, thread.id),
    thread
  );
}
