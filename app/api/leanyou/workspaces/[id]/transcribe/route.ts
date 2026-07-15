import { NextResponse } from "next/server";

import { transcribeAudioBuffer } from "@/lib/leanyou/leonardo-processor";
import { cleanTranscriptionPart } from "@/lib/leanyou/transcription-cleanup";
import { tenantHasModule } from "@/lib/leanyou/auth";
import {
  forbiddenResponse,
  requireSession,
} from "@/lib/leanyou/server-auth";
import {
  decodeUploadFile,
  isMediaFileName,
  MAX_CHUNK_BYTES,
  type LeonardoProcessUploadFile,
} from "@/lib/leanyou/upload-payload";
import { getWorkspace } from "@/lib/leanyou/workspaces";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";
/** Whisper può richiedere diversi secondi per chunk audio. */
export const maxDuration = 120;

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

    const body = (await request.json()) as { file?: LeonardoProcessUploadFile };
    if (!body.file) {
      return NextResponse.json({ error: "File audio mancante." }, { status: 400 });
    }

    if (!isMediaFileName(body.file.name)) {
      return NextResponse.json(
        { error: "Formato audio non supportato." },
        { status: 400 }
      );
    }

    const buffer = decodeUploadFile(body.file);
    if (buffer.byteLength > MAX_CHUNK_BYTES) {
      return NextResponse.json(
        {
          error: `Parte audio troppo grande (max ${Math.round(MAX_CHUNK_BYTES / (1024 * 1024))} MB).`,
        },
        { status: 400 }
      );
    }

    const text = cleanTranscriptionPart(
      await transcribeAudioBuffer(
        buffer,
        body.file.name,
        body.file.mimeType
      )
    );

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Trascrizione non riuscita.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
