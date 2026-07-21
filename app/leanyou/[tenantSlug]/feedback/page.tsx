import { notFound, redirect } from "next/navigation";

import { LeonardoPageHeader } from "@/components/lean-event/LeonardoPageHeader";
import { findTenantBySlug } from "@/lib/lean-event/auth";
import { createPageMetadata } from "@/lib/metadata";
import {
  leanEventLeonardoFeedbackPath,
  leanEventLoginPath,
} from "@/lib/lean-event/paths";
import { getSession } from "@/lib/lean-event/session";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

const REVIEW_LINKS = [
  {
    id: "google",
    label: "Google",
    description: "Lascia una recensione sulla scheda Google di LeanMe.",
    href: "https://g.page/r/CcFwi4z7aOYQEBM/review",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Scrivi una recensione sulla pagina Facebook LeanMe.it.",
    href: "https://www.facebook.com/LeanMe.it/reviews",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Seguici e raccontaci la tua esperienza.",
    href: "https://www.instagram.com/leanme.it/",
    handle: "@leanme.it",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Lascia un feedback sulla company page LeanMe.",
    href: "https://www.linkedin.com/company/leanmeit",
  },
] as const;

export async function generateMetadata({ params }: PageProps) {
  const { tenantSlug } = await params;
  return createPageMetadata({
    title: "Lean Event · Feedback",
    description: "Lascia una recensione a LeanMe — ogni recensione è un extra omaggio.",
    path: leanEventLeonardoFeedbackPath(tenantSlug),
    noIndex: true,
  });
}

export default async function LeonardoFeedbackPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await findTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect(leanEventLoginPath());
  }

  return (
    <div className="space-y-6">
      <LeonardoPageHeader
        title="Feedback"
        subtitle="La tua opinione ci aiuta a migliorare. Ogni recensione è un extra omaggio."
      />

      <section className="rounded-xl border border-leanme-fuchsia/30 bg-leanme-fuchsia/10 px-5 py-4">
        <p className="text-sm font-medium text-white">
          Ogni recensione = un extra omaggio
        </p>
        <p className="mt-2 text-sm text-white/70">
          Se ti trovi bene con Lean Event, lasciaci una recensione pubblica.
          Per ogni recensione ricevuta ti riconosciamo un omaggio extra —
          dettagli e ritiro con il team LeanMe.
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {REVIEW_LINKS.map((link) => (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full flex-col rounded-xl border border-white/10 bg-[#111111] p-5 transition hover:border-leanme-fuchsia/45"
            >
              <span className="text-sm font-bold uppercase tracking-[0.1em] text-leanme-fuchsia">
                {link.label}
              </span>
              {"handle" in link && link.handle ? (
                <span className="mt-1 text-xs text-white/50">{link.handle}</span>
              ) : null}
              <span className="mt-2 flex-1 text-sm text-white/65">
                {link.description}
              </span>
              <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
                Apri →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
