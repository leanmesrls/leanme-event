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
    title: "Lean Event · Forms",
    description: "Moduli e form — pack Pro.",
    path: `${leanEventLeonardoPath(tenantSlug)}/forms`,
    noIndex: true,
  });
}

export default async function FormsModulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return renderCapabilityModulePage({
    tenantSlug,
    capability: "survey",
    title: "Forms",
    subtitle: "Form, survey e raccolta dati collegati agli eventi.",
    packHint: "Modulo Pro",
  });
}
