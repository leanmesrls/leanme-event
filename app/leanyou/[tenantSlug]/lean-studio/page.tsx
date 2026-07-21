import { redirect } from "next/navigation";

import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
} from "@/components/lean-event/LeonardoPageHeader";
import {
  findTenantBySlug,
  tenantHasLeonardoCapability,
} from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoLeanStudioPath,
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
    title: "LeanEvent · Lean.Studio",
    description:
      "Supporto operatore LeanMe per sviluppo personalizzato di form, newsletter, survey e grafiche.",
    path: leanEventLeonardoLeanStudioPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoLeanStudioPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    redirect(leanEventLoginPath());
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  if (!tenantHasLeonardoCapability(session, "lean_human")) {
    redirect(leanEventLeonardoPath(tenantSlug));
  }

  return (
    <div className="space-y-4">
      <LeonardoPageHeader
        title="Lean.Studio"
        subtitle="Richiedi il supporto di un operatore LeanMe per lo sviluppo personalizzato di contenuti: form, newsletter, survey, grafiche e altro."
        action={
          <a
            href="mailto:info@leanme.it?subject=LeanEvent%20-%20Lean.Studio%20richiesta%20sviluppo"
            className={LEONARDO_PAGE_ACTION_BUTTON}
          >
            Richiedi sviluppo
          </a>
        }
      />
      <p className="max-w-2xl text-sm text-white/55">
        Lean.Studio è il canale per lavori su misura. Scrivici con il brief: il
        team LeanMe ti supporta nella realizzazione.
      </p>
    </div>
  );
}
