import { NextResponse } from "next/server";

import {
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import {
  applyBulkEventAssignments,
  previewBulkEventAssignments,
  type BulkAssignmentSource,
} from "@/lib/lean-event/event-assignment-bulk";
import {
  isValidRoleCategory,
  listAssignmentsForEventWithContacts,
} from "@/lib/lean-event/event-assignments";
import { getEvent } from "@/lib/lean-event/events";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";
import type { TenantEventRoleCategory } from "@/types/lean-event";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseBulkSource(body: {
  source?: BulkAssignmentSource;
}): BulkAssignmentSource | null {
  const source = body.source;
  if (!source?.type) {
    return null;
  }

  if (source.type === "tags") {
    const tags = (source.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
    if (tags.length === 0) {
      return null;
    }
    return {
      type: "tags",
      tags,
      match: source.match === "all" ? "all" : "any",
    };
  }

  if (source.type === "organization") {
    const organization = source.organization?.trim() ?? "";
    if (!organization) {
      return null;
    }
    return { type: "organization", organization };
  }

  if (source.type === "past_event") {
    const sourceEventId = source.sourceEventId?.trim() ?? "";
    if (!sourceEventId) {
      return null;
    }
    return {
      type: "past_event",
      sourceEventId,
      sourceRoleCategory:
        source.sourceRoleCategory &&
        isValidRoleCategory(source.sourceRoleCategory)
          ? source.sourceRoleCategory
          : undefined,
    };
  }

  if (source.type === "contact_ids") {
    const contactIds = (source.contactIds ?? [])
      .map((id) => id.trim())
      .filter(Boolean);
    if (contactIds.length === 0) {
      return null;
    }
    return { type: "contact_ids", contactIds };
  }

  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "ospiti")
    ) {
      return forbiddenResponse();
    }

    const { id: eventId } = await context.params;
    const event = await getEvent(session.tenantId, eventId);
    if (!event) {
      return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as {
      preview?: boolean;
      roleCategory?: string;
      notes?: string;
      source?: BulkAssignmentSource;
    };

    const source = parseBulkSource(body);
    if (!source) {
      return NextResponse.json(
        { error: "Seleziona una fonte valida per il gruppo." },
        { status: 400 }
      );
    }

    if (!body.roleCategory || !isValidRoleCategory(body.roleCategory)) {
      return NextResponse.json(
        { error: "Seleziona un ruolo valido." },
        { status: 400 }
      );
    }

    const roleCategory = body.roleCategory as TenantEventRoleCategory;

    if (source.type === "past_event" && source.sourceEventId === eventId) {
      return NextResponse.json(
        { error: "Seleziona un evento diverso da quello corrente." },
        { status: 400 }
      );
    }

    if (body.preview) {
      const preview = await previewBulkEventAssignments(
        session.tenantId,
        eventId,
        source,
        roleCategory
      );
      return NextResponse.json({ preview });
    }

    const result = await applyBulkEventAssignments(
      session,
      eventId,
      source,
      roleCategory,
      body.notes
    );

    const assignments = await listAssignmentsForEventWithContacts(
      session.tenantId,
      eventId
    );

    return NextResponse.json({
      created: result.created,
      skipped: result.skipped,
      preview: result.preview,
      assignments,
    });
  } catch (error) {
    return handleLeanEventRouteError(
      error,
      "Assegnazione gruppo non riuscita."
    );
  }
}
