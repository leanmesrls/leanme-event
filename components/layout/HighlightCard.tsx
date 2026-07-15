import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HighlightCardProps {
  id?: string;
  ariaLabelledBy?: string;
  className?: string;
  children: ReactNode;
}

export function HighlightCard({
  id,
  ariaLabelledBy,
  className,
  children,
}: HighlightCardProps) {
  return (
    <article
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "rounded-xl border border-leanme-fuchsia/20 bg-leanme-card p-6 md:p-8 lg:p-10",
        className
      )}
    >
      {children}
    </article>
  );
}

/** Padding compatto per il blocco intro sotto PageHero */
export const PAGE_INTRO_SECTION_CLASS = "py-8 pb-0 md:py-10 md:pb-0";

/** Spazio tra blocco intro e contenuto successivo */
export const PAGE_CONTENT_AFTER_INTRO_CLASS = "pt-10 md:pt-14 lg:pt-16";
