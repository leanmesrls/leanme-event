"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { LeonardoSupplierSheetContent } from "@/components/lean-event/LeonardoSupplierSheetContent";
import { getSupplierCategoryLabel } from "@/lib/lean-event/supplier-categories";
import { leanEventLeonardoFornitoriPath } from "@/lib/lean-event/paths";
import type { LeanEventSupplier } from "@/types/lean-event";

interface LeonardoSupplierDetailProps {
  tenantSlug: string;
  initialSupplier: LeanEventSupplier;
  clientiEnabled?: boolean;
}

export function LeonardoSupplierDetail({
  tenantSlug,
  initialSupplier,
  clientiEnabled = false,
}: LeonardoSupplierDetailProps) {
  const router = useRouter();
  const [supplier, setSupplier] = useState(initialSupplier);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Eliminare ${supplier.name} dalla rubrica? I collegamenti negli eventi restano storici.`
      )
    ) {
      return;
    }

    setDeleting(true);

    const response = await fetch(`/api/lean-event/suppliers/${supplier.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    setDeleting(false);

    if (!response.ok) {
      return;
    }

    router.push(leanEventLeonardoFornitoriPath(tenantSlug));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled={clientiEnabled} />

      <div>
        <Link
          href={leanEventLeonardoFornitoriPath(tenantSlug)}
          className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia"
        >
          ← Torna alla rubrica fornitori
        </Link>
        <h2 className="mt-3 text-2xl font-bold text-leanme-fuchsia">{supplier.name}</h2>
        <p className="mt-1 text-sm text-white/60">
          {getSupplierCategoryLabel(supplier.categoryId)} · aggiornato{" "}
          {new Date(supplier.updatedAt).toLocaleDateString("it-IT")}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111111] p-4 sm:p-6">
        <LeonardoSupplierSheetContent
          supplier={supplier}
          onSupplierChange={setSupplier}
          onDelete={handleDelete}
          deleting={deleting}
        />
      </div>
    </div>
  );
}
