import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getDocument } from "@/lib/lean-event/documents";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
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
    const document = await getDocument(session.tenantId, id);
    if (!document) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      return NextResponse.json(
        { error: "Storage Blob non configurato." },
        { status: 503 }
      );
    }

    const result = await get(document.blobPath, {
      access: "private",
      useCache: false,
    });
    if (!result?.stream) {
      return NextResponse.json({ error: "File non trovato nello storage." }, { status: 404 });
    }

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleLeanEventRouteError(error, "Download documento non riuscito.");
  }
}
