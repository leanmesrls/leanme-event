import Link from "next/link";

import { leanEventLoginPath } from "@/lib/lean-event/paths";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Pagina non trovata",
  description: "La pagina richiesta non esiste.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Pagina non trovata</h1>
      <p className="mt-4 max-w-md text-white/65">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <Link
        href={leanEventLoginPath()}
        className="mt-8 inline-flex items-center justify-center rounded-md bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
      >
        Vai al login LeanEvent
      </Link>
    </div>
  );
}
