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
    title: "Lean Event · Writer AI",
    description: "Scrittura assistita — pack Business.",
    path: `${leanEventLeonardoPath(tenantSlug)}/writer-ai`,
    noIndex: true,
  });
}

export default async function WriterAiModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "ai_writing",
    title: "Writer AI",
    subtitle: "Scrittura e contenuti assistiti da AI.",
    packHint: "Modulo Business",
  });
}
