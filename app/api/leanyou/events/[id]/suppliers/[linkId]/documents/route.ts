import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { getEvent } from "@/lib/leanyou/events";
import {
  appendEventSupplierDocument,
  getEventSupplierLink,
  saveEventSupplierLink,
} from "@/lib/leanyou/event-suppliers";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import { saveSupplierDocumentFile } from "@/lib/leanyou/supplier-document-storage";
import { isoDateToEuropeanDate } from "@/lib/leanyou/dates";
import type { LeonardoSupplierDocumentKind } from "@/types/leanyou";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

const DOC_KINDS: LeonardoSupplierDocumentKind[] = [
  "preventivo",
  "fattura",
  "altro",
  "accordo_generale",
];

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId, linkId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const link = await getEventSupplierLink(session.tenantId, linkId);
    if (!link || link.eventId !== eventId) {
      return NextResponse.json({ error: "Fornitore evento non trovato." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    const title = String(formData.get("title") ?? file.name).trim();
    const kindRaw = String(formData.get("kind") ?? "preventivo");
    const kind = DOC_KINDS.includes(kindRaw as LeonardoSupplierDocumentKind)
      ? (kindRaw as LeonardoSupplierDocumentKind)
      : "preventivo";
    const documentDateRaw = String(formData.get("documentDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const documentId = randomUUID();
    const fileUrl = await saveSupplierDocumentFile({
      tenantId: session.tenantId,
      scope: "event",
      scopeId: `${eventId}__${linkId}`,
      documentId,
      file,
    });

    const now = new Date().toISOString();
    const document = {
      id: documentId,
      title: title || file.name,
      kind,
      documentDate: documentDateRaw || isoDateToEuropeanDate(now.slice(0, 10)),
      fileName: file.name,
      fileUrl,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      notes,
      uploadedBy: session.userName,
      createdAt: now,
    };

    const updated = appendEventSupplierDocument(link, document);
    await saveEventSupplierLink(updated);
    return NextResponse.json({ link: updated, document });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Formato")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleLeanYouRouteError(error, "Upload documento non riuscito.");
  }
}
