import { formatContactName } from "@/lib/leanyou/contact-display";
import {
  listDeletedContacts,
  restoreContact,
} from "@/lib/leanyou/contacts";
import type { LeanYouManagedEntityType } from "@/lib/leanyou/entity-lifecycle";
import { listDeletedEvents, restoreEvent } from "@/lib/leanyou/events";
import {
  listDeletedSuppliers,
  restoreSupplier,
} from "@/lib/leanyou/suppliers";
import type { LeanYouSession } from "@/types/leanyou";
import type { LeanYouTrashItem } from "@/types/leanyou-trash";

export function isTrashEntityType(
  value: string
): value is LeanYouManagedEntityType {
  return (
    value === "event" ||
    value === "contact" ||
    value === "supplier" ||
    value === "assignment"
  );
}

export async function listTrashItems(
  tenantId: string
): Promise<LeanYouTrashItem[]> {
  const [events, contacts, suppliers] = await Promise.all([
    listDeletedEvents(tenantId),
    listDeletedContacts(tenantId),
    listDeletedSuppliers(tenantId),
  ]);

  const items: LeanYouTrashItem[] = [
    ...events.map((event) => ({
      entityType: "event" as const,
      id: event.id,
      tenantId: event.tenantId,
      title: event.title,
      subtitle: event.cdc ? `CDC ${event.cdc}` : undefined,
      deletedAt: event.deletedAt!,
      deletedBy: event.deletedBy ?? undefined,
      purgeAfter: event.purgeAfter,
      revision: event.revision ?? 1,
    })),
    ...contacts.map((contact) => ({
      entityType: "contact" as const,
      id: contact.id,
      tenantId: contact.tenantId,
      title: formatContactName(contact),
      subtitle: contact.email || contact.organization || undefined,
      deletedAt: contact.deletedAt!,
      deletedBy: contact.deletedBy ?? undefined,
      purgeAfter: contact.purgeAfter,
      revision: contact.revision ?? 1,
    })),
    ...suppliers.map((supplier) => ({
      entityType: "supplier" as const,
      id: supplier.id,
      tenantId: supplier.tenantId,
      title: supplier.name,
      subtitle: supplier.city || supplier.email || undefined,
      deletedAt: supplier.deletedAt!,
      deletedBy: supplier.deletedBy ?? undefined,
      purgeAfter: supplier.purgeAfter,
      revision: supplier.revision ?? 1,
    })),
  ];

  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreTrashItem(
  session: LeanYouSession,
  entityType: LeanYouManagedEntityType,
  entityId: string
): Promise<boolean> {
  const userId = session.userId || session.userEmail;

  switch (entityType) {
    case "event":
      return Boolean(await restoreEvent(session.tenantId, entityId, userId));
    case "contact":
      return Boolean(await restoreContact(session.tenantId, entityId, userId));
    case "supplier":
      return Boolean(await restoreSupplier(session.tenantId, entityId, userId));
    default:
      return false;
  }
}
