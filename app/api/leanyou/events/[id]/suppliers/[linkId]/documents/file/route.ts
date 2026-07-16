import { readFile } from "node:fs/promises";
import path from "node:path";

import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  forbiddenResponse,
  requireSession,
} from "@/lib/lean-event/server-auth";
import { getDataRoot } from "@/lib/lean-event/storage";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

async function readEventSupplierDocBuffer(input: {
  tenantId: string;
  eventId: string;
  linkId: string;
  filename: string;
}): Promise<Buffer | null> {
  const scopeId = `${input.eventId}__${input.linkId}`;
  try {
    const dir = path.join(
      getDataRoot(),
      "supplier-documents",
      input.tenantId,
      "event",
      scopeId
    );
    return await readFile(path.join(dir, input.filename));
  } catch {
    // Blob fallback
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return null;
  }

  try {
    const pathname = `lean-event/supplier-documents/${input.tenantId}/event/${scopeId}/${input.filename}`;
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result?.stream) {
      return null;
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "eventi")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId, linkId } = await context.params;
    const url = new URL(request.url);
    const documentId = url.searchParams.get("id") ?? "";
    const name = url.searchParams.get("name") ?? "file";

    if (!documentId) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    const filename = `${documentId}-${name}`;
    const buffer = await readEventSupplierDocBuffer({
      tenantId: session.tenantId,
      eventId,
      linkId,
      filename,
    });
    if (!buffer) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
}
