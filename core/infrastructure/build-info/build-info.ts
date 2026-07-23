import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { LeanEventTenantRecord } from "@/contracts/tenant-context";
import { listAssistantProfiles } from "@/modules/ai/registry/assistant-registry";

export const LEAN_EVENT_ARCHITECTURE_VERSION = "1.0.0";

function readProductVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function maskRef(ref: string): string {
  if (!ref) return "unset";
  if (ref.length <= 8) return "***";
  return `${ref.slice(0, 4)}…${ref.slice(-4)}`;
}

export function getBuildInformation(tenant?: LeanEventTenantRecord) {
  const environment =
    process.env.VERCEL_ENV ||
    process.env.LEAN_EVENT_ENVIRONMENT ||
    process.env.NODE_ENV ||
    "development";

  return {
    productName: "Lean.Event",
    productVersion:
      process.env.LEAN_EVENT_PRODUCT_VERSION?.trim() || readProductVersion(),
    architectureVersion:
      process.env.LEAN_EVENT_ARCHITECTURE_VERSION?.trim() ||
      LEAN_EVENT_ARCHITECTURE_VERSION,
    releaseName: process.env.LEAN_EVENT_RELEASE_NAME?.trim() || null,
    buildNumber: process.env.LEAN_EVENT_BUILD_NUMBER?.trim() || null,
    gitCommit:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.LEAN_EVENT_GIT_COMMIT?.trim() ||
      null,
    buildTime:
      process.env.LEAN_EVENT_BUILD_TIME?.trim() ||
      process.env.BUILD_TIME?.trim() ||
      null,
    deployTime: process.env.LEAN_EVENT_DEPLOY_TIME?.trim() || null,
    environment,
    tenant: tenant
      ? {
          id: tenant.id,
          slug: tenant.slug,
          displayName: tenant.displayName,
          status: tenant.status,
          schemaVersion: tenant.schemaVersion,
          migrationStatus: tenant.migrationStatus,
          databaseRefMasked: maskRef(tenant.databaseRef),
          storageRefMasked: maskRef(tenant.storageRef),
          modules: tenant.modules,
          commercialPack: tenant.commercialPack,
          aiProvider: tenant.aiProvider,
          assistantProfiles: tenant.assistantProfileIds.map((profileId) => {
            const profile = listAssistantProfiles().find(
              (item) => item.profileId === profileId
            );
            return {
              profileId,
              displayName: profile?.displayName ?? profileId,
              commercialName: profile?.commercialIdentity?.brandName ?? null,
            };
          }),
        }
      : null,
    documentation: {
      readme: "/docs/README.md",
      designPrinciples: "/docs/design/lean-event-design-principles.md",
      mandate: "/docs/design/lean-event-architecture-mandate.md",
      adr: "/docs/adr/README.md",
    },
    services: {
      controlPlaneConfigured: Boolean(
        process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim()
      ),
      inngestConfigured: Boolean(
        process.env.INNGEST_EVENT_KEY?.trim() ||
          process.env.INNGEST_SIGNING_KEY?.trim()
      ),
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
  };
}
