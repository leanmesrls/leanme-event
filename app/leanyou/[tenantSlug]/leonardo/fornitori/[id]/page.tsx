import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoSupplierDetail } from "@/components/lean-event/LeonardoSupplierDetail";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
  tenantHasModule,
} from "@/lib/lean-event/auth";
import { getSessionLeonardoCapabilities } from "@/lib/lean-event/capabilities";
import { getSupplier } from "@/lib/lean-event/suppliers";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoFornitoriPath,
  leanEventLeonardoPath,
  leanEventLeonardoSupplierPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug, id } = await params;

  return createPageMetadata({
    title: `Lean Event · Fornitore ${id.slice(0, 8)}`,
    description: "Scheda fornitore Leonardo.",
    path: leanEventLeonardoSupplierPath(tenantSlug, id),
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
    redirect(leanEventLoginPath());
  }
  if (
    !tenantHasModule(session, "events") ||
    !tenantHasLeonardoCapability(session, "fornitori")
  ) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  const supplier = await getSupplier(session.tenantId, id);
  if (!supplier) {
    redirect(`${leanEventLeonardoFornitoriPath(tenantSlug)}?fornitore=missing`);
  }

  const capabilities = getSessionLeonardoCapabilities(session);

  return (
    <LeanEventShell session={session}>
      <LeonardoSupplierDetail
        tenantSlug={tenantSlug}
        initialSupplier={supplier}
        clientiEnabled={capabilities.clienti}
      />
    </LeanEventShell>
  );
}
