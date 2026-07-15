"use client";

import { useState, type ReactNode } from "react";

import { LeonardoCollapsibleSection } from "@/components/lean-event/LeonardoCollapsibleSection";

interface LeonardoCollapsiblePanelProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Sezione collassabile con stato interno — standard liste Leonardo. */
export function LeonardoCollapsiblePanel({
  title,
  summary,
  defaultOpen = false,
  actions,
  children,
  className,
}: LeonardoCollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <LeonardoCollapsibleSection
        title={title}
        summary={summary}
        open={open}
        onToggle={() => setOpen((current) => !current)}
        actions={actions}
      >
        {children}
      </LeonardoCollapsibleSection>
    </div>
  );
}
