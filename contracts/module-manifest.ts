export interface LeanEventModuleManifest {
  id: string;
  technicalName: string;
  displayName: string;
  version: string;
  capabilities: string[];
  dependencies: string[];
  routes: string[];
  permissions: string[];
  tables: string[];
  domainEvents: string[];
  status: "available" | "installed" | "active" | "locked" | "disabled";
  minCoreVersion: string;
  minSchemaVersion: string;
}
