"use client";

import { useSearchParams } from "next/navigation";

import { LeonardoSupplierList } from "@/components/leanyou/LeonardoSupplierList";
import type { LeanYouSupplier } from "@/types/leanyou";

interface LeonardoSupplierListPageClientProps {
  tenantSlug: string;
  initialSuppliers: LeanYouSupplier[];
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
