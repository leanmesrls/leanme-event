"use client";

import type { ReactNode } from "react";

import { LEONARDO_COLLAPSIBLE_TITLE } from "@/components/lean-event/leonardo-ui";

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
    <div
      data-leonardo-canvas
      className="leonardo-canvas min-w-0 space-y-3 overflow-hidden rounded-xl border border-zinc-300/70 bg-[#f5f5f7] p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
        >
          <span className="flex items-center justify-between gap-2">
            <span className={`${LEONARDO_COLLAPSIBLE_TITLE} truncate`}>{title}</span>
            <span className="shrink-0 text-xs text-zinc-400">{open ? "▲" : "▼"}</span>
          </span>
          {!open && summary ? (
            <span className="truncate text-xs text-zinc-500">{summary}</span>
          ) : null}
        </button>
        {actions && open ? (
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>
      {open ? <div className="min-w-0">{children}</div> : null}
    </div>
  );
}
