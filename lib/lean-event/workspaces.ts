import { randomUUID } from "node:crypto";

import type {
  LeonardoWorkspace,
  LeonardoWorkspaceStatus,
  LeanEventSession,
} from "@/types/lean-event";

import {
  deleteStoredWorkspace,
  getStoredWorkspace,
  listStoredWorkspaces,
  saveStoredWorkspace,
} from "./workspace-storage";

function normalizeWorkspace(workspace: LeonardoWorkspace): LeonardoWorkspace {
  return {
    ...workspace,
    linkedEventId: workspace.linkedEventId ?? null,
  };
}

export async function listWorkspaces(
  tenantId: string
): Promise<LeonardoWorkspace[]> {
  const workspaces = await listStoredWorkspaces(tenantId);

  return workspaces.map(normalizeWorkspace).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getWorkspace(
  tenantId: string,
  workspaceId: string
): Promise<LeonardoWorkspace | null> {
  const workspace = await getStoredWorkspace(tenantId, workspaceId);
  return workspace ? normalizeWorkspace(workspace) : null;
}

export async function saveWorkspace(
  workspace: LeonardoWorkspace
): Promise<void> {
  await saveStoredWorkspace(workspace);
}

export async function deleteWorkspace(
  tenantId: string,
  workspaceId: string
): Promise<void> {
  await deleteStoredWorkspace(tenantId, workspaceId);
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

  return {
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
}

export async function updateWorkspaceStatus(
  tenantId: string,
  workspaceId: string,
  status: LeonardoWorkspaceStatus,
  patch: Partial<LeonardoWorkspace> = {}
): Promise<LeonardoWorkspace | null> {
  const workspace = await getWorkspace(tenantId, workspaceId);
  if (!workspace) {
    return null;
  }

  const next: LeonardoWorkspace = {
    ...workspace,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkspace(next);
  return next;
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
