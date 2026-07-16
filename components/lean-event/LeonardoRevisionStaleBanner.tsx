"use client";

interface LeonardoRevisionStaleBannerProps {
  open: boolean;
  updatedBy?: string;
  updatedAt?: string;
  onReload: () => void;
}

export function LeonardoRevisionStaleBanner({
  open,
  updatedBy,
  updatedAt,
  onReload,
}: LeonardoRevisionStaleBannerProps) {
  if (!open) {
    return null;
  }

  const when = updatedAt
    ? new Date(updatedAt).toLocaleString("it-IT")
    : "poco fa";

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-50"
    >
      <p>
        Qualcun altro ha aggiornato questo elemento
        {updatedBy ? ` (${updatedBy})` : ""} — {when}.
      </p>
      <button
        type="button"
        onClick={onReload}
        className="mt-2 rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-amber-400"
      >
        Ricarica dati
      </button>
    </div>
  );
}
