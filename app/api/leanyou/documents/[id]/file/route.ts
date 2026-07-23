import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  auditContextFromSession,
  writeLeanEventAuditEvent,
} from "@/lib/lean-event/audit-log";
import { getDocument, loadDocumentFileBytes } from "@/lib/lean-event/documents";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PREVIEW_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function GET(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get("version");
    const version =
      versionParam && Number.isFinite(Number(versionParam))
        ? Number(versionParam)
        : undefined;
    const verify = url.searchParams.get("verify") === "1";
    const disposition =
      url.searchParams.get("disposition") === "attachment"
        ? "attachment"
        : "inline";

    const document = await getDocument(session.tenantId, id);
    if (!document) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    if (disposition === "inline" && !PREVIEW_MIME.has(document.mime)) {
      // Force download for non-previewable types
    }

    const file = await loadDocumentFileBytes(session.tenantId, id, {
      version,
      verify,
    });

    const useInline =
      disposition === "inline" && PREVIEW_MIME.has(file.mime || document.mime);

    await writeLeanEventAuditEvent({
      ...auditContextFromSession(session),
      action: "document.download",
      resourceType: "document",
      resourceId: id,
      payload: {
        version: file.version,
        sha256: file.sha256,
        bytes: file.bytes.byteLength,
        disposition: useInline ? "inline" : "attachment",
        verify,
      },
    });

    const safeName = file.filename.replace(/"/g, "");
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime || "application/octet-stream",
        "Content-Length": String(file.bytes.byteLength),
        "Content-Disposition": `${useInline ? "inline" : "attachment"}; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "X-Content-Sha256": file.sha256,
        "X-Document-Version": String(file.version),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DOCUMENT_SHA256_MISMATCH") {
      try {
        const session = await requireSession();
        const { id } = await context.params;
        await writeLeanEventAuditEvent({
          ...auditContextFromSession(session),
          action: "document.integrity_fail",
          resourceType: "document",
          resourceId: id,
        });
      } catch {
        // ignore secondary failures
      }
      return NextResponse.json(
        { error: "Integrità documento non valida (SHA-256)." },
        { status: 500 }
      );
    }
    if (
      message === "DOCUMENT_NOT_FOUND" ||
      message === "DOCUMENT_VERSION_NOT_FOUND" ||
      message === "DOCUMENT_CONTENT_UNAVAILABLE"
    ) {
      return NextResponse.json({ error: "File non trovato." }, { status: 404 });
    }
    return handleLeanEventRouteError(error, "Download documento non riuscito.");
  }
}
