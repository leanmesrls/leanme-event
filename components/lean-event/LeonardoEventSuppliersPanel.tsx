"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoEventSupplierLinkModal } from "@/components/lean-event/LeonardoEventSupplierLinkModal";
import { LeonardoEventSupplierListTable } from "@/components/lean-event/LeonardoEventSupplierListTable";
import {
  LeonardoListPagination,
  LEONARDO_DEFAULT_PAGE_SIZE,
} from "@/components/lean-event/LeonardoListPagination";
import { LeonardoSubSectionNav } from "@/components/lean-event/LeonardoSubSectionNav";
import { LEONARDO_PANEL_TITLE } from "@/components/lean-event/leonardo-ui";
import type { EventSupplierWithSupplier } from "@/lib/lean-event/event-suppliers";
import { paginateList, type LeonardoPageSize } from "@/lib/lean-event/list-pagination";
import { downloadEventSuppliersCsv } from "@/lib/lean-event/supplier-export";
import { useLeonardoListKeyboard } from "@/lib/lean-event/use-leonardo-list-keyboard";
import {
  getSupplierCategoryLabel,
  SUPPLIER_CATEGORIES,
} from "@/lib/lean-event/supplier-categories";
import type { LeanEventSupplier, LeonardoSupplierCategoryId } from "@/types/lean-event";

type SupplierView = "insert" | "list";

interface LeonardoEventSuppliersPanelProps {
  tenantSlug: string;
  eventId: string;
  initialLinks: EventSupplierWithSupplier[];
  rubricaSuppliers: LeanEventSupplier[];
  initialLinkId?: string | null;
  supplierView?: SupplierView;
  onSupplierViewChange?: (view: SupplierView) => void;
  onLinkSheetChange?: (linkId: string | null) => void;
}

export function LeonardoEventSuppliersPanel({
  tenantSlug,
  eventId,
  initialLinks,
  rubricaSuppliers,
  initialLinkId = null,
  supplierView = "list",
  onSupplierViewChange,
  onLinkSheetChange,
}: LeonardoEventSuppliersPanelProps) {
  const [links, setLinks] = useState(initialLinks);
  const [sheetLinkId, setSheetLinkId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState<LeonardoSupplierCategoryId>(
    "collaboratori"
  );
  const [roleNotes, setRoleNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeonardoPageSize>(
    LEONARDO_DEFAULT_PAGE_SIZE
  );

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  useEffect(() => {
    if (!initialLinkId) {
      return;
    }
    const exists = links.some((link) => link.id === initialLinkId);
    if (exists) {
      setSheetLinkId(initialLinkId);
    }
  }, [initialLinkId, links]);

  function openLinkSheet(linkId: string | null) {
    setSheetLinkId(linkId);
    onLinkSheetChange?.(linkId);
  }

  const linkedSupplierIds = useMemo(
    () => new Set(links.map((link) => link.supplierId)),
    [links]
  );

  const availableSuppliers = useMemo(
    () =>
      rubricaSuppliers.filter((supplier) => !linkedSupplierIds.has(supplier.id)),
    [rubricaSuppliers, linkedSupplierIds]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return links;
    }
    return links.filter((link) => {
      const name = link.supplier?.name ?? "";
      return (
        name.toLowerCase().includes(normalized) ||
        getSupplierCategoryLabel(link.categoryId)
          .toLowerCase()
          .includes(normalized) ||
        link.roleNotes.toLowerCase().includes(normalized)
      );
    });
  }, [links, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const paginated =
    pageSize === "virtual"
      ? { pageItems: filtered, totalPages: 1, currentPage: 1 }
      : paginateList(filtered, page, pageSize);

  const sheetLink = sheetLinkId
    ? (links.find((item) => item.id === sheetLinkId) ?? null)
    : null;

  const selectLinkSheet = useCallback(
    (linkId: string) => {
      setSheetLinkId(linkId);
      onLinkSheetChange?.(linkId);
    },
    [onLinkSheetChange]
  );

  useLeonardoListKeyboard({
    enabled: supplierView === "list" && filtered.length > 0,
    items: paginated.pageItems,
    activeId: sheetLinkId,
    onSelect: selectLinkSheet,
  });

  function handleExport() {
    if (filtered.length === 0) {
      setError("Nessun fornitore da esportare.");
      return;
    }
    setError(null);
    downloadEventSuppliersCsv(
      filtered,
      query.trim()
        ? "leanyou-fornitori-evento-filtrato.csv"
        : "leanyou-fornitori-evento.csv"
    );
  }

  async function handleAddSupplier(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSupplierId) {
      setError("Seleziona un fornitore dalla rubrica.");
      return;
    }

    setAdding(true);
    setError(null);

    const response = await fetch(`/api/lean-event/events/${eventId}/suppliers`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: selectedSupplierId,
        categoryId,
        roleNotes,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      link?: EventSupplierWithSupplier;
    };

    setAdding(false);

    if (!response.ok || !payload.link) {
      setError(payload.error ?? "Collegamento non riuscito.");
      return;
    }

    const supplier =
      rubricaSuppliers.find((item) => item.id === payload.link!.supplierId) ??
      null;

    const nextLink = { ...payload.link, supplier };
    setLinks((current) => [nextLink, ...current]);
    openLinkSheet(nextLink.id);
    setSelectedSupplierId("");
    setRoleNotes("");
    onSupplierViewChange?.("list");
  }

  async function handleRemoveLink(linkId: string) {
    if (!window.confirm("Rimuovere il fornitore da questo evento?")) {
      return;
    }

    const response = await fetch(
      `/api/lean-event/events/${eventId}/suppliers/${linkId}`,
      { method: "DELETE", credentials: "same-origin" }
    );

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Rimozione non riuscita.");
      return;
    }

    setLinks((current) => current.filter((link) => link.id !== linkId));
    if (sheetLinkId === linkId) {
      openLinkSheet(null);
    }
  }

  function updateLink(linkId: string, next: EventSupplierWithSupplier) {
    setLinks((current) =>
      current.map((link) => (link.id === linkId ? next : link))
    );
  }

  return (
    <section className="min-w-0 space-y-6 overflow-hidden rounded-xl border border-white/10 bg-[#111111] p-6">
      <div>
        <h3 className={LEONARDO_PANEL_TITLE}>Fornitori</h3>
        <p className="mt-2 text-sm text-white/60">
          Collega fornitori dalla rubrica · documenti ed email per commessa.
        </p>
      </div>

      <LeonardoSubSectionNav
        sections={[
          { id: "insert", label: "Inserisci fornitori" },
          { id: "list", label: "Visualizza elenco" },
        ]}
        active={supplierView}
        onChange={(view) => onSupplierViewChange?.(view)}
      />

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {supplierView === "insert" ? (
        <form
          onSubmit={handleAddSupplier}
          className="grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 md:grid-cols-2"
        >
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Fornitore rubrica *</span>
            <select
              value={selectedSupplierId}
              onChange={(event) => {
                const supplierId = event.target.value;
                setSelectedSupplierId(supplierId);
                const supplier = rubricaSuppliers.find(
                  (item) => item.id === supplierId
                );
                if (supplier) {
                  setCategoryId(supplier.categoryId);
                }
              }}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              <option value="">Seleziona fornitore</option>
              {availableSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ·{" "}
                  {getSupplierCategoryLabel(supplier.categoryId)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Categoria evento</span>
            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value as LeonardoSupplierCategoryId)
              }
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            >
              {SUPPLIER_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Note incarico</span>
            <input
              value={roleNotes}
              onChange={(event) => setRoleNotes(event.target.value)}
              placeholder="Servizio, referente evento…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={adding || availableSuppliers.length === 0}
              className="rounded-full bg-leanme-fuchsia px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
            >
              {adding ? "Collegamento…" : "+ Aggiungi fornitore"}
            </button>
            {availableSuppliers.length === 0 ? (
              <p className="mt-2 text-xs text-white/45">
                Nessun fornitore disponibile in rubrica, oppure sono già tutti
                collegati.
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Cerca</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, categoria, note…"
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Esporta CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              Nessun fornitore collegato. Usa Inserisci per aggiungerne uno.
            </p>
          ) : (
            <>
              <LeonardoListPagination
                totalItems={filtered.length}
                page={paginated.currentPage}
                totalPages={paginated.totalPages}
                pageSize={pageSize}
                pageItemsCount={paginated.pageItems.length}
                itemLabel="fornitori"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
              <LeonardoEventSupplierListTable
                links={paginated.pageItems}
                activeLinkId={sheetLinkId}
                onOpenSheet={openLinkSheet}
                onRemove={handleRemoveLink}
                virtualScroll={pageSize === "virtual"}
              />
            </>
          )}
        </div>
      )}

      {sheetLink ? (
        <LeonardoEventSupplierLinkModal
          tenantSlug={tenantSlug}
          eventId={eventId}
          link={sheetLink}
          onLinkChange={(next) => updateLink(sheetLink.id, next)}
          onClose={() => openLinkSheet(null)}
          onRemove={() => handleRemoveLink(sheetLink.id)}
        />
      ) : null}
    </section>
  );
}
