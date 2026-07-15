"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoListPagination, LEONARDO_DEFAULT_PAGE_SIZE } from "@/components/lean-event/LeonardoListPagination";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { LeonardoSupplierListTable } from "@/components/lean-event/LeonardoSupplierListTable";
import { LeonardoSupplierSheetModal } from "@/components/lean-event/LeonardoSupplierSheetModal";
import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import { paginateList, type LeonardoPageSize } from "@/lib/lean-event/list-pagination";
import type { ListSortMode } from "@/lib/lean-event/list-sort";
import { downloadSuppliersCsv } from "@/lib/lean-event/supplier-export";
import { useLeonardoListKeyboard } from "@/lib/lean-event/use-leonardo-list-keyboard";
import {
  SUPPLIER_CATEGORIES,
} from "@/lib/lean-event/supplier-categories";
import { supplierMatchesQuery } from "@/lib/lean-event/supplier-display";
import type { LeanEventSupplier, LeonardoSupplierCategoryId } from "@/types/lean-event";

interface LeonardoSupplierListProps {
  tenantSlug: string;
  initialSuppliers: LeanEventSupplier[];
  clientiEnabled?: boolean;
  initialSupplierId?: string | null;
}

export function LeonardoSupplierList({
  tenantSlug,
  initialSuppliers,
  clientiEnabled = false,
  initialSupplierId = null,
}: LeonardoSupplierListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [sheetSupplierId, setSheetSupplierId] = useState<string | null>(
    initialSupplierId
  );
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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
    categoryId: "collaboratori" as LeonardoSupplierCategoryId,
    email: "",
    phone: "",
    city: "",
    contactPerson: "",
    vatNumber: "",
  });

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  useEffect(() => {
    if (initialSupplierId) {
      setSheetSupplierId(initialSupplierId);
    }
  }, [initialSupplierId]);

  const filtered = useMemo(() => {
    const rows = suppliers.filter(
      (supplier) =>
        supplierMatchesQuery(supplier, query) &&
        (!categoryFilter || supplier.categoryId === categoryFilter)
    );
    return [...rows].sort((a, b) => {
      if (sortMode === "alphabetical") {
        return a.name.localeCompare(b.name, "it");
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [suppliers, query, categoryFilter, sortMode]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, sortMode, pageSize]);

  const paginated =
    pageSize === "virtual"
      ? {
          pageItems: filtered,
          totalPages: 1,
          currentPage: 1,
        }
      : paginateList(filtered, page, pageSize);

  const sheetSupplier = sheetSupplierId
    ? suppliers.find((item) => item.id === sheetSupplierId) ?? null
    : null;

  const syncSupplierSheet = useCallback(
    (supplierId: string | null) => {
      setSheetSupplierId(supplierId);
      const params = new URLSearchParams(searchParams.toString());
      if (supplierId) {
        params.set("fornitore", supplierId);
      } else {
        params.delete("fornitore");
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
    activeId: sheetSupplierId,
    onSelect: syncSupplierSheet,
  });

  function handleExport() {
    if (filtered.length === 0) {
      setError("Nessun fornitore da esportare.");
      return;
    }
    setError(null);
    const hasFilters = query.trim().length > 0 || categoryFilter.length > 0;
    downloadSuppliersCsv(
      filtered,
      hasFilters ? "leanyou-rubrica-fornitori-filtrato.csv" : "leanyou-rubrica-fornitori.csv"
    );
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/lean-event/suppliers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as {
      error?: string;
      supplier?: LeanEventSupplier;
    };

    if (!response.ok || !payload.supplier) {
      setError(payload.error ?? "Creazione fornitore non riuscita.");
      return;
    }

    setSuppliers((current) =>
      [...current, payload.supplier!].sort((a, b) =>
        a.name.localeCompare(b.name, "it")
      )
    );
    setForm({
      name: "",
      categoryId: "collaboratori",
      email: "",
      phone: "",
      city: "",
      contactPerson: "",
      vatNumber: "",
    });
    setSheetSupplierId(payload.supplier.id);
    syncSupplierSheet(payload.supplier.id);
  }

  return (
    <div className="space-y-6">
      <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled={clientiEnabled} />

      <div>
        <h2 className={LEONARDO_PAGE_TITLE}>Rubrica fornitori</h2>
        <p className="mt-2 text-sm text-white/60">
          {suppliers.length} fornitori · elenco paginato · scheda in popup · j/k per navigare
        </p>
      </div>

      <LeonardoCollapsiblePanel
        title="Elenco fornitori"
        summary={`${filtered.length} visibili · ${suppliers.length} totali`}
        defaultOpen
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[200px] flex-1 text-sm">
              <span className="mb-1 block text-white/60">Cerca</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ragione sociale, email, P.IVA, referente…"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-white/60">Categoria</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              >
                <option value="">Tutte</option>
                {SUPPLIER_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
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
              Nessun fornitore corrisponde ai filtri.
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
              <LeonardoSupplierListTable
                suppliers={paginated.pageItems}
                activeSupplierId={sheetSupplierId}
                onOpenSheet={syncSupplierSheet}
                virtualScroll={pageSize === "virtual"}
              />
              {pageSize !== "virtual" && paginated.totalPages > 1 ? (
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
              ) : null}
            </>
          )}
        </div>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Inserimento fornitore"
        summary="Nuova anagrafica in rubrica"
      >
        <section className="pt-2">
          {error ? (
            <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {error}
            </p>
          ) : null}
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-white/60">Ragione sociale *</span>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Categoria *</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    categoryId: event.target.value as LeonardoSupplierCategoryId,
                  })
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
              <span className="mb-1 block text-white/60">P.IVA</span>
              <input
                value={form.vatNumber}
                onChange={(event) => setForm({ ...form, vatNumber: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Referente</span>
              <input
                value={form.contactPerson}
                onChange={(event) =>
                  setForm({ ...form, contactPerson: event.target.value })
                }
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Telefono</span>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Città</span>
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
              >
                Aggiungi fornitore
              </button>
            </div>
          </form>
        </section>
      </LeonardoCollapsiblePanel>

      {sheetSupplier ? (
        <LeonardoSupplierSheetModal
          supplier={sheetSupplier}
          onSupplierChange={(next) => {
            setSuppliers((current) =>
              current.map((item) => (item.id === next.id ? next : item))
            );
          }}
          onClose={() => syncSupplierSheet(null)}
        />
      ) : null}
    </div>
  );
}
