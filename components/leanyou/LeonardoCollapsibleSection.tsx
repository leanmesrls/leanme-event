"use client";

import type { ReactNode } from "react";

import { LEONARDO_COLLAPSIBLE_TITLE } from "@/components/leanyou/leonardo-ui";

interface LeonardoCollapsibleSectionProps {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

export function LeonardoCollapsibleSection({
  title,
  summary,
  open,
  onToggle,
  children,
  actions,
}: LeonardoCollapsibleSectionProps) {
  return (
    <div className="min-w-0 space-y-3 overflow-hidden rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
        >
          <span className="flex items-center justify-between gap-2">
            <span className={`${LEONARDO_COLLAPSIBLE_TITLE} truncate`}>{title}</span>
            <span className="shrink-0 text-xs text-white/40">{open ? "▲" : "▼"}</span>
          </span>
          {!open && summary ? (
            <span className="truncate text-xs text-white/45">{summary}</span>
          ) : null}
        </button>
        {actions && open ? (
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>
      {open ? children : null}
    </div>
  );
}
