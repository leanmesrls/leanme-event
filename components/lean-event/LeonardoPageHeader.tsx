"use client";

import type { ReactNode } from "react";

import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import { cn } from "@/lib/utils";

interface LeonardoPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Intestazione standard Leonardo:
 * titolo fucsia a sinistra (+ sottotitolo), CTA a destra (es. Nuovo evento).
 * Sotto: menu L1/L2 della sezione, poi area dati.
 */
export function LeonardoPageHeader({
  title,
  subtitle,
  action,
  className,
}: LeonardoPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className={LEONARDO_PAGE_TITLE}>{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** CTA primaria affiancata al titolo (Nuovo evento, Aggiungi nuovo…). */
export const LEONARDO_PAGE_ACTION_BUTTON =
  "inline-flex rounded-md bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark";
