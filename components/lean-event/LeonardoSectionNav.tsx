"use client";

import { cn } from "@/lib/utils";

export interface LeonardoSectionNavItem<T extends string = string> {
  id: T;
  label: string;
  disabled?: boolean;
  planned?: boolean;
}

interface LeonardoPrimarySectionNavProps<T extends string> {
  sections: Array<LeonardoSectionNavItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
}

/** Menu di primo livello: bottoni squadrati fucsia dentro il riquadro. */
export function LeonardoPrimarySectionNav<T extends string>({
  sections,
  active,
  onChange,
  className,
  "aria-label": ariaLabel = "Menu sezione",
}: LeonardoPrimarySectionNavProps<T>) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl border border-white/10 bg-zinc-950 p-2 sm:p-3",
        className
      )}
    >
      <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            disabled={section.disabled}
            onClick={() => onChange(section.id)}
            className={cn(
              "shrink-0 rounded-md px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition sm:text-xs",
              section.disabled
                ? "cursor-not-allowed border border-white/10 text-white/25"
                : active === section.id
                  ? "bg-leanme-fuchsia text-white shadow-sm"
                  : "border border-leanme-fuchsia/45 text-leanme-fuchsia hover:border-leanme-fuchsia hover:bg-leanme-fuchsia/10"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

interface LeonardoSecondarySectionNavProps<T extends string> {
  sections: Array<LeonardoSectionNavItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
}

/** Menu di secondo livello: bottoni squadrati bianchi, fuori dal riquadro. */
export function LeonardoSecondarySectionNav<T extends string>({
  sections,
  active,
  onChange,
  className,
  "aria-label": ariaLabel = "Sottomenu sezione",
}: LeonardoSecondarySectionNavProps<T>) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5 px-0.5", className)}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          disabled={section.disabled}
          onClick={() => onChange(section.id)}
          className={cn(
            "shrink-0 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-[11px]",
            active === section.id
              ? "bg-white text-black shadow-sm"
              : section.disabled
                ? "cursor-not-allowed border border-white/10 text-white/25"
                : section.planned
                  ? "border border-dashed border-white/25 text-white/50 hover:border-white/50 hover:text-white/70"
                  : "border border-white/25 text-white/70 hover:border-white hover:bg-white/10 hover:text-white"
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
