"use client";

import { useSearchParams } from "next/navigation";

import { LeonardoSupplierList } from "@/components/lean-event/LeonardoSupplierList";
import type { LeanEventSupplier } from "@/types/lean-event";

interface LeonardoSupplierListPageClientProps {
  tenantSlug: string;
  initialSuppliers: LeanEventSupplier[];
  clientiEnabled: boolean;
}

export function LeonardoSupplierListPageClient({
  tenantSlug,
  initialSuppliers,
  clientiEnabled,
}: LeonardoSupplierListPageClientProps) {
  const searchParams = useSearchParams();
  const initialSupplierId = searchParams.get("fornitore");

  return (
    <LeonardoSupplierList
      tenantSlug={tenantSlug}
      initialSuppliers={initialSuppliers}
      clientiEnabled={clientiEnabled}
      initialSupplierId={initialSupplierId}
    />
  );
}
