import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoSupplierListPageClient } from "@/components/leanyou/LeonardoSupplierListPageClient";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { getSessionLeonardoCapabilities } from "@/lib/leanyou/capabilities";
import { listSuppliers } from "@/lib/leanyou/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoFornitoriPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Rubrica fornitori",
    description: "Rubrica fornitori Leonardo.",
    path: leanyouLeonardoFornitoriPath(tenantSlug),
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
    redirect(leanyouLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "fornitori")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const capabilities = getSessionLeonardoCapabilities(session);
  const suppliers = await listSuppliers(session.tenantId);

  return (
    <LeanYouShell session={session}>
      <Suspense fallback={<p className="text-sm text-white/50">Caricamento rubrica…</p>}>
        <LeonardoSupplierListPageClient
          tenantSlug={tenantSlug}
          initialSuppliers={suppliers}
          clientiEnabled={capabilities.clienti}
        />
      </Suspense>
    </LeanYouShell>
  );
}
