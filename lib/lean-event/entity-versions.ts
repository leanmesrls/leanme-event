import { getContact, saveContact } from "@/lib/lean-event/contacts";
import type { LeanEventManagedEntityType } from "@/lib/lean-event/entity-lifecycle";
import { sessionUserId } from "@/lib/lean-event/entity-lifecycle";
import { getEvent, saveEvent } from "@/lib/lean-event/events";
import { getSupplier, saveSupplier } from "@/lib/lean-event/suppliers";
import { getVenue, saveVenue } from "@/lib/lean-event/venues";
import {
  getEntityVersionSnapshot,
  listEntityVersionMetas,
  type LeanEventEntityVersionMeta,
} from "@/lib/lean-event/version-storage";
import { writeLeanEventAuditEvent } from "@/lib/lean-event/audit-log";
import { getWorkspace, saveWorkspace } from "@/lib/lean-event/workspaces";
import type {
  LeanEventContact,
  LeanEventSession,
  LeanEventSupplier,
  LeonardoEvent,
  LeonardoVenue,
  LeonardoWorkspace,
} from "@/types/lean-event";

export type LeanEventVersionableType = Exclude<
  LeanEventManagedEntityType,
  "assignment"
>;

export function isVersionableEntityType(
  value: string
): value is LeanEventVersionableType {
  return (
    value === "event" ||
    value === "contact" ||
    value === "supplier" ||
    value === "venue" ||
    value === "workspace"
  );
}

export async function listEntityVersions(
  tenantId: string,
  entityType: LeanEventVersionableType,
  entityId: string
): Promise<LeanEventEntityVersionMeta[]> {
  return listEntityVersionMetas(tenantId, entityType, entityId);
}

export async function getEntityVersion(
  tenantId: string,
  entityType: LeanEventVersionableType,
  entityId: string,
  revision: number
): Promise<unknown | null> {
  return getEntityVersionSnapshot(tenantId, entityType, entityId, revision);
}

function assertSameIdentity(
  snapshot: { id?: string; tenantId?: string },
  current: { id: string; tenantId: string }
): void {
  if (snapshot.id && snapshot.id !== current.id) {
    throw new Error("VERSION_IDENTITY_MISMATCH");
  }
  if (snapshot.tenantId && snapshot.tenantId !== current.tenantId) {
    throw new Error("VERSION_TENANT_MISMATCH");
  }
}

/** Ripristina uno snapshot come nuova revisione corrente. */
export async function restoreEntityVersion(
  session: LeanEventSession,
  entityType: LeanEventVersionableType,
  entityId: string,
  revision: number
): Promise<{ entity: unknown; restoredFromRevision: number }> {
  const userId = sessionUserId(session);
  const tenantId = session.tenantId;
  const snapshot = await getEntityVersionSnapshot(
    tenantId,
    entityType,
    entityId,
    revision
  );
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("VERSION_NOT_FOUND");
  }

  if (entityType === "contact") {
    const current = await getContact(tenantId, entityId, {
      includeDeleted: true,
    });
    if (!current) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    const snap = snapshot as LeanEventContact;
    assertSameIdentity(snap, current);
    const restored = await saveContact(
      {
        ...snap,
        id: current.id,
        tenantId: current.tenantId,
        deletedAt: null,
        deletedBy: null,
        purgeAfter: null,
      },
      {
        expectedRevision: current.revision ?? 1,
        userId,
        previous: current,
      }
    );
    await writeLeanEventAuditEvent({
      action: "version_restore",
      tenantId,
      userId,
      resourceType: "contact",
      resourceId: entityId,
      detail: `fromRevision=${revision}`,
    });
    return { entity: restored, restoredFromRevision: revision };
  }

  if (entityType === "event") {
    const current = await getEvent(tenantId, entityId, {
      includeDeleted: true,
    });
    if (!current) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    const snap = snapshot as LeonardoEvent;
    assertSameIdentity(snap, current);
    const restored = await saveEvent(
      {
        ...snap,
        id: current.id,
        tenantId: current.tenantId,
        deletedAt: null,
        deletedBy: null,
        purgeAfter: null,
      },
      {
        expectedRevision: current.revision ?? 1,
        userId,
        previous: current,
      }
    );
    await writeLeanEventAuditEvent({
      action: "version_restore",
      tenantId,
      userId,
      resourceType: "event",
      resourceId: entityId,
      detail: `fromRevision=${revision}`,
    });
    return { entity: restored, restoredFromRevision: revision };
  }

  if (entityType === "venue") {
    const current = await getVenue(tenantId, entityId, {
      includeDeleted: true,
    });
    if (!current) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    const snap = snapshot as LeonardoVenue;
    assertSameIdentity(snap, current);
    const restored = await saveVenue(
      {
        ...snap,
        id: current.id,
        tenantId: current.tenantId,
        deletedAt: null,
        deletedBy: null,
        purgeAfter: null,
      },
      {
        expectedRevision: current.revision ?? 1,
        userId,
        previous: current,
      }
    );
    await writeLeanEventAuditEvent({
      action: "version_restore",
      tenantId,
      userId,
      resourceType: "venue",
      resourceId: entityId,
      detail: `fromRevision=${revision}`,
    });
    return { entity: restored, restoredFromRevision: revision };
  }

  if (entityType === "supplier") {
    const current = await getSupplier(tenantId, entityId, {
      includeDeleted: true,
    });
    if (!current) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    const snap = snapshot as LeanEventSupplier;
    assertSameIdentity(snap, current);
    const restored = await saveSupplier(
      {
        ...snap,
        id: current.id,
        tenantId: current.tenantId,
        deletedAt: null,
        deletedBy: null,
        purgeAfter: null,
      },
      {
        expectedRevision: current.revision ?? 1,
        userId,
        previous: current,
      }
    );
    await writeLeanEventAuditEvent({
      action: "version_restore",
      tenantId,
      userId,
      resourceType: "supplier",
      resourceId: entityId,
      detail: `fromRevision=${revision}`,
    });
    return { entity: restored, restoredFromRevision: revision };
  }

  const current = await getWorkspace(tenantId, entityId, {
    includeDeleted: true,
  });
  if (!current) {
    throw new Error("ENTITY_NOT_FOUND");
  }
  const snap = snapshot as LeonardoWorkspace;
  assertSameIdentity(snap, current);
  const restored = await saveWorkspace(
    {
      ...snap,
      id: current.id,
      tenantId: current.tenantId,
      deletedAt: null,
      deletedBy: null,
      purgeAfter: null,
    },
    {
      expectedRevision: current.revision ?? 1,
      userId,
      previous: current,
    }
  );
  await writeLeanEventAuditEvent({
    action: "version_restore",
    tenantId,
    userId,
    resourceType: "workspace",
    resourceId: entityId,
    detail: `fromRevision=${revision}`,
  });
  return { entity: restored, restoredFromRevision: revision };
}
