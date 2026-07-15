import Image from "next/image";

import {
  getLeanAgentForCapability,
  type LeanAgentAiCapability,
} from "@/lib/leanyou/ai-agents";
import { cn } from "@/lib/utils";

interface LeanAgentAiPoweredByProps {
  capability: LeanAgentAiCapability;
  className?: string;
  iconSize?: number;
}

/** Compact AI attribution next to a specific AI feature only. */
export function LeanAgentAiPoweredBy({
  capability,
  className,
  iconSize = 22,
}: LeanAgentAiPoweredByProps) {
  const agent = getLeanAgentForCapability(capability);
  if (!agent) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/45",
        className
      )}
      aria-label={`Funzione AI gestita da Lean.Agent ${agent.name}`}
    >
      <span
        className="inline-flex shrink-0 overflow-hidden rounded-full border border-white/15 bg-white"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src={agent.badge}
          alt=""
          width={iconSize}
          height={iconSize}
          className="object-cover object-[center_18%]"
        />
      </span>
      <span>
        Powered by{" "}
        <span className="text-leanme-fuchsia">Lean.Agent.{agent.name}</span>
      </span>
    </span>
  );
}
