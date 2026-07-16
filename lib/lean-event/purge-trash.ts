import {
  listDeletedContacts,
} from "@/lib/lean-event/contacts";
import { deleteStoredContact } from "@/lib/lean-event/contact-storage";
import {
  listDeletedEvents,
} from "@/lib/lean-event/events";
import { deleteStoredEvent } from "@/lib/lean-event/event-storage";
import {
  listDeletedSuppliers,
} from "@/lib/lean-event/suppliers";
import { deleteStoredSupplier } from "@/lib/lean-event/supplier-storage";
import {
  listDeletedAssignments,
} from "@/lib/lean-event/event-assignments";
import { deleteStoredAssignment } from "@/lib/lean-event/event-assignment-storage";
import {
  listDeletedVenues,
} from "@/lib/lean-event/venues";
import { deleteStoredVenue } from "@/lib/lean-event/venue-storage";
import {
  listDeletedWorkspaces,
} from "@/lib/lean-event/workspaces";
import { deleteStoredWorkspace } from "@/lib/lean-event/workspace-storage";
import {
  listDeletedEventSupplierLinks,
} from "@/lib/lean-event/event-suppliers";
import { deleteStoredEventSupplierLink } from "@/lib/lean-event/event-supplier-storage";
import {
  listDocumentsDueForPurge,
  purgeDocument,
} from "@/lib/lean-event/documents";
import {
  deleteManagedEntityFromNeon,
} from "@/lib/lean-event/entity-db";
import { writeLeanEventAuditEvent } from "@/lib/lean-event/audit-log";
import { loadTenantsFile } from "@/lib/lean-event/storage";

export interface PurgeTrashResult {
  tenantId: string;
  purged: {
    events: number;
    contacts: number;
    suppliers: number;
    venues: number;
    assignments: number;
    workspaces: number;
    eventSupplierLinks: number;
    documents: number;
  };
}

function isPurgeDue(purgeAfter: string | null | undefined): boolean {
  if (!purgeAfter) {
    return false;
  }
  const timestamp = Date.parse(purgeAfter);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

async function auditPurge(
  tenantId: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  await writeLeanEventAuditEvent({
    action: "entity_purge",
    tenantId,
    resourceType,
    resourceId,
  });
}

export async function purgeExpiredTrashForTenant(
  tenantId: string
): Promise<PurgeTrashResult> {
  const result: PurgeTrashResult = {
    tenantId,
    purged: {
      events: 0,
      contacts: 0,
      suppliers: 0,
      venues: 0,
      assignments: 0,
      workspaces: 0,
      eventSupplierLinks: 0,
      documents: 0,
    },
  };

  for (const event of await listDeletedEvents(tenantId)) {
    if (isPurgeDue(event.purgeAfter)) {
      await deleteStoredEvent(tenantId, event.id);
      await deleteManagedEntityFromNeon(tenantId, "event", event.id);
      await auditPurge(tenantId, "event", event.id);
      result.purged.events += 1;
    }
  }

  for (const contact of await listDeletedContacts(tenantId)) {
    if (isPurgeDue(contact.purgeAfter)) {
      await deleteStoredContact(tenantId, contact.id);
      await deleteManagedEntityFromNeon(tenantId, "contact", contact.id);
      await auditPurge(tenantId, "contact", contact.id);
      result.purged.contacts += 1;
    }
  }

  for (const supplier of await listDeletedSuppliers(tenantId)) {
    if (isPurgeDue(supplier.purgeAfter)) {
      await deleteStoredSupplier(tenantId, supplier.id);
      await deleteManagedEntityFromNeon(tenantId, "supplier", supplier.id);
      await auditPurge(tenantId, "supplier", supplier.id);
      result.purged.suppliers += 1;
    }
  }

  for (const venue of await listDeletedVenues(tenantId)) {
    if (isPurgeDue(venue.purgeAfter)) {
      await deleteStoredVenue(tenantId, venue.id);
      await deleteManagedEntityFromNeon(tenantId, "venue", venue.id);
      await auditPurge(tenantId, "venue", venue.id);
      result.purged.venues += 1;
    }
  }

  for (const assignment of await listDeletedAssignments(tenantId)) {
    if (isPurgeDue(assignment.purgeAfter)) {
      await deleteStoredAssignment(tenantId, assignment.id);
      await deleteManagedEntityFromNeon(tenantId, "assignment", assignment.id);
      await auditPurge(tenantId, "assignment", assignment.id);
      result.purged.assignments += 1;
    }
  }

  for (const workspace of await listDeletedWorkspaces(tenantId)) {
    if (isPurgeDue(workspace.purgeAfter)) {
      await deleteStoredWorkspace(tenantId, workspace.id);
      await deleteManagedEntityFromNeon(tenantId, "workspace", workspace.id);
      await auditPurge(tenantId, "workspace", workspace.id);
      result.purged.workspaces += 1;
    }
  }

  for (const link of await listDeletedEventSupplierLinks(tenantId)) {
    if (isPurgeDue(link.purgeAfter)) {
      await deleteStoredEventSupplierLink(tenantId, link.id);
      await deleteManagedEntityFromNeon(
        tenantId,
        "event_supplier_link",
        link.id
      );
      await auditPurge(tenantId, "event_supplier_link", link.id);
      result.purged.eventSupplierLinks += 1;
    }
  }

  for (const document of await listDocumentsDueForPurge(tenantId)) {
    const ok = await purgeDocument(tenantId, document.id);
    if (ok) {
      result.purged.documents += 1;
    }
  }

  return result;
}

export async function purgeExpiredTrashForAllTenants(): Promise<PurgeTrashResult[]> {
  const data = await loadTenantsFile();
  const results: PurgeTrashResult[] = [];

  for (const tenant of data.tenants) {
    results.push(await purgeExpiredTrashForTenant(tenant.id));
  }

  return results;
}
