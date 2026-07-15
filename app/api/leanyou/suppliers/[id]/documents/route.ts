import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import {
  appendSupplierAgreement,
  getSupplier,
  saveSupplier,
} from "@/lib/lean-event/suppliers";
import { saveSupplierDocumentFile } from "@/lib/lean-event/supplier-document-storage";
import type { LeonardoSupplierDocumentKind } from "@/types/lean-event";
import { isoDateToEuropeanDate } from "@/lib/lean-event/dates";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_KINDS: LeonardoSupplierDocumentKind[] = [
  "accordo_generale",
  "preventivo",
  "fattura",
  "altro",
];

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const { id: supplierId } = await context.params;
    const supplier = await getSupplier(session.tenantId, supplierId);
    if (!supplier) {
      return NextResponse.json({ error: "Fornitore non trovato." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File mancante." }, { status: 400 });
    }

    const title = String(formData.get("title") ?? file.name).trim();
    const kindRaw = String(formData.get("kind") ?? "accordo_generale");
    const kind = VALID_KINDS.includes(kindRaw as LeonardoSupplierDocumentKind)
      ? (kindRaw as LeonardoSupplierDocumentKind)
      : "accordo_generale";
    const documentDateRaw = String(formData.get("documentDate") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const documentId = randomUUID();
    const fileUrl = await saveSupplierDocumentFile({
      tenantId: session.tenantId,
      scope: "rubrica",
      scopeId: supplierId,
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

    const updated = appendSupplierAgreement(supplier, document);
    await saveSupplier(updated);

    return NextResponse.json({ supplier: updated, document });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Formato")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleLeanEventRouteError(error, "Upload documento non riuscito.");
  }
}
