import { redirect } from "next/navigation";

import { LeonardoTeresaSupervisePanel } from "@/components/lean-event/LeonardoTeresaSupervisePanel";
import {
  findTenantBySlug,
  isLeanMePlatformOperator,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoLeanHumanPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "LeanEvent · Lean.Human",
    description:
      "Supervisione conversazioni Lean.Agent.Teresa — operatori piattaforma LeanMe.",
    path: leanEventLeonardoLeanHumanPath(tenantSlug),
    noIndex: true,
  });
}

/** Controllo Teresa — solo operatori piattaforma LeanMe. */
export default async function LeonardoLeanHumanPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  if (!isLeanMePlatformOperator(session)) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return <LeonardoTeresaSupervisePanel />;
}
