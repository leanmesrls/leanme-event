import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  createDocumentFromUpload,
  listDocuments,
  type LeanEventDocumentKind,
} from "@/lib/lean-event/documents";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

export const runtime = "nodejs";

const KINDS = new Set<LeanEventDocumentKind>([
  "cv",
  "faculty_pack",
  "attestato_partecipazione",
  "certificazione_ecm",
  "agenas",
  "travel_id",
  "supplier_agreement",
  "other",
]);

function parseKind(value: unknown): LeanEventDocumentKind | null {
  if (typeof value !== "string") {
    return null;
  }
  return KINDS.has(value as LeanEventDocumentKind)
    ? (value as LeanEventDocumentKind)
    : null;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }

    const url = new URL(request.url);
    const kind = parseKind(url.searchParams.get("kind"));
    const personId = url.searchParams.get("personId") ?? undefined;
    const eventId = url.searchParams.get("eventId") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    const result = await listDocuments(session.tenantId, {
      kind: kind ?? undefined,
      personId,
      eventId,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "LEAN_EVENT_DATABASE_REQUIRED") {
      return NextResponse.json(
        { error: "Database Neon non configurato." },
        { status: 503 }
      );
    }
    return handleLeanEventRouteError(error, "Elenco documenti non riuscito.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      (!tenantHasLeonardoCapability(session, "eventi") &&
        !tenantHasLeonardoCapability(session, "contatti") &&
        !tenantHasLeonardoCapability(session, "fornitori"))
    ) {
      return forbiddenResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = parseKind(formData.get("kind"));
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }
    if (!kind) {
      return NextResponse.json({ error: "Tipo documento non valido." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await createDocumentFromUpload(session, {
      file: buffer,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      kind,
      title: String(formData.get("title") ?? "") || undefined,
      personId: String(formData.get("personId") ?? "") || undefined,
      eventId: String(formData.get("eventId") ?? "") || undefined,
      assignmentId: String(formData.get("assignmentId") ?? "") || undefined,
      supplierId: String(formData.get("supplierId") ?? "") || undefined,
      workspaceId: String(formData.get("workspaceId") ?? "") || undefined,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BLOB_REQUIRED") {
      return NextResponse.json(
        { error: "Blob storage non configurato." },
        { status: 503 }
      );
    }
    if (error instanceof Error && error.message === "LEAN_EVENT_DATABASE_REQUIRED") {
      return NextResponse.json(
        { error: "Database Neon non configurato." },
        { status: 503 }
      );
    }
    return handleLeanEventRouteError(error, "Upload documento non riuscito.");
  }
}
