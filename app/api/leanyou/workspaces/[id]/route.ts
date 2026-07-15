import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { tenantHasModule } from "@/lib/lean-event/auth";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { normalizeMeetingDateInput } from "@/lib/lean-event/dates";
import type { LeonardoWorkspace } from "@/types/lean-event";
import {
  deleteWorkspace,
  getWorkspace,
  saveWorkspace,
} from "@/lib/lean-event/workspaces";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "leonardo")) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const workspace = await getWorkspace(session.tenantId, id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace non trovato." }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data riunione non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanEventRouteError(error, "Operazione workspace non riuscita.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "leonardo")) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const workspace = await getWorkspace(session.tenantId, id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LeonardoWorkspace> & {
      expectedRevision?: number;
    };
    const allowed: Partial<LeonardoWorkspace> = {
      title: body.title,
      client: body.client,
      organization: body.organization,
      meetingDate:
        body.meetingDate !== undefined
          ? normalizeMeetingDateInput(body.meetingDate)
          : undefined,
      meetingType: body.meetingType,
      tags: body.tags,
      participants: body.participants,
      moderator: body.moderator,
      secretary: body.secretary,
      notes: body.notes,
      transcript: body.transcript,
      status: body.status,
      linkedEventId: body.linkedEventId,
    };

    const next = {
      ...workspace,
      ...Object.fromEntries(
        Object.entries(allowed).filter(([, value]) => value !== undefined)
      ),
      id: workspace.id,
      tenantId: workspace.tenantId,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
    };

    const saved = await saveWorkspace(next as LeonardoWorkspace, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });
    await writeLeanEventAuditEvent({
      action: "workspace_update",
      resourceType: "leonardo_workspace",
      resourceId: saved.id,
      detail: saved.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ workspace: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data riunione non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanEventRouteError(error, "Aggiornamento workspace non riuscito.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "leonardo")) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const workspace = await getWorkspace(session.tenantId, id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace non trovato." }, { status: 404 });
    }

    await deleteWorkspace(session.tenantId, id, sessionUserId(session));
    await writeLeanEventAuditEvent({
      action: "workspace_delete",
      resourceType: "leonardo_workspace",
      resourceId: workspace.id,
      detail: workspace.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanEventRouteError(error, "Eliminazione workspace non riuscita.");
  }
}
