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
import type {
  LeanEventContact,
  LeanEventContactEmail,
  LeanEventContactPrivacyConsent,
} from "@/types/lean-event";
import { deleteContact, getContact, saveContact } from "@/lib/lean-event/contacts";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { normalizeTagsList, parseTagsRaw } from "@/lib/lean-event/contact-tags";
import {
  hasBaseDataProcessingConsent,
  normalizeContactEmails,
  normalizePrivacyConsents,
  primaryEmailFromList,
} from "@/lib/lean-event/contact-privacy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function pickString(
  body: Partial<LeanEventContact>,
  key: keyof LeanEventContact,
  current: string | undefined
): string {
  const value = body[key];
  if (typeof value === "string") {
    return value.trim();
  }
  return current ?? "";
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
    return handleLeanEventRouteError(error, "Caricamento contatto non riuscito.");
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

    const body = (await request.json()) as Partial<LeanEventContact> & {
      phone?: string;
      tags?: string | string[];
      emails?: LeanEventContactEmail[];
      privacyConsents?: LeanEventContactPrivacyConsent[];
      expectedRevision?: number;
    };

    const emails =
      body.emails !== undefined || body.email !== undefined
        ? normalizeContactEmails({
            email: body.email ?? contact.email,
            emails: body.emails ?? contact.emails,
          })
        : normalizeContactEmails(contact);
    const email = primaryEmailFromList(emails);
    if (!email) {
      return NextResponse.json(
        { error: "Email obbligatoria." },
        { status: 400 }
      );
    }

    const privacyConsents =
      body.privacyConsents !== undefined
        ? normalizePrivacyConsents(body.privacyConsents)
        : normalizePrivacyConsents(contact.privacyConsents);
    if (!hasBaseDataProcessingConsent(privacyConsents)) {
      return NextResponse.json(
        { error: "Il consenso al trattamento dati è obbligatorio." },
        { status: 400 }
      );
    }

    const next: LeanEventContact = {
      ...contact,
      vocative: pickString(body, "vocative", contact.vocative),
      honorificTitle: pickString(body, "honorificTitle", contact.honorificTitle),
      firstName:
        body.firstName !== undefined ? body.firstName.trim() : contact.firstName,
      lastName:
        body.lastName !== undefined ? body.lastName.trim() : contact.lastName,
      email,
      emails,
      phones: body.phones ?? contact.phones,
      birthDate: pickString(body, "birthDate", contact.birthDate),
      address: pickString(body, "address", contact.address),
      city: pickString(body, "city", contact.city),
      province:
        body.province !== undefined
          ? body.province.trim().toUpperCase()
          : contact.province ?? "",
      region: pickString(body, "region", contact.region),
      postalCode: pickString(body, "postalCode", contact.postalCode),
      country: pickString(body, "country", contact.country),
      organization:
        body.organization !== undefined
          ? body.organization.trim()
          : contact.organization,
      organizationAddress: pickString(
        body,
        "organizationAddress",
        contact.organizationAddress
      ),
      organizationCity: pickString(
        body,
        "organizationCity",
        contact.organizationCity
      ),
      organizationProvince:
        body.organizationProvince !== undefined
          ? body.organizationProvince.trim().toUpperCase()
          : contact.organizationProvince ?? "",
      organizationRegion: pickString(
        body,
        "organizationRegion",
        contact.organizationRegion
      ),
      organizationPostalCode: pickString(
        body,
        "organizationPostalCode",
        contact.organizationPostalCode
      ),
      organizationCountry: pickString(
        body,
        "organizationCountry",
        contact.organizationCountry
      ),
      organizationRole: pickString(
        body,
        "organizationRole",
        contact.organizationRole
      ),
      dietaryNotes: pickString(body, "dietaryNotes", contact.dietaryNotes),
      mobilityNotes: pickString(body, "mobilityNotes", contact.mobilityNotes),
      personalRequests: pickString(
        body,
        "personalRequests",
        contact.personalRequests
      ),
      privacyConsents,
      tags:
        body.tags !== undefined
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
    return handleLeanEventRouteError(error, "Aggiornamento contatto non riuscito.");
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
    return handleLeanEventRouteError(error, "Eliminazione contatto non riuscita.");
  }
}
