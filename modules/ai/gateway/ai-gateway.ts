import type { LeanEventAiGateway } from "@/contracts/ai-gateway";
import type { LeanEventTenantRecord } from "@/contracts/tenant-context";
import { createOpenAiProvider } from "@/modules/ai/providers/openai/openai-provider";

export class LeanEventAiGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeanEventAiGatewayError";
  }
}

/**
 * Sole entry point for AI calls. Domain code must not import providers.
 */
export function getAiGateway(tenant: LeanEventTenantRecord): LeanEventAiGateway {
  const provider = (tenant.aiProvider || "openai").toLowerCase();

  switch (provider) {
    case "openai":
      return createOpenAiProvider();
    default:
      throw new LeanEventAiGatewayError(
        `Unsupported AI provider for tenant ${tenant.slug}: ${provider}`
      );
  }
}
