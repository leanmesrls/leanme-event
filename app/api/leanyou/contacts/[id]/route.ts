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
import type { LeanYouContact } from "@/types/leanyou";
import { deleteContact, getContact, saveContact } from "@/lib/leanyou/contacts";
import { sessionUserId } from "@/lib/leanyou/entity-lifecycle";
import { normalizeTagsList, parseTagsRaw } from "@/lib/leanyou/contact-tags";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const contact = await getContact(session.tenantId, id);
    if (!contact) {
      return NextResponse.json({ error: "Contatto non trovato." }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    return handleLeanYouRouteError(error, "Caricamento contatto non riuscito.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    const contact = await getContact(session.tenantId, id);
    if (!contact) {
      return NextResponse.json({ error: "Contatto non trovato." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<LeanYouContact> & {
      phone?: string;
      tags?: string | string[];
      expectedRevision?: number;
    };

    const next: LeanYouContact = {
      ...contact,
      firstName:
        body.firstName !== undefined ? body.firstName.trim() : contact.firstName,
      lastName:
        body.lastName !== undefined ? body.lastName.trim() : contact.lastName,
      email: body.email !== undefined ? body.email.trim() : contact.email,
      phones: body.phones ?? contact.phones,
      organization:
        body.organization !== undefined
          ? body.organization.trim()
          : contact.organization,
      tags: body.tags !== undefined
        ? Array.isArray(body.tags)
          ? normalizeTagsList(body.tags)
          : parseTagsRaw(body.tags)
        : contact.tags ?? [],
      notes: body.notes !== undefined ? body.notes.trim() : contact.notes,
    };

    if (body.fiscalCode !== undefined) {
      const normalized = body.fiscalCode.trim().toUpperCase();
      next.fiscalCode = normalized || undefined;
    }

    if (body.phone?.trim()) {
      next.phones = [{ label: "Principale", number: body.phone.trim() }];
    }

    const saved = await saveContact(next, {
      expectedRevision: body.expectedRevision,
      userId: sessionUserId(session),
    });
    return NextResponse.json({ contact: saved });
  } catch (error) {
    return handleLeanYouRouteError(error, "Aggiornamento contatto non riuscito.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const { id } = await context.params;
    await deleteContact(session.tenantId, id, sessionUserId(session));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLeanYouRouteError(error, "Eliminazione contatto non riuscita.");
  }
}
