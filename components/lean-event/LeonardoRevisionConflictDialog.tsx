"use client";

interface LeonardoRevisionConflictDialogProps {
  open: boolean;
  updatedBy?: string;
  updatedAt?: string;
  onReload: () => void;
  onDismiss: () => void;
}

export function LeonardoRevisionConflictDialog({
  open,
  updatedBy,
  updatedAt,
  onReload,
  onDismiss,
}: LeonardoRevisionConflictDialogProps) {
  if (!open) {
    return null;
  }

  const when = updatedAt
    ? new Date(updatedAt).toLocaleString("it-IT")
    : "poco fa";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="revision-conflict-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#111111] p-6 shadow-2xl">
        <h3
          id="revision-conflict-title"
          className="text-lg font-semibold text-amber-100"
        >
          Modifica in conflitto
        </h3>
        <p className="mt-3 text-sm text-white/70">
          Nel frattempo qualcun altro ha salvato su questo elemento
          {updatedBy ? ` (${updatedBy})` : ""} — ultimo aggiornamento {when}.
        </p>
        <p className="mt-2 text-sm text-white/55">
          Ricarica per allinearti alla versione più recente. Le modifiche non
          salvate andranno reimpostate.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReload}
            className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Ricarica dati
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white/40"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
