import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import {
  forbiddenResponse,
  handleLeanYouRouteError,
  requireSession,
} from "@/lib/leanyou/server-auth";
import { isTrashEntityType, restoreTrashItem } from "@/lib/leanyou/trash";

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

    const restored = await restoreTrashItem(session, type, id);
    if (!restored) {
      return NextResponse.json(
        { error: "Elemento non trovato nel cestino." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(error, "Ripristino non riuscito.");
  }
}
