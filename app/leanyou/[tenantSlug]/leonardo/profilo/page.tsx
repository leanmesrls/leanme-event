import { notFound, redirect } from "next/navigation";

import { LeanYouShell } from "@/components/leanyou/LeanYouShell";
import { LeonardoProfilePanel } from "@/components/leanyou/LeonardoProfilePanel";
import { findTenantBySlug } from "@/lib/leanyou/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanyouLeonardoProfiloPath,
  leanyouLoginPath,
} from "@/lib/leanyou/paths";
import { getSession } from "@/lib/leanyou/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;

  return createPageMetadata({
    title: "LeanYou · Profilo",
    description: "Profilo utente LeanYou Leonardo.",
    path: leanyouLeonardoProfiloPath(tenantSlug),
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
    redirect(leanyouLoginPath());
  }

  return (
    <LeanYouShell session={session}>
      <LeonardoProfilePanel session={session} />
    </LeanYouShell>
  );
}
