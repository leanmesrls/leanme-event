"use client";

import { cn } from "@/lib/utils";

interface LeonardoSubSectionNavProps<T extends string> {
  sections: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function LeonardoSubSectionNav<T extends string>({
  sections,
  active,
  onChange,
  className,
}: LeonardoSubSectionNavProps<T>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-black/30 px-1 pt-1",
        className
      )}
    >
      <div className="-mx-1 flex gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:px-4 sm:text-[11px]",
              active === section.id
                ? "border-leanme-fuchsia text-white"
                : "border-transparent text-white/45 hover:text-white/70"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
