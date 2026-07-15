import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoSupplierDetail } from "@/components/leanyou/LeonardoSupplierDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/leanyou/auth";
import { getSessionLeonardoCapabilities } from "@/lib/leanyou/capabilities";
import { getSupplier } from "@/lib/leanyou/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoFornitoriPath,
  leanyouLeonardoPath,
  leanyouLeonardoSupplierPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `LeanYou · Fornitore ${id.slice(0, 8)}`,
    description: "Scheda fornitore Leonardo.",
    path: leanyouLeonardoSupplierPath(tenantSlug, id),
    noIndex: true,
  });
}

export default async function LeonardoFornitoreDetailPage({ params }: PageProps) {
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
    !tenantHasLeonardoCapability(session, "fornitori")
  ) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  const supplier = await getSupplier(session.tenantId, id);
  if (!supplier) {
    redirect(`${leanyouLeonardoFornitoriPath(tenantSlug)}?fornitore=missing`);
  }

  const capabilities = getSessionLeonardoCapabilities(session);

  return (
    <LeanYouShell session={session}>
      <LeonardoSupplierDetail
        tenantSlug={tenantSlug}
        initialSupplier={supplier}
        clientiEnabled={capabilities.clienti}
      />
    </LeanYouShell>
  );
}
