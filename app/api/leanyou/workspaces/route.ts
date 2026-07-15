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
import {
  createWorkspace,
  listWorkspaces,
  saveWorkspace,
} from "@/lib/leanyou/workspaces";

export async function GET() {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "leonardo")) {
      return forbiddenResponse();
    }

    const workspaces = await listWorkspaces(session.tenantId);
    return NextResponse.json({ workspaces });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data riunione non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(
      error,
      "Operazione workspace non riuscita."
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "leonardo")) {
      return forbiddenResponse();
    }

    const body = (await request.json()) as {
      title?: string;
      client?: string;
      organization?: string;
      meetingDate?: string;
      meetingType?: "client_meeting" | "scientific_committee" | "internal_meeting";
      tags?: string[];
      participants?: string;
      moderator?: string;
      secretary?: string;
      notes?: string;
      transcript?: string;
      linkedEventId?: string | null;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Titolo obbligatorio." }, { status: 400 });
    }

    const workspace = createWorkspace(session, {
      title: body.title,
      client: body.client ?? session.tenantName,
      organization: body.organization ?? "",
      meetingDate: normalizeMeetingDateInput(body.meetingDate),
      meetingType: body.meetingType ?? "client_meeting",
      tags: body.tags ?? [],
      participants: body.participants ?? "",
      moderator: body.moderator ?? "",
      secretary: body.secretary ?? session.userName,
      notes: body.notes ?? "",
      transcript: body.transcript ?? "",
      linkedEventId: body.linkedEventId ?? null,
    });

    await saveWorkspace(workspace);
    await writeLeanYouAuditEvent({
      action: "workspace_create",
      resourceType: "leonardo_workspace",
      resourceId: workspace.id,
      detail: workspace.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEETING_DATE") {
      return NextResponse.json(
        { error: "Data riunione non valida. Usa il formato gg/mm/aaaa." },
        { status: 400 }
      );
    }
    return handleLeanYouRouteError(
      error,
      "Creazione workspace non riuscita."
    );
  }
}
