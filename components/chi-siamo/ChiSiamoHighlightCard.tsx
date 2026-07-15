import { HighlightCard } from "@/components/layout/HighlightCard";
import type { ReactNode } from "react";

interface ChiSiamoHighlightCardProps {
  id?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
}

/** @deprecated Preferisci HighlightCard o PageHighlightBlock */
export function ChiSiamoHighlightCard({
  id,
  ariaLabelledBy,
  children,
}: ChiSiamoHighlightCardProps) {
  return (
    <HighlightCard id={id} ariaLabelledBy={ariaLabelledBy}>
      {children}
    </HighlightCard>
  );
}
