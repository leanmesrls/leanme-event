"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/homepage/Icons";
import {
  agentCardImageClassName,
  agentCardImageSrc,
  agentHomepageTileClassName,
} from "@/lib/agent-images";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import type { LeanAgent } from "@/types/content";

interface AgentCardProps {
  agent: LeanAgent;
}

export function AgentHomepageCard({ agent }: AgentCardProps) {
  return (
    <FuchsiaGlowCard
      variant="agent"
      className={agentHomepageTileClassName}
      contentClassName="block h-full w-full"
    >
      <Link
        href={`/staff-ibrido/lean-agent/${agent.slug}`}
        className="relative block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leanme-fuchsia"
      >
        <Image
          src={agent.image.src}
          alt={`${agent.name} — ${agent.role}`}
          fill
          className="object-contain object-center transition duration-500 hover:scale-[1.03]"
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 22vw, 180px"
        />
      </Link>
    </FuchsiaGlowCard>
  );
}

export function AgentCard({ agent }: AgentCardProps) {
  const cardSrc = agentCardImageSrc(agent.slug);

  return (
    <Link
      href={`/staff-ibrido/lean-agent/${agent.slug}`}
      className="group block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
    >
      <FuchsiaGlowCard
        variant="card"
        className="flex h-full flex-col rounded-xl border border-white/10 bg-[#111111]"
        contentClassName="flex h-full flex-col"
      >
        <div className={agentCardImageClassName}>
          <Image
            src={cardSrc}
            alt={agent.cardImage?.alt ?? `${agent.name} — ${agent.role}`}
            fill
            className="object-contain object-top transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 1280px) 25vw, 220px"
          />
        </div>
        <div className="space-y-1 px-3 py-4 text-center">
          <p className="text-sm font-bold tracking-[0.08em] text-white">{agent.name}</p>
          <p className="min-h-[2.5rem] text-[11px] leading-snug text-white/60">
            {agent.specialty}
          </p>
          {agent.action && (
            <p
              className="pt-1 text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: agent.actionColor ?? "#8016D2" }}
            >
              {agent.action}
            </p>
          )}
        </div>
      </FuchsiaGlowCard>
    </Link>
  );
}

export function AgentCardCompact({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/staff-ibrido/lean-agent/${agent.slug}`}
      className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
    >
      <FuchsiaGlowCard
        variant="card"
        className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111111] p-3"
      >
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={agent.image.src}
            alt={agent.name}
            fill
            className="object-cover object-top"
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-[0.08em] text-white">{agent.name}</p>
          <p className="text-xs text-white/60">{agent.role}</p>
          {agent.action && (
            <p
              className="text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: agent.actionColor ?? "#8016D2" }}
            >
              {agent.action}
            </p>
          )}
        </div>
        <ArrowIcon className="shrink-0 text-white/50" />
      </FuchsiaGlowCard>
    </Link>
  );
}
