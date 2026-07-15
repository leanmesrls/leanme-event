"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LeonardoListSortSelect } from "@/components/leanyou/LeonardoListSortSelect";
import {
  collectFilterLabels,
  getWorkspaceKeywords,
  getWorkspaceSearchLabels,
  workspaceMatchesFilters,
} from "@/lib/leanyou/workspace-search";
import { sortWorkspaces, type ListSortMode } from "@/lib/leanyou/list-sort";
import {
  leanyouLeonardoNewPath,
  leanyouLeonardoWorkspacePath,
} from "@/lib/leanyou/paths";
import { formatEuropeanDate } from "@/lib/leanyou/dates";
import type { LeonardoWorkspace } from "@/types/leanyou";

const statusLabels: Record<LeonardoWorkspace["status"], string> = {
  draft: "Bozza",
  content_ready: "Contenuto pronto",
  processing: "In elaborazione",
  completed: "Completato",
  failed: "Errore",
};

interface LeonardoWorkspaceListProps {
  tenantSlug: string;
  initialWorkspaces: LeonardoWorkspace[];
}

export function LeonardoWorkspaceList({
  tenantSlug,
  initialWorkspaces,
}: LeonardoWorkspaceListProps) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortMode, setSortMode] = useState<ListSortMode>("created_at");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filterLabels = useMemo(
    () => collectFilterLabels(workspaces),
    [workspaces]
  );

  const filteredWorkspaces = useMemo(() => {
    const rows = workspaces.filter((workspace) =>
      workspaceMatchesFilters(workspace, query, tagFilter)
    );
    return sortWorkspaces(rows, sortMode);
  }, [workspaces, query, tagFilter, sortMode]);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/leanyou/workspaces/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    if (response.ok) {
      setWorkspaces((current) => current.filter((item) => item.id !== id));
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-[0.04em]">Verbali AI</h2>
          <p className="mt-1 text-sm text-white/60">
            Cerca per titolo, cliente, tag manuali o keyword generate dai verbali.
          </p>
        </div>
        <Link
          href={leanyouLeonardoNewPath(tenantSlug)}
          className="inline-flex rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
        >
          Nuovo workspace
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-[#111111] p-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block min-w-0 md:col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Cerca
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titolo, cliente, keyword, tag..."
            className="mt-2 w-full min-w-0 rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Tag / keyword
          </span>
          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="mt-2 w-full min-w-0 rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
          >
            <option value="">Tutti</option>
            {filterLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <LeonardoListSortSelect
          value={sortMode}
          onChange={(value) => setSortMode(value as ListSortMode)}
          includeEventDate
          className="mt-2 w-full min-w-0 rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        />
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-sm text-white/60">
          Nessun workspace ancora. Crea il primo verbale da una registrazione o
          da informazioni testuali.
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-sm text-white/60">
          Nessun workspace corrisponde ai filtri selezionati.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWorkspaces.map((workspace) => {
            const labels = getWorkspaceSearchLabels(workspace);
            const autoKeywords = getWorkspaceKeywords(workspace);

            return (
              <article
                key={workspace.id}
                className="rounded-xl border border-white/10 bg-[#111111] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
                      {statusLabels[workspace.status]}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{workspace.title}</h3>
                    <p className="mt-1 text-sm text-white/60">
                      {workspace.client} · {formatEuropeanDate(workspace.meetingDate)}
                    </p>
                    {labels.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {labels.map((label) => (
                          <span
                            key={label}
                            className={`rounded-full border px-3 py-1 text-[11px] ${
                              workspace.tags.includes(label)
                                ? "border-leanme-fuchsia/40 text-leanme-fuchsia"
                                : "border-white/10 text-white/70"
                            }`}
                          >
                            {label}
                            {!workspace.tags.includes(label) ? " · AI" : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {autoKeywords.length > 0 ? (
                      <p className="mt-2 text-xs text-white/45">
                        Keyword: {autoKeywords.slice(0, 6).join(", ")}
                        {autoKeywords.length > 6 ? "..." : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={leanyouLeonardoWorkspacePath(tenantSlug, workspace.id)}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
                    >
                      Apri
                    </Link>
                    {pendingDeleteId === workspace.id ? (
                      <>
                        <span className="text-xs text-white/60">
                          Sei sicuro di voler eliminare?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(workspace.id)}
                          className="rounded-full bg-red-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-red-500"
                        >
                          Conferma
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-white/40"
                        >
                          Annulla
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(workspace.id)}
                        className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:border-red-300"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
