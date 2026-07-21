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
import {
  createContact,
  findContactByEmailForTenant,
  listContacts,
  saveContact,
} from "@/lib/lean-event/contacts";
import { normalizeTagsList, parseTagsRaw } from "@/lib/lean-event/contact-tags";
import {
  hasBaseDataProcessingConsent,
  normalizeContactEmails,
  normalizePrivacyConsents,
  primaryEmailFromList,
} from "@/lib/lean-event/contact-privacy";
import {
  contactCreateLockKey,
  contactCreateLocks,
} from "@/lib/lean-event/contact-create-lock";
import type {
  LeanEventContactEmail,
  LeanEventContactPrivacyConsent,
} from "@/types/lean-event";

export async function GET() {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const contacts = await listContacts(session.tenantId);
    return NextResponse.json({ contacts });
  } catch (error) {
    return handleLeanEventRouteError(error, "Caricamento contatti non riuscito.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (
      !tenantHasModule(session, "events") ||
      !tenantHasLeonardoCapability(session, "contatti")
    ) {
      return forbiddenResponse();
    }

    const body = (await request.json()) as {
      vocative?: string;
      honorificTitle?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      emails?: LeanEventContactEmail[];
      fiscalCode?: string;
      phone?: string;
      phones?: { label: string; number: string }[];
      birthDate?: string;
      address?: string;
      city?: string;
      province?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      organization?: string;
      organizationAddress?: string;
      organizationCity?: string;
      organizationProvince?: string;
      organizationRegion?: string;
      organizationPostalCode?: string;
      organizationCountry?: string;
      organizationRole?: string;
      dietaryNotes?: string;
      mobilityNotes?: string;
      personalRequests?: string;
      privacyConsents?: LeanEventContactPrivacyConsent[];
      tags?: string | string[];
      notes?: string;
    };

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json(
        { error: "Nome e cognome obbligatori." },
        { status: 400 }
      );
    }

    const emails = normalizeContactEmails({
      email: body.email ?? "",
      emails: body.emails,
    });
    const email = primaryEmailFromList(emails);
    if (!email) {
      return NextResponse.json(
        { error: "Email obbligatoria." },
        { status: 400 }
      );
    }

    const privacyConsents = normalizePrivacyConsents(body.privacyConsents);
    if (!hasBaseDataProcessingConsent(privacyConsents)) {
      return NextResponse.json(
        { error: "Il consenso al trattamento dati è obbligatorio." },
        { status: 400 }
      );
    }

    const lockKey = contactCreateLockKey(session.tenantId, email);

    if (contactCreateLocks.has(lockKey)) {
      const existing = await findContactByEmailForTenant(session.tenantId, email);
      if (existing) {
        return NextResponse.json({ contact: existing });
      }
      return NextResponse.json(
        { error: "Creazione contatto già in corso. Riprova tra un istante." },
        { status: 429 }
      );
    }
    contactCreateLocks.add(lockKey);

    try {
      const existing = await findContactByEmailForTenant(session.tenantId, email);
      if (existing) {
        return NextResponse.json(
          {
            error: "Contatto già presente.",
            duplicate: true,
            contact: existing,
          },
          { status: 409 }
        );
      }

      const tags = Array.isArray(body.tags)
        ? normalizeTagsList(body.tags)
        : parseTagsRaw(body.tags ?? "");

      const phones =
        body.phones ??
        (body.phone?.trim()
          ? [{ label: "Principale", number: body.phone.trim() }]
          : []);

      const contact = createContact(session, {
        vocative: body.vocative,
        honorificTitle: body.honorificTitle,
        firstName: body.firstName,
        lastName: body.lastName,
        email,
        emails,
        fiscalCode: body.fiscalCode,
        phones,
        birthDate: body.birthDate,
        address: body.address,
        city: body.city,
        province: body.province,
        region: body.region,
        postalCode: body.postalCode,
        country: body.country,
        organization: body.organization ?? "",
        organizationAddress: body.organizationAddress,
        organizationCity: body.organizationCity,
        organizationProvince: body.organizationProvince ?? "",
        organizationRegion: body.organizationRegion,
        organizationPostalCode: body.organizationPostalCode,
        organizationCountry: body.organizationCountry,
        organizationRole: body.organizationRole,
        dietaryNotes: body.dietaryNotes,
        mobilityNotes: body.mobilityNotes,
        personalRequests: body.personalRequests,
        privacyConsents,
        tags,
        notes: body.notes ?? "",
      });

      const raced = await findContactByEmailForTenant(session.tenantId, email);
      if (raced) {
        return NextResponse.json({ contact: raced });
      }

      await saveContact(contact);
      return NextResponse.json({ contact });
    } finally {
      contactCreateLocks.delete(lockKey);
    }
  } catch (error) {
    return handleLeanEventRouteError(error, "Creazione contatto non riuscita.");
  }
}
