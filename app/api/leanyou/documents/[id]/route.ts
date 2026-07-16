import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  getDocument,
  restoreDocument,
  softDeleteDocument,
} from "@/lib/lean-event/documents";
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
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }
    const { id } = await context.params;
    const document = await getDocument(session.tenantId, id);
    if (!document) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento documento non riuscito.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const document = await softDeleteDocument(session, id);
    if (!document) {
      return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    return handleLeanEventRouteError(error, "Eliminazione documento non riuscita.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "restore") {
      return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
    }
    const document = await restoreDocument(session, id);
    if (!document) {
      return NextResponse.json(
        { error: "Documento non trovato nel cestino." },
        { status: 404 }
      );
    }
    return NextResponse.json({ document });
  } catch (error) {
    return handleLeanEventRouteError(error, "Ripristino documento non riuscito.");
  }
}
