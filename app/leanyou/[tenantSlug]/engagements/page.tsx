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
    title: "Lean Event · Engagements",
    description: "Quiz da palco a platea — pack Pro.",
    path: `${leanEventLeonardoPath(tenantSlug)}/engagements`,
    noIndex: true,
  });
}

export default async function EngagementsModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "connect",
    title: "Engagements",
    subtitle: "Quiz e interazioni da palco a platea e viceversa.",
    packHint: "Modulo Pro",
  });
}
