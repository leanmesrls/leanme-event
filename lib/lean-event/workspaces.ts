import { randomUUID } from "node:crypto";

import type {
  LeonardoWorkspace,
  LeonardoWorkspaceStatus,
  LeanEventSession,
} from "@/types/lean-event";

import {
  assertRevisionMatch,
  isEntityActive,
  markEntityDeleted,
  markEntityRestored,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import { saveEntityVersionSnapshot } from "./version-storage";
import { upsertManagedEntityToNeon } from "./entity-db";
import {
  getStoredWorkspace,
  listStoredWorkspaces,
  saveStoredWorkspace,
} from "./workspace-storage";

function normalizeWorkspace(workspace: LeonardoWorkspace): LeonardoWorkspace {
  return {
    ...withLifecycleDefaults(workspace),
    linkedEventId: workspace.linkedEventId ?? null,
  } as LeonardoWorkspace;
}

export async function listWorkspaces(
  tenantId: string
): Promise<LeonardoWorkspace[]> {
  const workspaces = await listStoredWorkspaces(tenantId);

  return workspaces
    .map((workspace) => normalizeWorkspace(workspace))
    .filter(isEntityActive)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function listDeletedWorkspaces(
  tenantId: string
): Promise<LeonardoWorkspace[]> {
  const workspaces = await listStoredWorkspaces(tenantId);
  return workspaces
    .map((workspace) => normalizeWorkspace(workspace))
    .filter((workspace) => !isEntityActive(workspace))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function getWorkspace(
  tenantId: string,
  workspaceId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeonardoWorkspace | null> {
  const workspace = await getStoredWorkspace(tenantId, workspaceId);
  if (!workspace) {
    return null;
  }
  const normalized = normalizeWorkspace(workspace);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

async function persistWorkspace(
  workspace: LeonardoWorkspace,
  previous: LeonardoWorkspace | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      workspace.tenantId,
      "workspace",
      workspace.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredWorkspace(workspace);
  await upsertManagedEntityToNeon("workspace", workspace);
}

export async function saveWorkspace(
  workspace: LeonardoWorkspace,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeonardoWorkspace | null;
  }
): Promise<LeonardoWorkspace> {
  const normalized = normalizeWorkspace(workspace);
  const previous =
    options?.previous ??
    (await getStoredWorkspace(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeWorkspace(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeWorkspace({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    });
    await persistWorkspace(merged, prevNorm);
    return merged;
  }

  await persistWorkspace(normalized, null);
  return normalized;
}

export async function deleteWorkspace(
  tenantId: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  const workspace = await getWorkspace(tenantId, workspaceId, {
    includeDeleted: true,
  });
  if (!workspace) {
    return;
  }
  const deleted = markEntityDeleted(workspace, userId);
  await persistWorkspace(deleted, workspace);
}

export async function restoreWorkspace(
  tenantId: string,
  workspaceId: string,
  userId: string
): Promise<LeonardoWorkspace | null> {
  const workspace = await getWorkspace(tenantId, workspaceId, {
    includeDeleted: true,
  });
  if (!workspace || isEntityActive(workspace)) {
    return null;
  }
  const restored = markEntityRestored(workspace, userId);
  await persistWorkspace(restored, workspace);
  return restored;
}

export function createWorkspace(
  session: LeanEventSession,
  input: {
    title: string;
    client: string;
    organization: string;
    meetingDate: string;
    meetingType: LeonardoWorkspace["meetingType"];
    tags: string[];
    participants: string;
    moderator: string;
    secretary: string;
    notes: string;
    transcript?: string;
    linkedEventId?: string | null;
  }
): LeonardoWorkspace {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);

  const draft: LeonardoWorkspace = {
    id: randomUUID(),
    tenantId: session.tenantId,
    createdBy: session.userId,
    title: input.title.trim(),
    client: input.client.trim(),
    organization: input.organization.trim(),
    meetingDate: input.meetingDate,
    meetingType: input.meetingType,
    tags: input.tags,
    participants: input.participants.trim(),
    moderator: input.moderator.trim(),
    secretary: input.secretary.trim(),
    notes: input.notes.trim(),
    linkedEventId: input.linkedEventId ?? null,
    status: input.transcript?.trim() ? "content_ready" : "draft",
    transcript: input.transcript?.trim() ?? "",
    structured: null,
    documents: {},
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  return normalizeWorkspace(prepareEntityCreate(draft, userId));
}

export async function updateWorkspaceStatus(
  tenantId: string,
  workspaceId: string,
  status: LeonardoWorkspaceStatus,
  patch: Partial<LeonardoWorkspace> = {},
  userId = "system"
): Promise<LeonardoWorkspace | null> {
  const workspace = await getWorkspace(tenantId, workspaceId);
  if (!workspace) {
    return null;
  }

  const next: LeonardoWorkspace = {
    ...workspace,
    ...patch,
    status,
  };

  return saveWorkspace(next, { userId });
}

export async function listWorkspacesForEvent(
  tenantId: string,
  eventId: string
): Promise<LeonardoWorkspace[]> {
  const workspaces = await listWorkspaces(tenantId);
  return workspaces.filter((workspace) => workspace.linkedEventId === eventId);
}

export function getDashboardStats(workspaces: LeonardoWorkspace[]) {
  return {
    total: workspaces.length,
    completed: workspaces.filter((item) => item.status === "completed").length,
    processing: workspaces.filter((item) => item.status === "processing")
      .length,
    draft: workspaces.filter((item) => item.status === "draft").length,
  };
}
