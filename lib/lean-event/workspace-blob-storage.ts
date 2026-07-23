/**
 * Workspace Blob adapter — disabled for Neon-only runtime.
 * No @vercel/blob import.
 */

import type { LeonardoWorkspace } from "@/types/lean-event";

const WORKSPACE_ROOT = "lean-event/workspaces";

export function isBlobWorkspaceStorageEnabled(): boolean {
  return false;
}

export function workspaceBlobPathname(
  tenantId: string,
  workspaceId: string
): string {
  return `${WORKSPACE_ROOT}/${tenantId}/${workspaceId}.json`;
}

export async function listWorkspacesFromBlob(
  _tenantId: string
): Promise<LeonardoWorkspace[]> {
  return [];
}

export async function getWorkspaceFromBlob(
  _tenantId: string,
  _workspaceId: string
): Promise<LeonardoWorkspace | null> {
  return null;
}

export async function saveWorkspaceToBlob(
  _workspace: LeonardoWorkspace
): Promise<void> {
  throw new Error("WORKSPACE_BLOB_DISABLED");
}

export async function deleteWorkspaceFromBlob(
  _tenantId: string,
  _workspaceId: string
): Promise<void> {
  // no-op
}
