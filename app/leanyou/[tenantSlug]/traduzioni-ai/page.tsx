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
    title: "Lean Event · Traduzioni AI",
    description: "Traduzioni assistite — pack Intelligence.",
    path: `${leanEventLeonardoPath(tenantSlug)}/traduzioni-ai`,
    noIndex: true,
  });
}

export default async function TraduzioniAiModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "ai_translations",
    title: "Traduzioni AI",
    subtitle: "Traduzione e localizzazione contenuti assistite da AI.",
    packHint: "Modulo Intelligence",
  });
}
