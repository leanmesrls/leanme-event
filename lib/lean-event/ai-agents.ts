import agentMapData from "@/data/lean-event/ai-agent-map.json";

type AgentSlug =
  | "leonardo"
  | "vespucci"
  | "marconi"
  | "galileo"
  | "olivetti"
  | "angela"
  | "teresa";

type CapabilityAgentKey = keyof typeof agentMapData.capabilityAgents;

const agentMap = agentMapData as {
  agents: Record<
    AgentSlug,
    {
      name: string;
      action: string;
      image: string;
      badge: string;
    }
  >;
  capabilityAgents: Record<string, AgentSlug>;
};

export type LeanAgentAiCapability = CapabilityAgentKey;

export type LeanAgentInfo = {
  slug: AgentSlug;
  name: string;
  action: string;
  image: string;
  badge: string;
};

export function getLeanAgent(slug: AgentSlug): LeanAgentInfo | null {
  const agent = agentMap.agents[slug];
  if (!agent) {
    return null;
  }
  return { slug, ...agent };
}

export function getLeanAgentForCapability(
  capability: LeanAgentAiCapability
): LeanAgentInfo | null {
  const slug = agentMap.capabilityAgents[capability];
  if (!slug) {
    return null;
  }
  return getLeanAgent(slug);
}

export function getAllCapabilityAgentMappings(): Array<{
  capability: string;
  slug: AgentSlug;
  name: string;
  action: string;
  image: string;
  badge: string;
}> {
  return Object.entries(agentMap.capabilityAgents).map(([capability, slug]) => ({
    capability,
    slug,
    ...agentMap.agents[slug],
  }));
}
