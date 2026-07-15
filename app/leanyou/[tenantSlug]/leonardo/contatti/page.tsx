import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoContactListPageClient } from "@/components/lean-event/LeonardoContactListPageClient";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { listContacts } from "@/lib/lean-event/contacts";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoContattiPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Rubrica contatti",
    description: "Rubrica contatti Leonardo.",
    path: leanEventLeonardoContattiPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoContattiPage({ params }: PageProps) {
  const { tenantSlug } = await params;
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

  const capabilities = getSessionLeonardoCapabilities(session);
  const contacts = await listContacts(session.tenantId);

  return (
    <LeanEventShell session={session}>
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento rubrica…</p>}>
        <LeonardoContactListPageClient
          tenantSlug={tenantSlug}
          initialContacts={contacts}
          clientiEnabled={capabilities.clienti}
        />
      </Suspense>
    </LeanEventShell>
  );
}
