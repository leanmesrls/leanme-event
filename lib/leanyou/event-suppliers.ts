import { randomUUID } from "node:crypto";

import type {
  LeanYouSession,
  LeanYouSupplier,
  LeonardoEventSupplierLink,
  LeonardoSupplierDocument,
  LeonardoSupplierEmailRecord,
} from "@/types/leanyou";

import { getSupplier } from "./suppliers";
import { isValidSupplierCategory } from "./supplier-categories";
import {
  deleteStoredEventSupplierLink,
  getStoredEventSupplierLink,
  listStoredEventSupplierLinks,
  saveStoredEventSupplierLink,
} from "./event-supplier-storage";

export interface EventSupplierWithSupplier extends LeonardoEventSupplierLink {
  supplier: LeanYouSupplier | null;
}

export async function listEventSupplierLinks(
  tenantId: string,
  eventId: string
): Promise<LeonardoEventSupplierLink[]> {
  const links = await listStoredEventSupplierLinks(tenantId);
  return links
    .filter((link) => link.eventId === eventId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  linkId: string
): Promise<LeonardoEventSupplierLink | null> {
  return getStoredEventSupplierLink(tenantId, linkId);
}

export async function saveEventSupplierLink(
  link: LeonardoEventSupplierLink
): Promise<void> {
  await saveStoredEventSupplierLink(normalizeEventSupplierLink(link));
}

export async function deleteEventSupplierLink(
  tenantId: string,
  linkId: string
): Promise<void> {
  await deleteStoredEventSupplierLink(tenantId, linkId);
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
  session: LeanYouSession,
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

  return {
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
