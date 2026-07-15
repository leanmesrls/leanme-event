"use client";

import { useEffect, useMemo, useState } from "react";

import type { LeanEventImportResult } from "@/types/lean-event";

interface CatalogItem {
  catalogId: string;
  nome_sede: string;
  citta: string;
  provincia: string;
  regione: string;
  indirizzo: string;
  link_pagina: string;
  foto_principale: string;
  categoria: string;
  tipo_struttura: string;
}

interface SearchResponse {
  ok?: boolean;
  error?: string;
  total: number;
  items: CatalogItem[];
  regions: string[];
}

interface LeonardoMeetingCongressiVenueImportProps {
  onImported?: () => void;
}

const PAGE_SIZE = 30;

export function LeonardoMeetingCongressiVenueImport({
  onImported,
}: LeonardoMeetingCongressiVenueImportProps) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeanEventImportResult | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = searchResult
    ? Math.max(1, Math.ceil(searchResult.total / PAGE_SIZE))
    : 1;

  const selectedCount = selectedLinks.size;

  const visibleSelectedCount = useMemo(() => {
    if (!searchResult) {
      return 0;
    }
    return searchResult.items.filter((item) =>
      selectedLinks.has(item.link_pagina)
    ).length;
  }, [searchResult, selectedLinks]);

  async function runSearch(nextOffset = offset) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(nextOffset),
    });
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (region.trim()) {
      params.set("region", region.trim());
    }

    try {
      const response = await fetch(
        `/api/lean-event/venues/meetingecongressi?${params.toString()}`,
        { credentials: "same-origin" }
      );
      const payload = (await response.json()) as SearchResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Ricerca non riuscita.");
        return;
      }

      setSearchResult(payload);
      setOffset(nextOffset);
    } catch {
      setError("Ricerca non riuscita.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelection(link: string) {
    setSelectedLinks((current) => {
      const next = new Set(current);
      if (next.has(link)) {
        next.delete(link);
      } else {
        next.add(link);
      }
      return next;
    });
  }

  function togglePageSelection() {
    if (!searchResult) {
      return;
    }

    setSelectedLinks((current) => {
      const next = new Set(current);
      const allSelected = searchResult.items.every((item) =>
        next.has(item.link_pagina)
      );

      for (const item of searchResult.items) {
        if (allSelected) {
          next.delete(item.link_pagina);
        } else {
          next.add(item.link_pagina);
        }
      }

      return next;
    });
  }

  async function handleImportAll() {
    const confirmed = window.confirm(
      "Importare tutte le sedi del catalogo Meeting e Congressi (~3.400) nella rubrica? L'operazione può richiedere alcuni minuti."
    );
    if (!confirmed) {
      return;
    }

    setImportingAll(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/lean-event/venues/meetingecongressi", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importAll: true }),
      });
      const payload = (await response.json()) as LeanEventImportResult & {
        ok?: boolean;
        error?: string;
        totalInCatalog?: number;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Importazione massiva non riuscita.");
        return;
      }

      setResult({
        created: payload.created,
        updated: payload.updated ?? 0,
        skipped: payload.skipped,
        errors: payload.errors,
      });
      setSelectedLinks(new Set());
      onImported?.();
    } catch {
      setError("Importazione massiva non riuscita.");
    } finally {
      setImportingAll(false);
    }
  }

  async function handleImport() {
    if (selectedLinks.size === 0) {
      setError("Seleziona almeno una sede dal catalogo.");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/lean-event/venues/meetingecongressi", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: [...selectedLinks] }),
      });
      const payload = (await response.json()) as LeanEventImportResult & {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Importazione non riuscita.");
        return;
      }

      setResult({
        created: payload.created,
        updated: payload.updated ?? 0,
        skipped: payload.skipped,
        errors: payload.errors,
      });
      setSelectedLinks(new Set());
      onImported?.();
    } catch {
      setError("Importazione non riuscita.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#111111] p-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-leanme-fuchsia">
        Catalogo Meeting e Congressi
      </h3>
      <p className="mt-2 text-sm text-white/60">
        Cerca tra oltre 3.400 sedi congressuali italiane, seleziona quelle da
        importare nella rubrica, oppure importa l&apos;intero catalogo in un
        colpo solo.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={importingAll || importing}
          onClick={() => void handleImportAll()}
          className="rounded-full bg-leanme-fuchsia px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {importingAll ? "Importazione catalogo..." : "Importa tutto il catalogo"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void runSearch(0);
            }
          }}
          placeholder="Cerca per nome, città, indirizzo..."
          className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        />
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Tutte le regioni</option>
          {(searchResult?.regions ?? []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSearch(0)}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia disabled:opacity-60"
        >
          {loading ? "Ricerca..." : "Cerca"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p>
            Import completato: {result.created} creati, {result.skipped} già
            presenti
            {result.errors.length ? `, ${result.errors.length} errori` : ""}.
          </p>
          {result.errors.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-emerald-50/90">
              {result.errors.slice(0, 6).map((entry) => (
                <li key={`${entry.row}-${entry.message}`}>{entry.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {searchResult ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
            <p>
              {searchResult.total} risultati
              {selectedCount > 0 ? ` · ${selectedCount} selezionati` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePageSelection}
                className="rounded-full border border-white/15 px-3 py-1.5 font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia hover:text-white"
              >
                {visibleSelectedCount === searchResult.items.length &&
                searchResult.items.length > 0
                  ? "Deseleziona pagina"
                  : "Seleziona pagina"}
              </button>
              <button
                type="button"
                disabled={importing || selectedCount === 0}
                onClick={() => void handleImport()}
                className="rounded-full bg-leanme-fuchsia px-4 py-1.5 font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
              >
                {importing ? "Importazione..." : "Importa selezionati"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/50 text-xs uppercase tracking-[0.1em] text-white/45">
                <tr>
                  <th className="px-3 py-2.5">Sel.</th>
                  <th className="px-3 py-2.5">Sede</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Città</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Regione</th>
                  <th className="px-3 py-2.5">Scheda</th>
                </tr>
              </thead>
              <tbody>
                {searchResult.items.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-white/50"
                    >
                      Nessun risultato. Prova un altro filtro.
                    </td>
                  </tr>
                ) : (
                  searchResult.items.map((item) => (
                    <tr
                      key={item.catalogId}
                      className="border-t border-white/10 bg-[#111111]"
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedLinks.has(item.link_pagina)}
                          onChange={() => toggleSelection(item.link_pagina)}
                          className="accent-leanme-fuchsia"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          {item.foto_principale ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.foto_principale}
                              alt=""
                              className="mt-0.5 h-10 w-16 shrink-0 rounded object-cover"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <p className="font-medium text-white">
                              {item.nome_sede}
                            </p>
                            <p className="mt-0.5 text-xs text-white/45">
                              {item.tipo_struttura}
                              {item.categoria ? ` · ${item.categoria}` : ""}
                            </p>
                            <p className="mt-0.5 text-xs text-white/45 sm:hidden">
                              {item.citta}
                              {item.regione ? ` · ${item.regione}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 text-white/70 sm:table-cell">
                        {item.citta}
                        {item.provincia ? ` (${item.provincia})` : ""}
                      </td>
                      <td className="hidden px-3 py-2.5 text-white/70 md:table-cell">
                        {item.regione || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <a
                          href={item.link_pagina}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia transition hover:text-white"
                        >
                          Apri
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={loading || offset === 0}
                onClick={() => void runSearch(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                Precedente
              </button>
              <p className="text-xs text-white/50">
                Pagina {page} di {totalPages}
              </p>
              <button
                type="button"
                disabled={loading || page >= totalPages}
                onClick={() => void runSearch(offset + PAGE_SIZE)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/70 transition hover:border-leanme-fuchsia disabled:opacity-40"
              >
                Successiva
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
