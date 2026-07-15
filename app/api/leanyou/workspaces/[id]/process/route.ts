import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import {
  processLeonardoWorkspace,
  transcribeAudioBuffer,
} from "@/lib/lean-event/leonardo-processor";
import { cleanFullTranscript, transcriptValidationMessage } from "@/lib/lean-event/transcription-cleanup";
import { tenantHasModule } from "@/lib/lean-event/auth";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import {
  forbiddenResponse,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { LeonardoProcessRequestBody } from "@/lib/lean-event/upload-payload";
import {
  decodeUploadFile,
  isMediaFileName,
  isTextFileName,
} from "@/lib/lean-event/upload-payload";
import {
  getWorkspace,
  saveWorkspace,
  updateWorkspaceStatus,
} from "@/lib/lean-event/workspaces";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";
/** Generazione verbali: più segmenti OpenAI in sequenza (fino a 5 min su Vercel Pro). */
export const maxDuration = 300;

export async function POST(request: Request, context: RouteContext) {
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

    const userId = sessionUserId(session);

    await updateWorkspaceStatus(session.tenantId, id, "processing", {
      errorMessage: null,
    }, userId);
    await writeLeanEventAuditEvent({
      action: "workspace_process_start",
      resourceType: "leonardo_workspace",
      resourceId: workspace.id,
      detail: workspace.title,
      ...auditContextFromSession(session),
    });

    let transcript = workspace.transcript.trim();
    let body: LeonardoProcessRequestBody = {};
    try {
      body = (await request.json()) as LeonardoProcessRequestBody;
    } catch {
      /* body vuoto: usa transcript già salvato nel workspace */
    }

    if (body.transcript?.trim()) {
      transcript = body.transcript.trim();
      await updateWorkspaceStatus(session.tenantId, id, "processing", {
        transcript,
        errorMessage: null,
      }, userId);
    }

    if (body.file) {
      const buffer = decodeUploadFile(body.file);

      if (isTextFileName(body.file.name)) {
        transcript = buffer.toString("utf8").trim();
      } else if (isMediaFileName(body.file.name)) {
        transcript = await transcribeAudioBuffer(
          buffer,
          body.file.name,
          body.file.mimeType
        );
      } else {
        throw new Error(
          "Formato non supportato. Usa txt/vtt/srt oppure mp3/m4a/wav/mp4/webm/mov."
        );
      }
    }

    if (!transcript) {
      await updateWorkspaceStatus(session.tenantId, id, "failed", {
        errorMessage: "Nessuna trascrizione disponibile.",
      }, userId);
      await writeLeanEventAuditEvent({
        action: "workspace_process_failed",
        resourceType: "leonardo_workspace",
        resourceId: workspace.id,
        detail: "Nessuna trascrizione disponibile.",
        ...auditContextFromSession(session),
      });
      return NextResponse.json(
        { error: "Carica un file o aggiungi informazioni testuali." },
        { status: 400 }
      );
    }

    const rawTranscript = transcript;
    transcript = cleanFullTranscript(transcript);

    if (!transcript) {
      const transcriptError =
        transcriptValidationMessage(rawTranscript) ??
        "La trascrizione non contiene testo utilizzabile dopo la pulizia.";
      await updateWorkspaceStatus(session.tenantId, id, "failed", {
        transcript: rawTranscript,
        errorMessage: transcriptError,
      }, userId);
      await writeLeanEventAuditEvent({
        action: "workspace_process_failed",
        resourceType: "leonardo_workspace",
        resourceId: workspace.id,
        detail: transcriptError,
        ...auditContextFromSession(session),
      });
      return NextResponse.json({ error: transcriptError }, { status: 400 });
    }

    const workspaceContext = [
      `Titolo: ${workspace.title}`,
      `Cliente: ${workspace.client}`,
      `Organizzazione: ${workspace.organization}`,
      `Data: ${workspace.meetingDate}`,
      `Tipo: ${workspace.meetingType}`,
      `Partecipanti: ${workspace.participants}`,
      `Moderatore: ${workspace.moderator}`,
      `Segretario: ${workspace.secretary}`,
      `Note: ${workspace.notes}`,
    ].join("\n");

    const result = await processLeonardoWorkspace({
      meetingType: workspace.meetingType,
      workspaceContext,
      transcript,
      workspace: {
        title: workspace.title,
        meetingDate: workspace.meetingDate,
        participants: workspace.participants,
        client: workspace.client,
        organization: workspace.organization,
      },
    });

    const completed = {
      ...workspace,
      transcript,
      structured: result.structured,
      documents: result.documents,
      status: "completed" as const,
      errorMessage: null,
    };

    await saveWorkspace(completed, { userId });
    await writeLeanEventAuditEvent({
      action: "workspace_process_complete",
      resourceType: "leonardo_workspace",
      resourceId: completed.id,
      detail: completed.title,
      ...auditContextFromSession(session),
    });
    return NextResponse.json({ ok: true, workspaceId: completed.id });
  } catch (error) {
    const { id } = await context.params;
    const session = await getSessionSafe();
    const message =
      error instanceof Error ? error.message : "Elaborazione non riuscita.";

    if (session) {
      await updateWorkspaceStatus(session.tenantId, id, "failed", {
        errorMessage: message,
      }, sessionUserId(session));
      await writeLeanEventAuditEvent({
        action: "workspace_process_failed",
        resourceType: "leonardo_workspace",
        resourceId: id,
        detail: message,
        ...auditContextFromSession(session),
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getSessionSafe() {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
