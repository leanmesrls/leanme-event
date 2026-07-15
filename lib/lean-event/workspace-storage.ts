import type { LeonardoWorkspace } from "@/types/lean-event";

import {
  deleteWorkspaceFromBlob,
  getWorkspaceFromBlob,
  isBlobWorkspaceStorageEnabled,
  listWorkspacesFromBlob,
  saveWorkspaceToBlob,
} from "./workspace-blob-storage";
import {
  deleteJsonFile,
  getWorkspaceDir,
  getWorkspaceFilePath,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

export function getWorkspaceStorageMode(): "blob" | "filesystem" {
  return isBlobWorkspaceStorageEnabled() ? "blob" : "filesystem";
}

export async function listStoredWorkspaces(
  tenantId: string
): Promise<LeonardoWorkspace[]> {
  if (isBlobWorkspaceStorageEnabled()) {
    return listWorkspacesFromBlob(tenantId);
  }

  const dir = getWorkspaceDir(tenantId);
  const files = await listJsonFiles(dir);
  const workspaces = await Promise.all(
    files.map((file) => readJsonFile<LeonardoWorkspace>(`${dir}/${file}`))
  );

  return workspaces.filter(
    (workspace): workspace is LeonardoWorkspace => Boolean(workspace)
  );
}

export async function getStoredWorkspace(
  tenantId: string,
  workspaceId: string
): Promise<LeonardoWorkspace | null> {
  if (isBlobWorkspaceStorageEnabled()) {
    return getWorkspaceFromBlob(tenantId, workspaceId);
  }

  return readJsonFile<LeonardoWorkspace>(
    getWorkspaceFilePath(tenantId, workspaceId)
  );
}

export async function saveStoredWorkspace(
  workspace: LeonardoWorkspace
): Promise<void> {
  if (isBlobWorkspaceStorageEnabled()) {
    await saveWorkspaceToBlob(workspace);
    return;
  }

  await writeJsonFile(
    getWorkspaceFilePath(workspace.tenantId, workspace.id),
    workspace
  );
}

export async function deleteStoredWorkspace(
  tenantId: string,
  workspaceId: string
): Promise<void> {
  if (isBlobWorkspaceStorageEnabled()) {
    await deleteWorkspaceFromBlob(tenantId, workspaceId);
    return;
  }

  await deleteJsonFile(getWorkspaceFilePath(tenantId, workspaceId));
}
