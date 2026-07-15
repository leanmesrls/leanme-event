import type { LeanEventSession } from "@/types/lean-event";

/** Giorni di retention in cestino prima del purge definitivo. */
export const LEONYOU_TRASH_RETENTION_DAYS = 30;

const TRASH_RETENTION_MS = LEONYOU_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type LeanEventManagedEntityType =
  | "event"
  | "contact"
  | "supplier"
  | "assignment";

export interface LeanEventEntityLifecycleFields {
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

export class LeanEventRevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT" as const;

  constructor(
    public readonly currentRevision: number,
    public readonly updatedAt: string,
    public readonly updatedBy: string | undefined,
    public readonly serverEntity: unknown
  ) {
    super("REVISION_CONFLICT");
    this.name = "LeanEventRevisionConflictError";
  }
}

export function withLifecycleDefaults<
  T extends object & Partial<LeanEventEntityLifecycleFields>,
>(entity: T): T & LeanEventEntityLifecycleFields {
  const lifecycle = entity as Partial<LeanEventEntityLifecycleFields>;
  return {
    ...entity,
    revision: typeof lifecycle.revision === "number" ? lifecycle.revision : 1,
    updatedBy:
      typeof lifecycle.updatedBy === "string" ? lifecycle.updatedBy : undefined,
    deletedAt: lifecycle.deletedAt ?? null,
    deletedBy: lifecycle.deletedBy ?? null,
    purgeAfter: lifecycle.purgeAfter ?? null,
  };
}

export function isEntityActive(entity: {
  deletedAt?: string | null;
}): boolean {
  return !entity.deletedAt;
}

export function computePurgeAfter(deletedAt: string): string {
  return new Date(new Date(deletedAt).getTime() + TRASH_RETENTION_MS).toISOString();
}

export function assertRevisionMatch(
  current: LeanEventEntityLifecycleFields,
  expectedRevision?: number
): void {
  if (expectedRevision === undefined) {
    return;
  }
  const currentRevision = current.revision ?? 1;
  if (currentRevision !== expectedRevision) {
    throw new LeanEventRevisionConflictError(
      currentRevision,
      (current as { updatedAt?: string }).updatedAt ?? "",
      current.updatedBy,
      current
    );
  }
}

function withUpdatedTimestamp<T extends LeanEventEntityLifecycleFields>(
  entity: T,
  timestamp: string
): T {
  if ("updatedAt" in entity) {
    return { ...entity, updatedAt: timestamp } as T;
  }
  return entity;
}

export function prepareEntityCreate<T extends LeanEventEntityLifecycleFields>(
  entity: T,
  userId: string
): T {
  const now = new Date().toISOString();
  return withUpdatedTimestamp(
    {
      ...entity,
      revision: 1,
      updatedBy: userId,
      deletedAt: null,
      deletedBy: null,
      purgeAfter: null,
    } as T,
    now
  );
}

export function prepareEntityUpdate<T extends LeanEventEntityLifecycleFields>(
  entity: T,
  userId: string
): T {
  const now = new Date().toISOString();
  return withUpdatedTimestamp(
    {
      ...entity,
      revision: (entity.revision ?? 1) + 1,
      updatedBy: userId,
    } as T,
    now
  );
}

export function markEntityDeleted<T extends LeanEventEntityLifecycleFields>(
  entity: T,
  userId: string
): T {
  const deletedAt = new Date().toISOString();
  return withUpdatedTimestamp(
    {
      ...entity,
      deletedAt,
      deletedBy: userId,
      purgeAfter: computePurgeAfter(deletedAt),
      revision: (entity.revision ?? 1) + 1,
      updatedBy: userId,
    } as T,
    deletedAt
  );
}

export function markEntityRestored<T extends LeanEventEntityLifecycleFields>(
  entity: T,
  userId: string
): T {
  const now = new Date().toISOString();
  return withUpdatedTimestamp(
    {
      ...entity,
      deletedAt: null,
      deletedBy: null,
      purgeAfter: null,
      revision: (entity.revision ?? 1) + 1,
      updatedBy: userId,
    } as T,
    now
  );
}

export function sessionUserId(session: LeanEventSession): string {
  return session.userId || session.userEmail;
}

export function isRevisionConflictError(
  error: unknown
): error is LeanEventRevisionConflictError {
  return error instanceof LeanEventRevisionConflictError;
}
