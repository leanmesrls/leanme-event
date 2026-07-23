export interface LeanEventAssistantProfile {
  /** Technical ID — never a commercial agent name. */
  profileId: string;
  displayName: string;
  description?: string;
  capabilities: string[];
  promptRef?: string;
  provider: string;
  model?: string;
  requiredModules: string[];
  status: "active" | "disabled";
  version: string;
  imageUrl?: string;
  /** Optional commercial identity for UI only. */
  commercialIdentity?: {
    brandName?: string;
    badgeUrl?: string;
  };
}
