import { del, get, list, put } from "@vercel/blob";

import type { LeonardoWorkspace } from "@/types/leanyou";

const BLOB_ACCESS = "private" as const;
const WORKSPACE_ROOT = "leanyou/workspaces";

export function isBlobWorkspaceStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function workspaceBlobPathname(
  tenantId: string,
  workspaceId: string
): string {
  return `${WORKSPACE_ROOT}/${tenantId}/${workspaceId}.json`;
}

function workspaceBlobPrefix(tenantId: string): string {
  return `${WORKSPACE_ROOT}/${tenantId}/`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, {
    access: BLOB_ACCESS,
    useCache: false,
  });
  if (!result?.stream) {
    return null;
  }

  const raw = await new Response(result.stream).text();
  return JSON.parse(raw) as T;
}

async function listTenantBlobPathnames(tenantId: string): Promise<string[]> {
  const prefix = workspaceBlobPrefix(tenantId);
  const pathnames: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix,
      cursor,
      limit: 1000,
    });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return pathnames;
}

export async function listWorkspacesFromBlob(
  tenantId: string
): Promise<LeonardoWorkspace[]> {
  const pathnames = await listTenantBlobPathnames(tenantId);
  const workspaces = await Promise.all(
    pathnames.map((pathname) => readBlobJson<LeonardoWorkspace>(pathname))
  );

  return workspaces.filter(
    (workspace): workspace is LeonardoWorkspace => Boolean(workspace)
  );
}

export async function getWorkspaceFromBlob(
  tenantId: string,
  workspaceId: string
): Promise<LeonardoWorkspace | null> {
  const pathname = workspaceBlobPathname(tenantId, workspaceId);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const workspace = await readBlobJson<LeonardoWorkspace>(pathname);
    if (workspace) {
      return workspace;
    }

    if (attempt < 3) {
      await sleep(200);
    }
  }

  return null;
}

export async function saveWorkspaceToBlob(
  workspace: LeonardoWorkspace
): Promise<void> {
  await put(
    workspaceBlobPathname(workspace.tenantId, workspace.id),
    JSON.stringify(workspace, null, 2),
    {
      access: BLOB_ACCESS,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  );
}

export async function deleteWorkspaceFromBlob(
  tenantId: string,
  workspaceId: string
): Promise<void> {
  await del(workspaceBlobPathname(tenantId, workspaceId));
}
