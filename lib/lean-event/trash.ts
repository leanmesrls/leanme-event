import {
  getEventRoleCategoryLabel,
  listDeletedAssignments,
  restoreEventContactAssignment,
} from "@/lib/lean-event/event-assignments";
import { getContact } from "@/lib/lean-event/contacts";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { getEvent } from "@/lib/lean-event/events";
import {
  listDeletedContacts,
  restoreContact,
} from "@/lib/lean-event/contacts";
import { listDeletedEvents, restoreEvent } from "@/lib/lean-event/events";
import {
  listDeletedSuppliers,
  restoreSupplier,
} from "@/lib/lean-event/suppliers";
import {
  listDeletedVenues,
  restoreVenue,
} from "@/lib/lean-event/venues";
import {
  listDeletedWorkspaces,
  restoreWorkspace,
} from "@/lib/lean-event/workspaces";
import {
  listDeletedEventSupplierLinks,
  restoreEventSupplierLink,
} from "@/lib/lean-event/event-suppliers";
import { getSupplier } from "@/lib/lean-event/suppliers";
import type { LeanEventSession } from "@/types/lean-event";
import type {
  LeanEventTrashEntityType,
  LeanEventTrashItem,
} from "@/types/lean-event-trash";

export function isTrashEntityType(
  value: string
): value is LeanEventTrashEntityType {
  return (
    value === "event" ||
    value === "contact" ||
    value === "supplier" ||
    value === "venue" ||
    value === "assignment" ||
    value === "workspace" ||
    value === "event_supplier_link"
  );
}

export async function listTrashItems(
  tenantId: string
): Promise<LeanEventTrashItem[]> {
  const [
    events,
    contacts,
    suppliers,
    venues,
    assignments,
    workspaces,
    supplierLinks,
  ] = await Promise.all([
    listDeletedEvents(tenantId),
    listDeletedContacts(tenantId),
    listDeletedSuppliers(tenantId),
    listDeletedVenues(tenantId),
    listDeletedAssignments(tenantId),
    listDeletedWorkspaces(tenantId),
    listDeletedEventSupplierLinks(tenantId),
  ]);

  const items: LeanEventTrashItem[] = [
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
    ...venues.map((venue) => ({
      entityType: "venue" as const,
      id: venue.id,
      tenantId: venue.tenantId,
      title: venue.name,
      subtitle: `${venue.city} (${venue.province})`,
      deletedAt: venue.deletedAt!,
      deletedBy: venue.deletedBy ?? undefined,
      purgeAfter: venue.purgeAfter,
      revision: venue.revision ?? 1,
    })),
    ...(await Promise.all(
      assignments.map(async (assignment) => {
        const [event, contact] = await Promise.all([
          getEvent(tenantId, assignment.eventId),
          getContact(tenantId, assignment.contactId),
        ]);
        return {
          entityType: "assignment" as const,
          id: assignment.id,
          tenantId: assignment.tenantId,
          title: contact ? formatContactName(contact) : "Ospite evento",
          subtitle: event
            ? `${event.title} · ${getEventRoleCategoryLabel(assignment.roleCategory)}`
            : getEventRoleCategoryLabel(assignment.roleCategory),
          deletedAt: assignment.deletedAt!,
          deletedBy: assignment.deletedBy ?? undefined,
          purgeAfter: assignment.purgeAfter,
          revision: assignment.revision ?? 1,
        };
      })
    )),
    ...workspaces.map((workspace) => ({
      entityType: "workspace" as const,
      id: workspace.id,
      tenantId: workspace.tenantId,
      title: workspace.title,
      subtitle: workspace.client || undefined,
      deletedAt: workspace.deletedAt!,
      deletedBy: workspace.deletedBy ?? undefined,
      purgeAfter: workspace.purgeAfter,
      revision: workspace.revision ?? 1,
    })),
    ...(await Promise.all(
      supplierLinks.map(async (link) => {
        const [event, supplier] = await Promise.all([
          getEvent(tenantId, link.eventId),
          getSupplier(tenantId, link.supplierId),
        ]);
        return {
          entityType: "event_supplier_link" as const,
          id: link.id,
          tenantId: link.tenantId,
          title: supplier?.name ?? "Fornitore evento",
          subtitle: event?.title,
          deletedAt: link.deletedAt!,
          deletedBy: link.deletedBy ?? undefined,
          purgeAfter: link.purgeAfter,
          revision: link.revision ?? 1,
        };
      })
    )),
  ];

  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreTrashItem(
  session: LeanEventSession,
  entityType: LeanEventTrashEntityType,
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
    case "venue":
      return Boolean(await restoreVenue(session.tenantId, entityId, userId));
    case "assignment":
      return Boolean(
        await restoreEventContactAssignment(session.tenantId, entityId, userId)
      );
    case "workspace":
      return Boolean(
        await restoreWorkspace(session.tenantId, entityId, userId)
      );
    case "event_supplier_link":
      return Boolean(
        await restoreEventSupplierLink(session.tenantId, entityId, userId)
      );
    default:
      return false;
  }
}
