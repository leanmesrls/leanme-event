"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoBulkImport } from "@/components/lean-event/LeonardoBulkImport";
import { LeonardoListPagination, LEONARDO_DEFAULT_PAGE_SIZE } from "@/components/lean-event/LeonardoListPagination";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE,
} from "@/components/lean-event/LeonardoPageHeader";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { useLeonardoWorkTabsOptional } from "@/components/lean-event/LeonardoWorkTabsContext";
import { LeonardoSupplierListTable } from "@/components/lean-event/LeonardoSupplierListTable";
import { LeonardoSupplierSheetModal } from "@/components/lean-event/LeonardoSupplierSheetModal";
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
  const workTabs = useLeonardoWorkTabsOptional();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [sheetSupplierId, setSheetSupplierId] = useState<string | null>(
    workTabs ? null : initialSupplierId
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
  const [section, setSection] = useState<"list" | "import" | "create">("list");
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
    if (!initialSupplierId) {
      return;
    }
    if (workTabs) {
      const supplier =
        suppliers.find((item) => item.id === initialSupplierId) ??
        initialSuppliers.find((item) => item.id === initialSupplierId);
      workTabs.openTab({
        kind: "supplier",
        entityId: initialSupplierId,
        title: supplier?.name ?? initialSupplierId,
      });
      return;
    }
    setSheetSupplierId(initialSupplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (supplierId && workTabs) {
        const supplier = suppliers.find((item) => item.id === supplierId);
        workTabs.openTab({
          kind: "supplier",
          entityId: supplierId,
          title: supplier?.name ?? supplierId,
        });
      } else {
        setSheetSupplierId(supplierId);
      }
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
    [pathname, router, searchParams, suppliers, workTabs]
  );

  useLeonardoListKeyboard({
    enabled: section === "list" && filtered.length > 0,
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

  async function reloadSuppliers() {
    const response = await fetch("/api/lean-event/suppliers", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as {
      suppliers?: LeanEventSupplier[];
    };
    if (payload.suppliers) {
      setSuppliers(payload.suppliers);
    }
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
    <div className="space-y-4">
      <LeonardoPageHeader
        title="Rubrica fornitori"
        subtitle={`${suppliers.length} fornitori · elenco paginato · scheda in popup · j/k per navigare`}
        action={
          <>
            <button
              type="button"
              onClick={() =>
                setSection((current) =>
                  current === "create" ? "list" : "create"
                )
              }
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              {section === "create" ? "Torna all'elenco" : "Aggiungi nuovo"}
            </button>
            <button
              type="button"
              onClick={() =>
                setSection((current) =>
                  current === "import" ? "list" : "import"
                )
              }
              className={
                section === "import"
                  ? LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE
                  : LEONARDO_PAGE_ACTION_BUTTON_SECONDARY
              }
            >
              {section === "import"
                ? "Torna all'elenco"
                : "Importazione massiva"}
            </button>
          </>
        }
      />

      <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled={clientiEnabled} />

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {section === "list" ? (
        <div className="space-y-4">
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
              className="rounded-md border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Esporta CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              {suppliers.length === 0
                ? "Nessun fornitore. Usa «Aggiungi nuovo» o Importazione massiva."
                : "Nessun fornitore corrisponde ai filtri."}
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
            </>
          )}
        </div>
      ) : section === "import" ? (
        <LeonardoBulkImport kind="suppliers" onImported={reloadSuppliers} />
      ) : (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-white/10 bg-black/40 p-4 md:grid-cols-2"
        >
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
              className="rounded-md bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
            >
              Aggiungi fornitore
            </button>
          </div>
        </form>
      )}

      {sheetSupplier && !workTabs ? (
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
