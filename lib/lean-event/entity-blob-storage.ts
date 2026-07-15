import { del, get, list, put } from "@vercel/blob";

const BLOB_ACCESS = "private" as const;

export function isEntityBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, {
      access: BLOB_ACCESS,
      useCache: false,
    });
    if (!result?.stream) {
      return null;
    }

    const raw = await new Response(result.stream).text();
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[lean-event] Blob JSON non leggibile (${pathname}):`, error);
    return null;
  }
}

export function createEntityBlobStore(collectionRoot: string) {
  function entityPathname(tenantId: string, entityId: string): string {
    return `${collectionRoot}/${tenantId}/${entityId}.json`;
  }

  function tenantPrefix(tenantId: string): string {
    return `${collectionRoot}/${tenantId}/`;
  }

  return {
    async listTenant(tenantId: string): Promise<string[]> {
      const prefix = tenantPrefix(tenantId);
      const pathnames: string[] = [];
      let cursor: string | undefined;

      do {
        const page = await list({
          prefix,
          cursor,
          limit: 1000,
        });
        pathnames.push(...page.blobs.map((blob) => blob.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);

      return pathnames;
    },

    async get<T>(tenantId: string, entityId: string): Promise<T | null> {
      const pathname = entityPathname(tenantId, entityId);

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const entity = await readBlobJson<T>(pathname);
        if (entity) {
          return entity;
        }
        if (attempt < 3) {
          await sleep(200);
        }
      }

      return null;
    },

    async save<T extends { tenantId: string; id: string }>(
      entity: T
    ): Promise<void> {
      await put(entityPathname(entity.tenantId, entity.id), JSON.stringify(entity, null, 2), {
        access: BLOB_ACCESS,
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    },

    async delete(tenantId: string, entityId: string): Promise<void> {
      await del(entityPathname(tenantId, entityId));
    },

    async listAll<T>(tenantId: string): Promise<T[]> {
      const pathnames = await this.listTenant(tenantId);
      const entities = await Promise.all(
        pathnames.map((pathname) => readBlobJson<T>(pathname))
      );
      return entities.filter((entity): entity is NonNullable<Awaited<T>> =>
        entity != null
      ) as T[];
    },
  };
}
