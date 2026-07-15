import { readFile } from "node:fs/promises";
import path from "node:path";

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

    const dir = path.join(
      getDataRoot(),
      "supplier-documents",
      session.tenantId,
      "rubrica",
      supplierId
    );
    const filename = `${documentId}-${name}`;
    const buffer = await readFile(path.join(dir, filename));

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
