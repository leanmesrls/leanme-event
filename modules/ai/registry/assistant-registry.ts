import type { LeanEventAssistantProfile } from "@/contracts/assistant-profile";

/**
 * Technical assistant profiles. Commercial names live only in commercialIdentity.
 */
const PROFILES: LeanEventAssistantProfile[] = [
  {
    profileId: "meeting-minutes-assistant",
    displayName: "Meeting Minutes Assistant",
    description: "Audio/video transcription and structured meeting minutes",
    capabilities: [
      "audio-transcription",
      "meeting-analysis",
      "minutes-generation",
    ],
    promptRef: "meeting-minutes",
    provider: "openai",
    model: "gpt-4o-mini",
    requiredModules: ["ai"],
    status: "active",
    version: "1.0.0",
    commercialIdentity: {
      brandName: "Leonardo",
      badgeUrl: "/assets/official/leanyou/agent-badges/leonardo.png",
    },
  },
  {
    profileId: "customer-support-assistant",
    displayName: "Customer Support Assistant",
    description: "Human-support rail for tenant operators",
    capabilities: ["customer-support"],
    promptRef: "customer-support",
    provider: "openai",
    model: "gpt-4o-mini",
    requiredModules: ["ai"],
    status: "active",
    version: "1.0.0",
    commercialIdentity: {
      brandName: "Teresa",
      badgeUrl: "/assets/official/leanyou/agent-badges/teresa.png",
    },
  },
  {
    profileId: "marketing-content-assistant",
    displayName: "Marketing Content Assistant",
    capabilities: ["marketing-writing"],
    provider: "openai",
    requiredModules: ["ai"],
    status: "disabled",
    version: "1.0.0",
    commercialIdentity: { brandName: "Marconi" },
  },
  {
    profileId: "graphic-content-assistant",
    displayName: "Graphic Content Assistant",
    capabilities: ["graphic-generation"],
    provider: "openai",
    requiredModules: ["ai"],
    status: "disabled",
    version: "1.0.0",
    commercialIdentity: { brandName: "Vespucci" },
  },
  {
    profileId: "workflow-analysis-assistant",
    displayName: "Workflow Analysis Assistant",
    capabilities: ["workflow-analysis"],
    provider: "openai",
    requiredModules: ["ai"],
    status: "disabled",
    version: "1.0.0",
    commercialIdentity: { brandName: "Galileo" },
  },
  {
    profileId: "training-content-assistant",
    displayName: "Training Content Assistant",
    capabilities: ["training-content"],
    provider: "openai",
    requiredModules: ["ai"],
    status: "disabled",
    version: "1.0.0",
    commercialIdentity: { brandName: "Angela" },
  },
  {
    profileId: "software-assistance-profile",
    displayName: "Software Assistance Profile",
    capabilities: ["software-assistance"],
    provider: "openai",
    requiredModules: ["ai"],
    status: "disabled",
    version: "1.0.0",
    commercialIdentity: { brandName: "Olivetti" },
  },
];

export function listAssistantProfiles(): LeanEventAssistantProfile[] {
  return PROFILES.map((profile) => ({ ...profile }));
}

export function getAssistantProfile(
  profileId: string
): LeanEventAssistantProfile | null {
  return PROFILES.find((profile) => profile.profileId === profileId) ?? null;
}

export function resolveDisplayName(
  profileId: string,
  tenantOverride?: string
): string {
  if (tenantOverride?.trim()) {
    return tenantOverride.trim();
  }
  const profile = getAssistantProfile(profileId);
  return profile?.displayName ?? profileId;
}
