import { notFound, redirect } from "next/navigation";

import { LeanEventShell } from "@/components/lean-event/LeanEventShell";
import { LeonardoProfilePanel } from "@/components/lean-event/LeonardoProfilePanel";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoProfiloPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "Lean Event · Profilo",
    description: "Profilo utente LeanEvent Leonardo.",
    path: leanEventLeonardoProfiloPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoProfiloPage({ params }: PageProps) {
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
    <LeanEventShell session={session}>
      <LeonardoProfilePanel session={session} />
    </LeanEventShell>
  );
}
