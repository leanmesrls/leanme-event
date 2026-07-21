import { randomUUID } from "node:crypto";

import type {
  LeanEventSession,
  LeanEventSupplier,
  LeonardoSupplierDocument,
} from "@/types/lean-event";

import {
  assertRevisionMatch,
  isEntityActive,
  markEntityDeleted,
  markEntityRestored,
  prepareEntityCreate,
  prepareEntityUpdate,
  sessionUserId,
  withLifecycleDefaults,
} from "./entity-lifecycle";
import { isValidSupplierCategory } from "./supplier-categories";
import { DEFAULT_COUNTRY, normalizeAddressFields } from "./geo-italy";
import {
  getStoredSupplier,
  listStoredSuppliers,
  saveStoredSupplier,
} from "./supplier-storage";
import { saveEntityVersionSnapshot } from "./version-storage";
import { upsertManagedEntityToNeon } from "./entity-db";
import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
} from "./audit-log";

function normalizeStoredSupplier(supplier: LeanEventSupplier): LeanEventSupplier {
  return normalizeSupplier(withLifecycleDefaults(supplier) as LeanEventSupplier);
}

export async function listSuppliers(
  tenantId: string
): Promise<LeanEventSupplier[]> {
  const suppliers = await listStoredSuppliers(tenantId);
  return suppliers
    .map((supplier) => normalizeStoredSupplier(supplier))
    .filter(isEntityActive)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export async function listDeletedSuppliers(
  tenantId: string
): Promise<LeanEventSupplier[]> {
  const suppliers = await listStoredSuppliers(tenantId);
  return suppliers
    .map((supplier) => normalizeStoredSupplier(supplier))
    .filter((supplier) => !isEntityActive(supplier))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function getSupplier(
  tenantId: string,
  supplierId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeanEventSupplier | null> {
  const supplier = await getStoredSupplier(tenantId, supplierId);
  if (!supplier) {
    return null;
  }
  const normalized = normalizeStoredSupplier(supplier);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

async function persistSupplier(
  supplier: LeanEventSupplier,
  previous: LeanEventSupplier | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      supplier.tenantId,
      "supplier",
      supplier.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredSupplier(supplier);
  await upsertManagedEntityToNeon("supplier", supplier);
  await auditManagedEntityMutation({
    tenantId: supplier.tenantId,
    entityType: "supplier",
    entityId: supplier.id,
    action: resolveEntityAuditAction(previous, supplier),
    userId: supplier.updatedBy,
  });
}

export async function saveSupplier(
  supplier: LeanEventSupplier,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeanEventSupplier | null;
  }
): Promise<LeanEventSupplier> {
  const normalized = normalizeStoredSupplier(supplier);
  const previous =
    options?.previous ??
    (await getStoredSupplier(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeStoredSupplier(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeStoredSupplier({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    });
    await persistSupplier(merged, prevNorm);
    return merged;
  }

  await persistSupplier(normalized, null);
  return normalized;
}

export async function deleteSupplier(
  tenantId: string,
  supplierId: string,
  userId: string
): Promise<void> {
  const supplier = await getSupplier(tenantId, supplierId, {
    includeDeleted: true,
  });
  if (!supplier) {
    return;
  }
  const deleted = markEntityDeleted(supplier, userId);
  await persistSupplier(deleted, supplier);
}

export async function restoreSupplier(
  tenantId: string,
  supplierId: string,
  userId: string
): Promise<LeanEventSupplier | null> {
  const supplier = await getSupplier(tenantId, supplierId, {
    includeDeleted: true,
  });
  if (!supplier || isEntityActive(supplier)) {
    return null;
  }
  const restored = markEntityRestored(supplier, userId);
  await persistSupplier(restored, supplier);
  return restored;
}

export function normalizeSupplier(supplier: LeanEventSupplier): LeanEventSupplier {
  const address = normalizeAddressFields({
    address: supplier.address,
    city: supplier.city,
    province: supplier.province,
    region: supplier.region,
    postalCode: supplier.postalCode,
    country: supplier.country || DEFAULT_COUNTRY,
  });
  return {
    ...supplier,
    ...address,
    agreements: supplier.agreements ?? [],
  };
}

export function createSupplier(
  session: LeanEventSession,
  input: {
    name: string;
    categoryId: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    vatNumber?: string;
    contactPerson?: string;
    notes?: string;
  }
): LeanEventSupplier {
  const now = new Date().toISOString();
  const userId = sessionUserId(session);
  const categoryId = isValidSupplierCategory(input.categoryId)
    ? input.categoryId
    : "collaboratori";

  const address = normalizeAddressFields({
    address: input.address,
    city: input.city,
    province: input.province,
    region: input.region,
    postalCode: input.postalCode,
    country: input.country || DEFAULT_COUNTRY,
  });

  const draft: LeanEventSupplier = {
    id: randomUUID(),
    tenantId: session.tenantId,
    name: input.name.trim(),
    categoryId,
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    ...address,
    vatNumber: input.vatNumber?.trim() ?? "",
    contactPerson: input.contactPerson?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
    agreements: [],
    createdAt: now,
    updatedAt: now,
  };

  return prepareEntityCreate(normalizeStoredSupplier(draft), userId);
}

export function appendSupplierAgreement(
  supplier: LeanEventSupplier,
  document: LeonardoSupplierDocument
): LeanEventSupplier {
  return {
    ...supplier,
    agreements: [...(supplier.agreements ?? []), document],
    updatedAt: new Date().toISOString(),
  };
}
