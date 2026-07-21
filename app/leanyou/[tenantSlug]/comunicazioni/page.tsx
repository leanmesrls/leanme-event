import { createPageMetadata } from "@/lib/metadata";
import { renderCapabilityModulePage } from "@/lib/lean-event/module-page";
import { leanEventLeonardoPath } from "@/lib/lean-event/paths";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Comunicazioni",
    description: "Newsletter e SMS — pack Pro.",
    path: `${leanEventLeonardoPath(tenantSlug)}/comunicazioni`,
    noIndex: true,
  });
}

export default async function ComunicazioniModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "comunicazioni",
    title: "Comunicazioni",
    subtitle: "Newsletter, SMS e comunicazioni verso partecipanti e stakeholder.",
    packHint: "Modulo Pro",
  });
}
