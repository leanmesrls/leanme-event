import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoContactDetail } from "@/components/lean-event/LeonardoContactDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getContact } from "@/lib/lean-event/contacts";
import { listAssignmentsForContactWithEvents } from "@/lib/lean-event/event-assignments";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoContactPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: "Lean Event · Scheda contatto",
    description: "Dettaglio contatto rubrica Leonardo.",
    path: leanEventLeonardoContactPath(tenantSlug, id),
    noIndex: true,
  });
}

export default async function LeonardoContactDetailPage({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "contatti")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const contact = await getContact(session.tenantId, id);
  if (!contact) {
    notFound();
  }

  const assignments = await listAssignmentsForContactWithEvents(
    session.tenantId,
    id
  );

  return (
    <LeanEventShell session={session}>
      <LeonardoContactDetail
        tenantSlug={tenantSlug}
        initialContact={{ ...contact, tags: contact.tags ?? [] }}
        assignments={assignments}
      />
    </LeanEventShell>
  );
}
