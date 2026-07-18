"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  leanEventLeonardoClientiPath,
  leanEventLeonardoContattiPath,
  leanEventLeonardoFornitoriPath,
  leanEventLeonardoSediPath,
} from "@/lib/lean-event/paths";
import { cn } from "@/lib/utils";

interface LeonardoRubricaNavProps {
  tenantSlug: string;
  clientiEnabled?: boolean;
  className?: string;
}

const sections = [
  { id: "contatti", label: "Contatti", path: leanEventLeonardoContattiPath },
  { id: "sedi", label: "Sedi", path: leanEventLeonardoSediPath },
  { id: "fornitori", label: "Fornitori", path: leanEventLeonardoFornitoriPath },
  { id: "clienti", label: "Clienti", path: leanEventLeonardoClientiPath },
] as const;

/** Rubrica L1: Contatti | Sedi | Fornitori | Clienti — stesso stile fasi evento. */
export function LeonardoRubricaNav({
  tenantSlug,
  clientiEnabled = false,
  className,
}: LeonardoRubricaNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sezioni rubrica"
      className={cn(
        "rounded-xl border border-white/10 bg-zinc-950 p-2 sm:p-3",
        className
      )}
    >
      <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const href = section.path(tenantSlug);
          const active = pathname.startsWith(href);
          const disabled = section.id === "clienti" && !clientiEnabled;

          if (disabled) {
            return (
              <span
                key={section.id}
                className="shrink-0 cursor-not-allowed rounded-md border border-white/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/25 sm:text-xs"
                title="In arrivo"
              >
                {section.label}
              </span>
            );
          }

          return (
            <Link
              key={section.id}
              href={href}
              className={cn(
                "shrink-0 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition sm:text-xs",
                active
                  ? "bg-leanme-fuchsia text-white shadow-sm"
                  : "border border-leanme-fuchsia/45 text-leanme-fuchsia hover:border-leanme-fuchsia hover:bg-leanme-fuchsia/10"
              )}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
