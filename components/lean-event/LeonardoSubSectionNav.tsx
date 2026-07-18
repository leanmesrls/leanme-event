"use client";

import {
  LeonardoSecondarySectionNav,
  type LeonardoSectionNavItem,
} from "@/components/lean-event/LeonardoSectionNav";
import { cn } from "@/lib/utils";

interface LeonardoSubSectionNavProps<T extends string> {
  sections: Array<LeonardoSectionNavItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

/** Alias L2 (compat ospiti/report): bottoni bianchi squadrati. */
export function LeonardoSubSectionNav<T extends string>({
  sections,
  active,
  onChange,
  className,
}: LeonardoSubSectionNavProps<T>) {
  return (
    <LeonardoSecondarySectionNav
      sections={sections}
      active={active}
      onChange={onChange}
      className={cn(className)}
    />
  );
}
