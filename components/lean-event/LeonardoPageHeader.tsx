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
 * titolo fucsia a sinistra (+ sottotitolo), CTA a destra
 * (es. Nuovo evento + Importazione massiva). Sotto: elenco di default.
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
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** CTA primaria (Nuovo evento, Aggiungi nuovo…). */
export const LEONARDO_PAGE_ACTION_BUTTON =
  "inline-flex rounded-md bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark";

/** CTA secondaria (Importazione massiva…). */
export const LEONARDO_PAGE_ACTION_BUTTON_SECONDARY =
  "inline-flex rounded-md border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/80 transition hover:border-white hover:bg-white/10 hover:text-white";

export const LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE =
  "inline-flex rounded-md bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-black shadow-sm";
