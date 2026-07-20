"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * ID entità visibile in elenchi — per ripescare rapidamente in Neon.
 * Click copia negli appunti.
 */
export function LeonardoEntityId({
  id,
  className,
  label = "ID",
}: {
  id: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        /* ignore */
      }
    },
    [id]
  );

  if (!id) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copia ${label}: ${id}`}
      className={cn(
        "mt-0.5 block max-w-full truncate text-left font-mono text-[10px] leading-tight text-white/35 transition hover:text-white/70",
        className
      )}
    >
      <span className="uppercase tracking-[0.08em] text-white/25">{label}</span>{" "}
      <span>{copied ? "copiato" : id}</span>
    </button>
  );
}
