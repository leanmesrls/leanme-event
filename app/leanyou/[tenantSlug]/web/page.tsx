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
    title: "Lean Event · Web",
    description: "Portali evento e ospiti — pack Pro.",
    path: `${leanEventLeonardoPath(tenantSlug)}/web`,
    noIndex: true,
  });
}

export default async function WebModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "public_site",
    title: "Web",
    subtitle: "Portali evento e portali ospiti.",
    packHint: "Modulo Pro",
  });
}
