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
  contactCreateLockKey,
  contactCreateLocks,
} from "@/lib/lean-event/contact-create-lock";

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
    const lockKey = email ? contactCreateLockKey(session.tenantId, email) : null;

    if (lockKey) {
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
    }

    try {
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

      if (email) {
        const raced = await findContactByEmailForTenant(session.tenantId, email);
        if (raced) {
          return NextResponse.json({ contact: raced });
        }
      }

      await saveContact(contact);
      return NextResponse.json({ contact });
    } finally {
      if (lockKey) {
        contactCreateLocks.delete(lockKey);
      }
    }
  } catch (error) {
    return handleLeanEventRouteError(error, "Creazione contatto non riuscita.");
  }
}
