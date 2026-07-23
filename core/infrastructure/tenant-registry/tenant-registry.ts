import type {
  LeanEventCommercialPack,
  LeanEventEnvironment,
  LeanEventModuleInstall,
  LeanEventTenantRecord,
  LeanEventTenantStatus,
} from "@/contracts/tenant-context";
import { getControlPlaneSql } from "@/core/infrastructure/database/control-plane-client";

export class LeanEventTenantRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeanEventTenantRegistryError";
  }
}

type TenantRow = {
  id: string;
  slug: string;
  display_name: string;
  status: LeanEventTenantStatus;
  environment: LeanEventEnvironment;
  database_ref: string;
  storage_ref: string;
  secrets_ref: string;
  schema_version: string;
  migration_status: LeanEventTenantRecord["migrationStatus"];
  modules_json: LeanEventModuleInstall[] | string;
  commercial_pack: LeanEventCommercialPack;
  ai_provider: string;
  assistant_profile_ids: string[] | string;
  settings_json: Record<string, unknown> | string;
  provisioning_status: string;
  backup_status: string;
  health_status: string;
  created_at: string;
  updated_at: string;
};

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}

function mapRow(row: TenantRow): LeanEventTenantRecord {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    status: row.status,
    environment: row.environment,
    databaseRef: row.database_ref,
    storageRef: row.storage_ref,
    secretsRef: row.secrets_ref,
    schemaVersion: row.schema_version,
    migrationStatus: row.migration_status,
    modules: parseJson(row.modules_json, []),
    commercialPack: row.commercial_pack,
    aiProvider: row.ai_provider,
    assistantProfileIds: parseJson(row.assistant_profile_ids, []),
    settings: parseJson(row.settings_json, {}),
    provisioningStatus: row.provisioning_status,
    backupStatus: row.backup_status,
    healthStatus: row.health_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTenantBySlug(
  slug: string
): Promise<LeanEventTenantRecord> {
  const sql = getControlPlaneSql();
  const rows = (await sql`
    SELECT *
    FROM lean_event_tenants
    WHERE slug = ${slug}
    LIMIT 1
  `) as TenantRow[];

  const row = rows[0];
  if (!row) {
    throw new LeanEventTenantRegistryError(`Tenant not found: ${slug}`);
  }
  return mapRow(row);
}

export async function getTenantById(
  tenantId: string
): Promise<LeanEventTenantRecord> {
  const sql = getControlPlaneSql();
  const rows = (await sql`
    SELECT *
    FROM lean_event_tenants
    WHERE id = ${tenantId}
    LIMIT 1
  `) as TenantRow[];

  const row = rows[0];
  if (!row) {
    throw new LeanEventTenantRegistryError(`Tenant not found: ${tenantId}`);
  }
  return mapRow(row);
}

export async function requireActiveTenantBySlug(
  slug: string
): Promise<LeanEventTenantRecord> {
  const tenant = await getTenantBySlug(slug);
  if (tenant.status !== "active") {
    throw new LeanEventTenantRegistryError(
      `Tenant not active: ${slug} (${tenant.status})`
    );
  }
  return tenant;
}

export async function listTenants(): Promise<LeanEventTenantRecord[]> {
  const sql = getControlPlaneSql();
  const rows = (await sql`
    SELECT * FROM lean_event_tenants ORDER BY slug
  `) as TenantRow[];
  return rows.map(mapRow);
}
