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
    title: "Lean Event · Designer AI",
    description: "Grafica assistita — pack Intelligence.",
    path: `${leanEventLeonardoPath(tenantSlug)}/designer-ai`,
    noIndex: true,
  });
}

export default async function DesignerAiModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "ai_graphics",
    title: "Designer AI",
    subtitle: "Grafica e materiali visivi assistiti da AI.",
    packHint: "Modulo Intelligence",
  });
}
