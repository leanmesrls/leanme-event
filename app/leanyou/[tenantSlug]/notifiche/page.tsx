import { notFound, redirect } from "next/navigation";

import { LeonardoNotificationsPanel } from "@/components/lean-event/LeonardoNotificationsPanel";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoNotifichePath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Notifiche",
    description: "Aggiornamenti periodici Lean Event.",
    path: leanEventLeonardoNotifichePath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoNotifichePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  return (
    <LeonardoNotificationsPanel
      tenantSlug={tenantSlug}
      userEmail={session.userEmail}
    />
  );
}
