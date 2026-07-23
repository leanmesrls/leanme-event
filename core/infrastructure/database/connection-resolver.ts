import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type { LeanEventTenantRecord } from "@/contracts/tenant-context";
import { resolveEnvSecret } from "@/core/infrastructure/database/secret-refs";
import { requireActiveTenantBySlug } from "@/core/infrastructure/tenant-registry/tenant-registry";

export class LeanEventDatabaseResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeanEventDatabaseResolverError";
  }
}

const sqlCache = new Map<string, NeonQueryFunction<false, false>>();

export function resolveTenantDatabaseUrl(
  tenant: LeanEventTenantRecord
): string {
  if (!tenant.databaseRef) {
    throw new LeanEventDatabaseResolverError(
      `Tenant ${tenant.slug} missing databaseRef`
    );
  }
  return resolveEnvSecret(tenant.databaseRef);
}

export function getTenantSql(
  tenant: LeanEventTenantRecord
): NeonQueryFunction<false, false> {
  if (tenant.status !== "active") {
    throw new LeanEventDatabaseResolverError(
      `Refuse DB connection for non-active tenant ${tenant.slug}`
    );
  }

  const cached = sqlCache.get(tenant.id);
  if (cached) {
    return cached;
  }

  const url = resolveTenantDatabaseUrl(tenant);
  const client = neon(url);
  sqlCache.set(tenant.id, client);
  return client;
}

export async function resolveTenantSqlBySlug(slug: string): Promise<{
  tenant: LeanEventTenantRecord;
  sql: NeonQueryFunction<false, false>;
}> {
  const tenant = await requireActiveTenantBySlug(slug);
  return { tenant, sql: getTenantSql(tenant) };
}
