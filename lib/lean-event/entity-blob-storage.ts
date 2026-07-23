/**
 * Entity Blob adapter — disabled for Neon-only runtime.
 * Callers fall through to Neon / local FS. No @vercel/blob import.
 */

export function isEntityBlobStorageEnabled(): boolean {
  return false;
}

export function createEntityBlobStore(_collectionRoot: string) {
  return {
    async listTenant(_tenantId: string): Promise<string[]> {
      return [];
    },
    async get<T>(_tenantId: string, _entityId: string): Promise<T | null> {
      return null;
    },
    async save<T extends { tenantId: string; id: string }>(
      _entity: T
    ): Promise<void> {
      throw new Error("ENTITY_BLOB_DISABLED");
    },
    async delete(_tenantId: string, _entityId: string): Promise<void> {
      // no-op
    },
    async listAll<T>(_tenantId: string): Promise<T[]> {
      return [];
    },
  };
}
