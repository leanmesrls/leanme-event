"use client";

import { useCallback, useEffect, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import {
  LEAN_EVENT_VERSION_KEEP_DAYS,
  LEAN_EVENT_VERSION_KEEP_LAST,
  LEAN_EVENT_VERSION_UI_PAGE_SIZE,
} from "@/lib/lean-event/entity-lifecycle";
import type { LeanEventVersionableType } from "@/lib/lean-event/entity-versions";

interface VersionMeta {
  revision: number;
  changedAt: string;
  changedBy: string;
  changeSummary?: string | null;
  source: "neon" | "blob" | "fs";
}

interface LeonardoEntityVersionsPanelProps {
  entityType: LeanEventVersionableType;
  entityId: string;
  currentRevision?: number;
  onRestored?: (entity: unknown) => void;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function VersionsBody({
  entityType,
  entityId,
  currentRevision,
  onRestored,
}: LeonardoEntityVersionsPanelProps) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringRev, setRestoringRev] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAllVersions, setShowAllVersions] = useState(false);

  const visibleVersions = showAllVersions
    ? versions
    : versions.slice(0, LEAN_EVENT_VERSION_UI_PAGE_SIZE);
  const hiddenCount = Math.max(
    0,
    versions.length - LEAN_EVENT_VERSION_UI_PAGE_SIZE
  );

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/lean-event/entities/${entityType}/${entityId}/versions`,
      { credentials: "same-origin" }
    );
    const payload = (await response.json()) as {
      versions?: VersionMeta[];
      error?: string;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Caricamento cronologia non riuscito.");
      return;
    }
    setVersions(payload.versions ?? []);
  }, [entityId, entityType]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  async function handleRestore(revision: number) {
    const confirmed = window.confirm(
      `Ripristinare la revisione ${revision}? Lo stato attuale viene salvato come nuova revisione.`
    );
    if (!confirmed) {
      return;
    }

    setRestoringRev(revision);
    setError(null);
    setMessage(null);
    const response = await fetch(
      `/api/lean-event/entities/${entityType}/${entityId}/versions/${revision}/restore`,
      { method: "POST", credentials: "same-origin" }
    );
    const payload = (await response.json()) as {
      entity?: unknown;
      error?: string;
    };
    setRestoringRev(null);

    if (!response.ok) {
      setError(payload.error ?? "Ripristino non riuscito.");
      return;
    }

    setMessage(`Ripristinata la revisione ${revision}.`);
    await loadVersions();
    if (payload.entity) {
      onRestored?.(payload.entity);
    }
  }

  if (loading) {
    return <p className="pt-2 text-sm text-white/50">Caricamento…</p>;
  }

  return (
    <div className="space-y-3 pt-2">
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {versions.length === 0 ? (
        <p className="text-sm text-white/50">
          Nessuna revisione precedente. Le versioni compaiono dopo il primo
          salvataggio successivo alla creazione.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleVersions.map((version) => {
              const isCurrent =
                typeof currentRevision === "number" &&
                version.revision === currentRevision;
              return (
                <li
                  key={version.revision}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      Revisione {version.revision}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-normal text-leanme-fuchsia">
                          (corrente)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-white/45">
                      {formatWhen(version.changedAt)}
                      {" · "}
                      {version.changedBy}
                      {version.changeSummary
                        ? ` · ${version.changeSummary}`
                        : ""}
                    </p>
                  </div>
                  {!isCurrent ? (
                    <button
                      type="button"
                      disabled={restoringRev !== null}
                      onClick={() => void handleRestore(version.revision)}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/80 transition hover:border-leanme-fuchsia hover:text-leanme-fuchsia disabled:opacity-50"
                    >
                      {restoringRev === version.revision
                        ? "Ripristino…"
                        : "Ripristina"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && !showAllVersions ? (
            <button
              type="button"
              onClick={() => setShowAllVersions(true)}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
            >
              Mostra altre {hiddenCount} revisioni
            </button>
          ) : null}
          {showAllVersions &&
          versions.length > LEAN_EVENT_VERSION_UI_PAGE_SIZE ? (
            <button
              type="button"
              onClick={() => setShowAllVersions(false)}
              className="text-xs text-white/40 hover:text-leanme-fuchsia"
            >
              Mostra meno
            </button>
          ) : null}
          <p className="text-[11px] text-white/35">
            Retention: ultime {LEAN_EVENT_VERSION_KEEP_LAST} revisioni o{" "}
            {LEAN_EVENT_VERSION_KEEP_DAYS} giorni (la più ampia delle due).
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => void loadVersions()}
        className="text-xs text-white/40 hover:text-leanme-fuchsia"
      >
        Aggiorna
      </button>
    </div>
  );
}

export function LeonardoEntityVersionsPanel(
  props: LeonardoEntityVersionsPanelProps
) {
  const { currentRevision } = props;

  return (
    <LeonardoCollapsiblePanel
      title="Cronologia"
      summary={
        currentRevision ? `rev. corrente ${currentRevision}` : undefined
      }
      defaultOpen={false}
    >
      <VersionsBody {...props} />
    </LeonardoCollapsiblePanel>
  );
}
