import type { LeanEventCommercialPack } from "@/contracts/tenant-context";
import type { LeanEventModuleManifest } from "@/contracts/module-manifest";

const CATALOG: LeanEventModuleManifest[] = [
  {
    id: "core",
    technicalName: "core",
    displayName: "Core",
    version: "1.0.0",
    capabilities: ["events", "contacts", "documents", "users"],
    dependencies: [],
    routes: ["/eventi", "/contatti", "/documenti", "/sistema"],
    permissions: ["read", "write"],
    tables: ["lean_event_events", "lean_event_contacts", "lean_event_documents"],
    domainEvents: ["EventCreated", "EventUpdated", "DocumentUploaded"],
    status: "available",
    minCoreVersion: "1.0.0",
    minSchemaVersion: "1",
  },
  {
    id: "ai",
    technicalName: "ai",
    displayName: "AI",
    version: "1.0.0",
    capabilities: ["meeting-minutes", "content-generation", "customer-support"],
    dependencies: ["core"],
    routes: ["/ai", "/ai/verbali", "/ai/supporto"],
    permissions: ["ai.use"],
    tables: ["lean_event_meeting_minutes_workspaces"],
    domainEvents: ["MeetingMinutesRequested", "ContentGenerationRequested"],
    status: "available",
    minCoreVersion: "1.0.0",
    minSchemaVersion: "1",
  },
  {
    id: "finance",
    technicalName: "finance",
    displayName: "Finance",
    version: "1.0.0",
    capabilities: ["budget", "finance"],
    dependencies: ["core"],
    routes: ["/budget", "/finance"],
    permissions: ["finance.read", "finance.write"],
    tables: [],
    domainEvents: ["BudgetUpdated"],
    status: "available",
    minCoreVersion: "1.0.0",
    minSchemaVersion: "1",
  },
  {
    id: "connect",
    technicalName: "connect",
    displayName: "Connect",
    version: "1.0.0",
    capabilities: ["realtime-room"],
    dependencies: ["core"],
    routes: [],
    permissions: ["connect.use"],
    tables: [],
    domainEvents: [],
    status: "locked",
    minCoreVersion: "1.0.0",
    minSchemaVersion: "1",
  },
];

const PACK_MODULES: Record<LeanEventCommercialPack, string[]> = {
  CORE: ["core"],
  PRO: ["core", "finance"],
  AI: ["core", "finance", "ai"],
  PLATINUM: ["core", "finance", "ai", "connect"],
};

export function listModuleCatalog(): LeanEventModuleManifest[] {
  return CATALOG.map((item) => ({ ...item }));
}

export function modulesForPack(pack: LeanEventCommercialPack): string[] {
  return [...PACK_MODULES[pack]];
}

export function isModuleAllowedForPack(
  pack: LeanEventCommercialPack,
  moduleId: string
): boolean {
  return PACK_MODULES[pack].includes(moduleId);
}

export function assertModuleActive(input: {
  pack: LeanEventCommercialPack;
  activeModuleIds: string[];
  moduleId: string;
}): void {
  if (!isModuleAllowedForPack(input.pack, input.moduleId)) {
    throw new Error(`Module locked for pack ${input.pack}: ${input.moduleId}`);
  }
  if (!input.activeModuleIds.includes(input.moduleId)) {
    throw new Error(`Module not active: ${input.moduleId}`);
  }
}
