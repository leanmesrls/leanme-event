import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  writeLeanYouAuditEvent,
} from "@/lib/leanyou/audit-log";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import { normalizeMeetingDateInput } from "@/lib/leanyou/dates";
import { tenantHasModule } from "@/lib/leanyou/auth";
import type { LeonardoWorkspace } from "@/types/leanyou";
import {
  deleteWorkspace,
  getWorkspace,
  saveWorkspace,
} from "@/lib/leanyou/workspaces";

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
    return handleLeanYouRouteError(error, "Operazione workspace non riuscita.");
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

    const body = (await request.json()) as Partial<LeonardoWorkspace>;
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
      updatedAt: new Date().toISOString(),
    };

    await saveWorkspace(next);
    await writeLeanYouAuditEvent({
      action: "workspace_update",
      resourceType: "leonardo_workspace",
      resourceId: next.id,
      detail: next.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ workspace: next });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data riunione non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(error, "Aggiornamento workspace non riuscito.");
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

    await deleteWorkspace(session.tenantId, id);
    await writeLeanYouAuditEvent({
      action: "workspace_delete",
      resourceType: "leonardo_workspace",
      resourceId: workspace.id,
      detail: workspace.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(error, "Eliminazione workspace non riuscita.");
  }
}
