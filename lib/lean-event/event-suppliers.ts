import { randomUUID } from "node:crypto";

import type {
  LeanEventSession,
  LeanEventSupplier,
  LeonardoEventSupplierLink,
  LeonardoSupplierDocument,
  LeonardoSupplierEmailRecord,
} from "@/types/lean-event";

import {
  auditManagedEntityMutation,
  resolveEntityAuditAction,
} from "./audit-log";
import { upsertManagedEntityToNeon } from "./entity-db";
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
import { getSupplier } from "./suppliers";
import { isValidSupplierCategory } from "./supplier-categories";
import {
  deleteStoredEventSupplierLink,
  getStoredEventSupplierLink,
  listStoredEventSupplierLinks,
  saveStoredEventSupplierLink,
} from "./event-supplier-storage";
import { saveEntityVersionSnapshot } from "./version-storage";

export interface EventSupplierWithSupplier extends LeonardoEventSupplierLink {
  supplier: LeanEventSupplier | null;
}

function normalizeStoredLink(
  link: LeonardoEventSupplierLink
): LeonardoEventSupplierLink {
  return normalizeEventSupplierLink(
    withLifecycleDefaults(link) as LeonardoEventSupplierLink
  );
}

export async function listEventSupplierLinks(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventSupplierLink[]> {
  const links = await listStoredEventSupplierLinks(tenantId);
  return links
    .map(normalizeStoredLink)
    .filter(isEntityActive)
    .filter((link) => link.eventId === eventId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listDeletedEventSupplierLinks(
  tenantId: string
): Promise<LeonardoEventSupplierLink[]> {
  const links = await listStoredEventSupplierLinks(tenantId);
  return links
    .map(normalizeStoredLink)
    .filter((link) => !isEntityActive(link))
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function listEventSuppliersWithSupplier(
  tenantId: string,
  eventId: string
): Promise<EventSupplierWithSupplier[]> {
  const links = await listEventSupplierLinks(tenantId, eventId);
  return Promise.all(
    links.map(async (link) => ({
      ...link,
      supplier: await getSupplier(tenantId, link.supplierId),
    }))
  );
}

export async function getEventSupplierLink(
  tenantId: string,
  linkId: string,
  options?: { includeDeleted?: boolean }
): Promise<LeonardoEventSupplierLink | null> {
  const link = await getStoredEventSupplierLink(tenantId, linkId);
  if (!link) {
    return null;
  }
  const normalized = normalizeStoredLink(link);
  if (!options?.includeDeleted && !isEntityActive(normalized)) {
    return null;
  }
  return normalized;
}

async function persistLink(
  link: LeonardoEventSupplierLink,
  previous: LeonardoEventSupplierLink | null
): Promise<void> {
  if (previous) {
    await saveEntityVersionSnapshot(
      link.tenantId,
      "event_supplier_link",
      link.id,
      previous.revision ?? 1,
      previous
    );
  }
  await saveStoredEventSupplierLink(link);
  await upsertManagedEntityToNeon("event_supplier_link", link);
  await auditManagedEntityMutation({
    tenantId: link.tenantId,
    entityType: "event_supplier_link",
    entityId: link.id,
    action: resolveEntityAuditAction(previous, link),
    userId: link.updatedBy,
  });
}

export async function saveEventSupplierLink(
  link: LeonardoEventSupplierLink,
  options?: {
    expectedRevision?: number;
    userId?: string;
    previous?: LeonardoEventSupplierLink | null;
  }
): Promise<LeonardoEventSupplierLink> {
  const normalized = normalizeStoredLink(link);
  const previous =
    options?.previous ??
    (await getStoredEventSupplierLink(normalized.tenantId, normalized.id));

  if (previous) {
    const prevNorm = normalizeStoredLink(previous);
    assertRevisionMatch(prevNorm, options?.expectedRevision);
    const userId = options?.userId ?? normalized.updatedBy ?? "system";
    const next = prepareEntityUpdate(prevNorm, userId);
    const merged = normalizeStoredLink({
      ...normalized,
      revision: next.revision,
      updatedAt: next.updatedAt!,
      updatedBy: next.updatedBy,
    });
    await persistLink(merged, prevNorm);
    return merged;
  }

  const userId = options?.userId ?? normalized.updatedBy ?? "system";
  const created = normalizeStoredLink(prepareEntityCreate(normalized, userId));
  await persistLink(created, null);
  return created;
}

export async function deleteEventSupplierLink(
  tenantId: string,
  linkId: string,
  userId: string
): Promise<void> {
  const link = await getEventSupplierLink(tenantId, linkId, {
    includeDeleted: true,
  });
  if (!link) {
    return;
  }
  const deleted = markEntityDeleted(link, userId);
  await persistLink(deleted, link);
}

export async function restoreEventSupplierLink(
  tenantId: string,
  linkId: string,
  userId: string
): Promise<LeonardoEventSupplierLink | null> {
  const link = await getEventSupplierLink(tenantId, linkId, {
    includeDeleted: true,
  });
  if (!link || isEntityActive(link)) {
    return null;
  }
  const restored = markEntityRestored(link, userId);
  await persistLink(restored, link);
  return restored;
}

export function normalizeEventSupplierLink(
  link: LeonardoEventSupplierLink
): LeonardoEventSupplierLink {
  return {
    ...link,
    documents: link.documents ?? [],
    emails: link.emails ?? [],
  };
}

export async function createEventSupplierLink(
  session: LeanEventSession,
  eventId: string,
  input: {
    supplierId: string;
    categoryId?: string;
    roleNotes?: string;
  }
): Promise<LeonardoEventSupplierLink | null> {
  const supplier = await getSupplier(session.tenantId, input.supplierId);
  if (!supplier) {
    return null;
  }

  const now = new Date().toISOString();
  const categoryId =
    input.categoryId && isValidSupplierCategory(input.categoryId)
      ? input.categoryId
      : supplier.categoryId;

  const draft: LeonardoEventSupplierLink = {
    id: randomUUID(),
    tenantId: session.tenantId,
    eventId,
    supplierId: supplier.id,
    categoryId,
    roleNotes: input.roleNotes?.trim() ?? "",
    documents: [],
    emails: [],
    createdAt: now,
    updatedAt: now,
  };
  return prepareEntityCreate(draft, sessionUserId(session));
}

export function appendEventSupplierDocument(
  link: LeonardoEventSupplierLink,
  document: LeonardoSupplierDocument
): LeonardoEventSupplierLink {
  return {
    ...link,
    documents: [...(link.documents ?? []), document],
    updatedAt: new Date().toISOString(),
  };
}

export function appendEventSupplierEmail(
  link: LeonardoEventSupplierLink,
  email: LeonardoSupplierEmailRecord
): LeonardoEventSupplierLink {
  return {
    ...link,
    emails: [...(link.emails ?? []), email],
    updatedAt: new Date().toISOString(),
  };
}
