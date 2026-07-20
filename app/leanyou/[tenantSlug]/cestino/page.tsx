import { notFound, redirect } from "next/navigation";

import { LeonardoTrashList } from "@/components/lean-event/LeonardoTrashList";
import { findTenantBySlug, tenantHasModule } from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoCestinoPath,
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
    title: "Lean Event · Cestino",
    description: "Recupero elementi eliminati Leonardo.",
    path: leanEventLeonardoCestinoPath(tenantSlug),
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
    redirect(leanEventLoginPath());
  }
  if (!tenantHasModule(session, "events")) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
      <LeonardoTrashList tenantSlug={tenantSlug} />
    );
}
