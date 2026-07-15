"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/homepage/Icons";
import { SectionTitle } from "@/components/homepage/SectionTitle";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { agentHomepageTileClassName } from "@/lib/agent-images";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { HomepageData } from "@/types/homepage";

interface LeanAgentAiSectionProps {
  data: HomepageData["leanAgentAi"];
}

function AgentCompactCard({
  agent,
}: {
  agent: HomepageData["leanAgentAi"]["agents"][number];
}) {
  return (
    <FuchsiaGlowCard
      variant="agent"
      className={agentHomepageTileClassName}
      contentClassName="block h-full w-full"
    >
      <Link
        href={agent.href}
        className="relative block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leanme-fuchsia"
      >
        <Image
          src={agent.image}
          alt={`${agent.name} — ${agent.role}`}
          fill
          className="object-contain object-center"
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 22vw, 180px"
        />
      </Link>
    </FuchsiaGlowCard>
  );
}

export function LeanAgentAiSection({ data }: LeanAgentAiSectionProps) {
  return (
    <section
      aria-labelledby="lean-agent-heading"
      className="section-padding bg-black"
    >
      <div className="mx-auto max-w-[1440px]">
        <RevealOnScroll>
          <SectionTitle id="lean-agent-heading">{data.title}</SectionTitle>
          <div className="mt-6 w-full space-y-3 px-2 text-center text-sm leading-relaxed text-white/65 md:text-base">
            {data.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={data.footerLink.href}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia md:text-xs"
            >
              {data.footerLink.label}
              <ArrowIcon />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="mt-6 grid grid-cols-2 items-start gap-5 px-2 sm:grid-cols-3 md:grid-cols-4 md:gap-6 xl:grid-cols-7">
          {data.agents.map((agent) => (
            <AgentCompactCard key={agent.slug} agent={agent} />
          ))}
        </div>
      </div>
    </section>
  );
}
