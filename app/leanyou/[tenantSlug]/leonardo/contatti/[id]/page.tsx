import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoContactDetail } from "@/components/leanyou/LeonardoContactDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { getContact } from "@/lib/leanyou/contacts";
import { listAssignmentsForContactWithEvents } from "@/lib/leanyou/event-assignments";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoContactPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: "LeanYou · Scheda contatto",
    description: "Dettaglio contatto rubrica Leonardo.",
    path: leanyouLeonardoContactPath(tenantSlug, id),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "contatti")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
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
    <LeanYouShell session={session}>
      <LeonardoContactDetail
        tenantSlug={tenantSlug}
        initialContact={{ ...contact, tags: contact.tags ?? [] }}
        assignments={assignments}
      />
    </LeanYouShell>
  );
}
