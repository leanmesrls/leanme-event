import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoSupplierListPageClient } from "@/components/lean-event/LeonardoSupplierListPageClient";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { listSuppliers } from "@/lib/lean-event/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoFornitoriPath,
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
    title: "Lean Event · Rubrica fornitori",
    description: "Rubrica fornitori Leonardo.",
    path: leanEventLeonardoFornitoriPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoFornitoriPage({ params }: PageProps) {
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
    !tenantHasLeonardoCapability(session, "fornitori")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  const suppliers = await listSuppliers(session.tenantId);

  return (
    <LeanEventShell session={session}>
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento rubrica…</p>}>
        <LeonardoSupplierListPageClient
          tenantSlug={tenantSlug}
          initialSuppliers={suppliers}
          clientiEnabled={capabilities.clienti}
        />
      </Suspense>
    </LeanEventShell>
  );
}
