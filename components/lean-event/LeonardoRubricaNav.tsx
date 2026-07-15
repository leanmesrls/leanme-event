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
        "flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/30 p-1",
        className
      )}
    >
      {sections.map((section) => {
        const href = section.path(tenantSlug);
        const active = pathname.startsWith(href);
        const disabled = section.id === "clienti" && !clientiEnabled;

        if (disabled) {
          return (
            <span
              key={section.id}
              className="rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30 sm:text-[11px]"
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
              "rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-[11px]",
              active
                ? "bg-leanme-fuchsia/15 text-white"
                : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
