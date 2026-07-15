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
import { loadTenantsFile } from "@/lib/lean-event/storage";
import {
  listDeletedVenues,
} from "@/lib/lean-event/venues";
import { deleteStoredVenue } from "@/lib/lean-event/venue-storage";

export interface PurgeTrashResult {
  tenantId: string;
  purged: {
    events: number;
    contacts: number;
    suppliers: number;
    venues: number;
  };
}

function isPurgeDue(purgeAfter: string | null | undefined): boolean {
  if (!purgeAfter) {
    return false;
  }
  const timestamp = Date.parse(purgeAfter);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export async function purgeExpiredTrashForTenant(
  tenantId: string
): Promise<PurgeTrashResult> {
  const result: PurgeTrashResult = {
    tenantId,
    purged: { events: 0, contacts: 0, suppliers: 0, venues: 0 },
  };

  for (const event of await listDeletedEvents(tenantId)) {
    if (isPurgeDue(event.purgeAfter)) {
      await deleteStoredEvent(tenantId, event.id);
      result.purged.events += 1;
    }
  }

  for (const contact of await listDeletedContacts(tenantId)) {
    if (isPurgeDue(contact.purgeAfter)) {
      await deleteStoredContact(tenantId, contact.id);
      result.purged.contacts += 1;
    }
  }

  for (const supplier of await listDeletedSuppliers(tenantId)) {
    if (isPurgeDue(supplier.purgeAfter)) {
      await deleteStoredSupplier(tenantId, supplier.id);
      result.purged.suppliers += 1;
    }
  }

  for (const venue of await listDeletedVenues(tenantId)) {
    if (isPurgeDue(venue.purgeAfter)) {
      await deleteStoredVenue(tenantId, venue.id);
      result.purged.venues += 1;
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
