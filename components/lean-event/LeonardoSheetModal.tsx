"use client";

import { useEffect, type ReactNode } from "react";

interface LeonardoSheetModalProps {
  title: string;
  subtitle?: string;
  titleId?: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export function LeonardoSheetModal({
  title,
  subtitle,
  titleId = "leonardo-sheet-title",
  busy = false,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-4xl",
}: LeonardoSheetModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        className={`flex max-h-[94vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#111111] shadow-2xl sm:rounded-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-lg font-semibold text-leanme-fuchsia">
              {title}
            </p>
            {subtitle ? (
              <p className="text-xs text-white/50">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            Chiudi
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
