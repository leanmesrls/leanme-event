import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  isVersionableEntityType,
  listEntityVersions,
  type LeanEventVersionableType,
} from "@/lib/lean-event/entity-versions";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { LeanEventSession } from "@/types/lean-event";

interface RouteContext {
  params: Promise<{ type: string; id: string }>;
}

function canAccessType(
  session: LeanEventSession,
  type: LeanEventVersionableType
): boolean {
  if (type === "event" || type === "venue") {
    return tenantHasLeonardoCapability(session, "eventi");
  }
  if (type === "contact") {
    return tenantHasLeonardoCapability(session, "contatti");
  }
  if (type === "supplier") {
    return tenantHasLeonardoCapability(session, "fornitori");
  }
  return (
    tenantHasLeonardoCapability(session, "verbali") ||
    tenantHasLeonardoCapability(session, "eventi")
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }

    const { type, id } = await context.params;
    if (!isVersionableEntityType(type)) {
      return NextResponse.json({ error: "Tipo non valido." }, { status: 400 });
    }
    if (!canAccessType(session, type)) {
      return forbiddenResponse();
    }

    const versions = await listEntityVersions(session.tenantId, type, id);
    return NextResponse.json({ versions });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Caricamento cronologia non riuscito."
    );
  }
}
