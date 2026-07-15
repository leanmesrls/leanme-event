"use client";

import { useEffect, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/leanyou/LeonardoCollapsiblePanel";
import { LeonardoSupplierDocumentsSection } from "@/components/leanyou/LeonardoSupplierDocumentsSection";
import { getSupplierCategoryLabel, SUPPLIER_CATEGORIES } from "@/lib/leanyou/supplier-categories";
import type { LeanYouSupplier, LeonardoSupplierCategoryId } from "@/types/leanyou";

interface LeonardoSupplierSheetContentProps {
  supplier: LeanYouSupplier;
  onSupplierChange: (supplier: LeanYouSupplier) => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function LeonardoSupplierSheetContent({
  supplier,
  onSupplierChange,
  onDelete,
  deleting = false,
}: LeonardoSupplierSheetContentProps) {
  const [form, setForm] = useState({
    name: supplier.name,
    categoryId: supplier.categoryId,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    city: supplier.city,
    province: supplier.province,
    vatNumber: supplier.vatNumber,
    contactPerson: supplier.contactPerson,
    notes: supplier.notes,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: supplier.name,
      categoryId: supplier.categoryId,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      province: supplier.province,
      vatNumber: supplier.vatNumber,
      contactPerson: supplier.contactPerson,
      notes: supplier.notes,
    });
  }, [supplier]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/leanyou/suppliers/${supplier.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        expectedRevision: supplier.revision ?? 1,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      supplier?: LeanYouSupplier;
    };

    setSaving(false);

    if (!response.ok || !payload.supplier) {
      setError(payload.error ?? "Salvataggio non riuscito.");
      return;
    }

    onSupplierChange(payload.supplier);
    setMessage("Fornitore aggiornato.");
  }

  const agreementCount = supplier.agreements?.length ?? 0;

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <LeonardoCollapsiblePanel
        title="Anagrafica"
        summary={`${getSupplierCategoryLabel(supplier.categoryId)} · ${supplier.city || supplier.email || "—"}`}
        defaultOpen
      >
        <form
          id={`supplier-form-${supplier.id}`}
          onSubmit={handleSave}
          className="grid gap-3 pt-2 md:grid-cols-2"
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
            <span className="mb-1 block text-white/60">Categoria</span>
            <select
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
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Indirizzo</span>
            <input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
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
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Provincia</span>
            <input
              value={form.province}
              onChange={(event) => setForm({ ...form, province: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-white/60">Note</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
          </label>
        </form>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Accordi generali"
        summary={`${agreementCount} documenti archiviati`}
        defaultOpen={agreementCount > 0}
      >
        <div className="pt-2">
          <LeonardoSupplierDocumentsSection
            title="Accordi generali"
            description="Contratti quadro, listini e accordi validi oltre il singolo evento."
            documents={supplier.agreements ?? []}
            uploadUrl={`/api/leanyou/suppliers/${supplier.id}/documents`}
            allowedKinds={["accordo_generale", "preventivo", "altro"]}
            defaultKind="accordo_generale"
            embedded
            hideTitle
            onUpdated={(agreements) =>
              onSupplierChange({ ...supplier, agreements })
            }
          />
        </div>
      </LeonardoCollapsiblePanel>

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button
          type="submit"
          form={`supplier-form-${supplier.id}`}
          disabled={saving}
          className="rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Salva fornitore"}
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || saving}
            className="rounded-full border border-red-500/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
