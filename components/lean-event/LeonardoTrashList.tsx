"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import { LEONYOU_TRASH_RETENTION_DAYS } from "@/lib/lean-event/entity-lifecycle";
import {
  leanEventLeonardoEventiPath,
  leanEventLeonardoPath,
} from "@/lib/lean-event/paths";
import type { LeanEventTrashItem } from "@/types/lean-event-trash";

interface LeonardoTrashListProps {
  tenantSlug: string;
}

const TYPE_LABELS: Record<LeanEventTrashItem["entityType"], string> = {
  event: "Evento",
  contact: "Contatto",
  supplier: "Fornitore",
  venue: "Sede",
  assignment: "Ospite evento",
  workspace: "Verbale",
  event_supplier_link: "Fornitore evento",
};

export function LeonardoTrashList({ tenantSlug }: LeonardoTrashListProps) {
  const router = useRouter();
  const [items, setItems] = useState<LeanEventTrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/lean-event/trash", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as {
      items?: LeanEventTrashItem[];
      error?: string;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Caricamento cestino non riuscito.");
      return;
    }
    setItems(payload.items ?? []);
  }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  async function handleRestore(item: LeanEventTrashItem) {
    setRestoringId(item.id);
    setError(null);
    const response = await fetch(
      `/api/lean-event/trash/${item.entityType}/${item.id}/restore`,
      { method: "POST", credentials: "same-origin" }
    );
    setRestoringId(null);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Ripristino non riuscito.");
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={leanEventLeonardoPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
        >
          ← Leonardo
        </Link>
        <h2 className={`${LEONARDO_PAGE_TITLE} mt-3`}>Cestino</h2>
        <p className="mt-2 text-sm text-white/60">
          Elementi eliminati recuperabili per {LEONYOU_TRASH_RETENTION_DAYS} giorni
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/50">Caricamento…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-white/50">
          Il cestino è vuoto.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.entityType}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111111] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{item.title}</p>
                <p className="text-xs text-white/45">
                  {TYPE_LABELS[item.entityType]}
                  {item.subtitle ? ` · ${item.subtitle}` : ""}
                  {" · eliminato "}
                  {new Date(item.deletedAt).toLocaleDateString("it-IT")}
                  {item.purgeAfter
                    ? ` · purge ${new Date(item.purgeAfter).toLocaleDateString("it-IT")}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={restoringId === item.id}
                onClick={() => handleRestore(item)}
                className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-50"
              >
                {restoringId === item.id ? "Ripristino…" : "Ripristina"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-white/40">
        Dopo {LEONYOU_TRASH_RETENTION_DAYS} giorni gli elementi vengono eliminati
        definitivamente (job automatico — fase B).
      </p>
      <Link
        href={leanEventLeonardoEventiPath(tenantSlug)}
        className="inline-block text-xs text-leanme-fuchsia hover:underline"
      >
        Torna agli eventi
      </Link>
    </div>
  );
}
