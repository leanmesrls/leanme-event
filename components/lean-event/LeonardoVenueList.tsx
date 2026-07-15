"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoBulkImport } from "@/components/lean-event/LeonardoBulkImport";
import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoListPagination, LEONARDO_DEFAULT_PAGE_SIZE } from "@/components/lean-event/LeonardoListPagination";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import { LeonardoMeetingCongressiVenueImport } from "@/components/lean-event/LeonardoMeetingCongressiVenueImport";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { LeonardoVenueListTable } from "@/components/lean-event/LeonardoVenueListTable";
import { LeonardoVenueSheetModal } from "@/components/lean-event/LeonardoVenueSheetModal";
import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import { paginateList, type LeonardoPageSize } from "@/lib/lean-event/list-pagination";
import { sortVenues, type ListSortMode } from "@/lib/lean-event/list-sort";
import { useLeonardoListKeyboard } from "@/lib/lean-event/use-leonardo-list-keyboard";
import { venueMatchesQuery } from "@/lib/lean-event/venue-display";
import { downloadVenuesCsv } from "@/lib/lean-event/venue-export";
import type { LeonardoVenue } from "@/types/lean-event";

interface LeonardoVenueListProps {
  tenantSlug: string;
  initialVenues: LeonardoVenue[];
  clientiEnabled?: boolean;
  initialVenueId?: string | null;
}

export function LeonardoVenueList({
  tenantSlug,
  initialVenues,
  clientiEnabled = false,
  initialVenueId = null,
}: LeonardoVenueListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [venues, setVenues] = useState(initialVenues);
  const [sheetVenueId, setSheetVenueId] = useState<string | null>(initialVenueId);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<Exclude<ListSortMode, "date_start">>(
    "alphabetical"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeonardoPageSize>(
    LEONARDO_DEFAULT_PAGE_SIZE
  );
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    setVenues(initialVenues);
  }, [initialVenues]);

  useEffect(() => {
    if (initialVenueId) {
      setSheetVenueId(initialVenueId);
    }
  }, [initialVenueId]);

  const filtered = useMemo(() => {
    const rows = venues.filter((venue) => venueMatchesQuery(venue, query));
    return sortVenues(rows, sortMode);
  }, [venues, query, sortMode]);

  useEffect(() => {
    setPage(1);
  }, [query, sortMode, pageSize]);

  const paginated =
    pageSize === "virtual"
      ? { pageItems: filtered, totalPages: 1, currentPage: 1 }
      : paginateList(filtered, page, pageSize);

  const sheetVenue = sheetVenueId
    ? venues.find((item) => item.id === sheetVenueId) ?? null
    : null;

  const syncVenueSheet = useCallback(
    (venueId: string | null) => {
      setSheetVenueId(venueId);
      const params = new URLSearchParams(searchParams.toString());
      if (venueId) {
        params.set("sede", venueId);
      } else {
        params.delete("sede");
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  useLeonardoListKeyboard({
    enabled: filtered.length > 0,
    items: paginated.pageItems,
    activeId: sheetVenueId,
    onSelect: syncVenueSheet,
  });

  async function reloadVenues() {
    const response = await fetch("/api/lean-event/venues", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { venues?: LeonardoVenue[] };
    if (payload.venues) {
      setVenues(payload.venues);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/lean-event/venues", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      venue?: LeonardoVenue;
    };

    if (!response.ok || !payload.venue) {
      setError(payload.error ?? "Creazione sede non riuscita.");
      return;
    }

    setVenues((current) =>
      [...current, payload.venue!].sort((a, b) =>
        `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`, "it")
      )
    );
    setForm({
      name: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      phone: "",
      email: "",
    });
    syncVenueSheet(payload.venue.id);
  }

  function handleExport() {
    if (filtered.length === 0) {
      setError("Nessuna sede da esportare.");
      return;
    }
    setError(null);
    downloadVenuesCsv(
      filtered,
      query.trim() ? "lean-event-rubrica-sedi-filtrato.csv" : "lean-event-rubrica-sedi.csv"
    );
  }

  return (
    <div className="space-y-6">
      <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled={clientiEnabled} />

      <div>
        <h2 className={LEONARDO_PAGE_TITLE}>Rubrica sedi</h2>
        <p className="mt-2 text-sm text-white/60">
          {venues.length} sedi · elenco paginato · scheda in popup · j/k per navigare
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <LeonardoCollapsiblePanel
        title="Elenco sedi"
        summary={`${filtered.length} visibili · ${venues.length} totali`}
        defaultOpen
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[200px] flex-1 text-sm">
              <span className="mb-1 block text-white/60">Cerca</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, città, indirizzo, provincia…"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <LeonardoListSortSelect
              value={sortMode}
              onChange={(value) =>
                setSortMode(value as Exclude<ListSortMode, "date_start">)
              }
            />
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Esporta CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              {venues.length === 0
                ? "Nessuna sede. Apri «Inserimento e import»."
                : "Nessun risultato per la ricerca."}
            </p>
          ) : (
            <>
              <LeonardoListPagination
                totalItems={filtered.length}
                page={paginated.currentPage}
                totalPages={paginated.totalPages}
                pageSize={pageSize}
                pageItemsCount={paginated.pageItems.length}
                itemLabel="sedi"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
              <LeonardoVenueListTable
                venues={paginated.pageItems}
                activeVenueId={sheetVenueId}
                onOpenSheet={syncVenueSheet}
                virtualScroll={pageSize === "virtual"}
              />
            </>
          )}
        </div>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Inserimento e import"
        summary="Nuova sede, bulk import, Meeting e Congressi"
      >
        <div className="space-y-4 pt-2">
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <input
              required
              placeholder="Nome sede *"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia md:col-span-2"
            />
            <input
              required
              placeholder="Indirizzo *"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia md:col-span-2"
            />
            <input
              required
              placeholder="Città *"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              required
              placeholder="Provincia *"
              value={form.province}
              onChange={(event) => setForm({ ...form, province: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm uppercase outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="CAP"
              value={form.postalCode}
              onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Telefono"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia md:col-span-2"
            />
            <button
              type="submit"
              className="rounded-full bg-leanme-fuchsia px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark md:col-span-2 md:justify-self-start"
            >
              Salva sede
            </button>
          </form>
          <LeonardoBulkImport kind="venues" onImported={reloadVenues} />
          <LeonardoMeetingCongressiVenueImport onImported={reloadVenues} />
        </div>
      </LeonardoCollapsiblePanel>

      {sheetVenue ? (
        <LeonardoVenueSheetModal
          venue={sheetVenue}
          onVenueChange={(next) => {
            setVenues((current) =>
              current.map((item) => (item.id === next.id ? next : item))
            );
          }}
          onClose={() => syncVenueSheet(null)}
        />
      ) : null}
    </div>
  );
}
