export type LeanEventEnvironment = "development" | "staging" | "production";

export type LeanEventTenantStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "archived";

export type LeanEventCommercialPack = "CORE" | "PRO" | "AI" | "PLATINUM";

export interface LeanEventModuleInstall {
  id: string;
  version: string;
  active: boolean;
}

export interface LeanEventTenantRecord {
  id: string;
  slug: string;
  displayName: string;
  status: LeanEventTenantStatus;
  environment: LeanEventEnvironment;
  databaseRef: string;
  storageRef: string;
  secretsRef: string;
  schemaVersion: string;
  migrationStatus: "pending" | "up_to_date" | "failed" | "migrating";
  modules: LeanEventModuleInstall[];
  commercialPack: LeanEventCommercialPack;
  aiProvider: string;
  assistantProfileIds: string[];
  settings: Record<string, unknown>;
  provisioningStatus: string;
  backupStatus: string;
  healthStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeanEventTenantContext {
  tenant: LeanEventTenantRecord;
  correlationId: string;
  requestId: string;
  actorUserId?: string;
}
