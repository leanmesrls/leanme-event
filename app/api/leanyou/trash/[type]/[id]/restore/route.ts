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
import { isTrashEntityType, restoreTrashItem } from "@/lib/lean-event/trash";

interface RouteContext {
  params: Promise<{ type: string; id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }

    const { type, id } = await context.params;
    if (!isTrashEntityType(type)) {
      return NextResponse.json({ error: "Tipo non valido." }, { status: 400 });
    }

    if (type === "event" && !tenantHasLeonardoCapability(session, "eventi")) {
      return forbiddenResponse();
    }
    if (type === "contact" && !tenantHasLeonardoCapability(session, "contatti")) {
      return forbiddenResponse();
    }
    if (type === "supplier" && !tenantHasLeonardoCapability(session, "fornitori")) {
      return forbiddenResponse();
    }
    if (type === "venue" && !tenantHasLeonardoCapability(session, "eventi")) {
      return forbiddenResponse();
    }
    if (type === "assignment" && !tenantHasLeonardoCapability(session, "ospiti")) {
      return forbiddenResponse();
    }

    try {
      const restored = await restoreTrashItem(session, type, id);
      if (!restored) {
        return NextResponse.json(
          { error: "Elemento non trovato nel cestino." },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === "ASSIGNMENT_DUPLICATE") {
        return NextResponse.json(
          {
            error:
              "Impossibile ripristinare: lo stesso contatto ha già questo ruolo sull'evento.",
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    return handleLeanEventRouteError(error, "Ripristino non riuscito.");
  }
}
