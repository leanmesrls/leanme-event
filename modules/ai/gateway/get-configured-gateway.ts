import type { LeanEventAiGateway } from "@/contracts/ai-gateway";
import { createOpenAiProvider } from "@/modules/ai/providers/openai/openai-provider";

/**
 * Resolve AI gateway from provider id (tenant.aiProvider or default).
 * Only modules/ai may construct providers.
 */
export function getConfiguredAiGateway(
  aiProvider = "openai"
): LeanEventAiGateway {
  switch ((aiProvider || "openai").toLowerCase()) {
    case "openai":
      return createOpenAiProvider();
    default:
      throw new Error(`Unsupported AI provider: ${aiProvider}`);
  }
}
