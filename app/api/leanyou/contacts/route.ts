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
import {
  createContact,
  findContactByEmailForTenant,
  listContacts,
  saveContact,
} from "@/lib/leanyou/contacts";
import { normalizeTagsList, parseTagsRaw } from "@/lib/leanyou/contact-tags";

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
    return handleLeanYouRouteError(error, "Caricamento contatti non riuscito.");
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
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      organization?: string;
      tags?: string | string[];
      notes?: string;
    };

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json(
        { error: "Nome e cognome obbligatori." },
        { status: 400 }
      );
    }

    const email = body.email?.trim() ?? "";
    if (email) {
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
    }

    const tags = Array.isArray(body.tags)
      ? normalizeTagsList(body.tags)
      : parseTagsRaw(body.tags ?? "");

    const contact = createContact(session, {
      firstName: body.firstName,
      lastName: body.lastName,
      email,
      phones: body.phone?.trim()
        ? [{ label: "Principale", number: body.phone.trim() }]
        : [],
      organization: body.organization ?? "",
      tags,
      notes: body.notes ?? "",
    });

    await saveContact(contact);
    return NextResponse.json({ contact });
  } catch (error) {
    return handleLeanYouRouteError(error, "Creazione contatto non riuscita.");
  }
}
