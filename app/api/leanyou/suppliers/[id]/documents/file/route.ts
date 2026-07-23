import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import { readLegacyBinaryFromPostgres } from "@/lib/lean-event/legacy-binary-postgres";
import {
  forbiddenResponse,
  requireSession,
} from "@/lib/lean-event/server-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "fornitori")
    ) {
      return forbiddenResponse();
    }

    const { id: supplierId } = await context.params;
    const url = new URL(request.url);
    const documentId = url.searchParams.get("id") ?? "";
    const name = url.searchParams.get("name") ?? "file";

    if (!documentId) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    const filename = `${documentId}-${name}`;
    const pathname = `lean-event/supplier-documents/${session.tenantId}/rubrica/${supplierId}/${filename}`;
    const file = await readLegacyBinaryFromPostgres({
      tenantId: session.tenantId,
      legacyPath: pathname,
    });
    if (!file) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    await writeLeanEventAuditEvent({
      ...auditContextFromSession(session),
      action: "document.download",
      resourceType: "supplier_document",
      resourceId: documentId,
      payload: {
        scope: "rubrica",
        supplierId,
        filename,
        bytes: file.buffer.byteLength,
      },
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
}
