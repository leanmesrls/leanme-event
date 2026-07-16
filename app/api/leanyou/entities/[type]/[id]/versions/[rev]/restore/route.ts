import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  isVersionableEntityType,
  restoreEntityVersion,
  type LeanEventVersionableType,
} from "@/lib/lean-event/entity-versions";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { LeanEventSession } from "@/types/lean-event";

interface RouteContext {
  params: Promise<{ type: string; id: string; rev: string }>;
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

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (!tenantHasModule(session, "events")) {
      return forbiddenResponse();
    }

    const { type, id, rev } = await context.params;
    if (!isVersionableEntityType(type)) {
      return NextResponse.json({ error: "Tipo non valido." }, { status: 400 });
    }
    if (!canAccessType(session, type)) {
      return forbiddenResponse();
    }

    const revision = Number(rev);
    if (!Number.isInteger(revision) || revision < 1) {
      return NextResponse.json(
        { error: "Revisione non valida." },
        { status: 400 }
      );
    }

    try {
      const result = await restoreEntityVersion(session, type, id, revision);
      return NextResponse.json({
        ok: true,
        restoredFromRevision: result.restoredFromRevision,
        entity: result.entity,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "VERSION_NOT_FOUND") {
          return NextResponse.json(
            { error: "Revisione non trovata." },
            { status: 404 }
          );
        }
        if (error.message === "ENTITY_NOT_FOUND") {
          return NextResponse.json(
            { error: "Entità non trovata." },
            { status: 404 }
          );
        }
        if (
          error.message === "VERSION_IDENTITY_MISMATCH" ||
          error.message === "VERSION_TENANT_MISMATCH"
        ) {
          return NextResponse.json(
            { error: "Snapshot non compatibile con questa entità." },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Ripristino revisione non riuscito."
    );
  }
}
