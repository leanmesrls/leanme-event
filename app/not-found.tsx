import Link from "next/link";
import { PageSection } from "@/components/layout/PageSection";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Pagina non trovata",
  description: "La pagina richiesta non esiste.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <PageSection>
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leanme-purple">
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white">Pagina non trovata</h1>
        <p className="mt-4 text-white/65">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-leanme-purple px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-purple/90"
        >
          Torna alla Home
        </Link>
      </div>
    </PageSection>
  );
}
