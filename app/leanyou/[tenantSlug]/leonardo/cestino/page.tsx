import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoTrashList } from "@/components/leanyou/LeonardoTrashList";
import { findTenantBySlug, tenantHasModule } from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoCestinoPath,
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
    title: "LeanYou · Cestino",
    description: "Recupero elementi eliminati Leonardo.",
    path: leanyouLeonardoCestinoPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoCestinoPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanyouLoginPath());
  }
  if (!tenantHasModule(session, "events")) {
    redirect(leanyouLeonardoPath(tenantSlug));
  }

  return (
    <LeanYouShell session={session}>
      <LeonardoTrashList tenantSlug={tenantSlug} />
    </LeanYouShell>
  );
}
