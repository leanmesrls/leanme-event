import type { LeanYouSession } from "@/types/leanyou";

/** Giorni di retention in cestino prima del purge definitivo. */
export const LEONYOU_TRASH_RETENTION_DAYS = 30;

const TRASH_RETENTION_MS = LEONYOU_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type LeanYouManagedEntityType =
  | "event"
  | "contact"
  | "supplier"
  | "assignment";

export interface LeanYouEntityLifecycleFields {
  revision?: number;
  updatedBy?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  purgeAfter?: string | null;
}

export class LeanYouRevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT" as const;

  constructor(
    public readonly currentRevision: number,
    public readonly updatedAt: string,
    public readonly updatedBy: string | undefined,
    public readonly serverEntity: unknown
  ) {
    super("REVISION_CONFLICT");
    this.name = "LeanYouRevisionConflictError";
  }
}

export function withLifecycleDefaults<
  T extends object & Partial<LeanYouEntityLifecycleFields>,
>(entity: T): T & LeanYouEntityLifecycleFields {
  const lifecycle = entity as Partial<LeanYouEntityLifecycleFields>;
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
  current: LeanYouEntityLifecycleFields,
  expectedRevision?: number
): void {
  if (expectedRevision === undefined) {
    return;
  }
  const currentRevision = current.revision ?? 1;
  if (currentRevision !== expectedRevision) {
    throw new LeanYouRevisionConflictError(
      currentRevision,
      (current as { updatedAt?: string }).updatedAt ?? "",
      current.updatedBy,
      current
    );
  }
}

function withUpdatedTimestamp<T extends LeanYouEntityLifecycleFields>(
  entity: T,
  timestamp: string
): T {
  if ("updatedAt" in entity) {
    return { ...entity, updatedAt: timestamp } as T;
  }
  return entity;
}

export function prepareEntityCreate<T extends LeanYouEntityLifecycleFields>(
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

export function prepareEntityUpdate<T extends LeanYouEntityLifecycleFields>(
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

export function markEntityDeleted<T extends LeanYouEntityLifecycleFields>(
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

export function markEntityRestored<T extends LeanYouEntityLifecycleFields>(
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

export function sessionUserId(session: LeanYouSession): string {
  return session.userId || session.userEmail;
}

export function isRevisionConflictError(
  error: unknown
): error is LeanYouRevisionConflictError {
  return error instanceof LeanYouRevisionConflictError;
}
