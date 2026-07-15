"use client";

import Link from "next/link";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import type { CreditsData } from "@/types/content";

interface CreditsContentProps {
  data: CreditsData;
}

function CreditCard({
  name,
  role,
  description,
}: {
  name: string;
  role: string;
  description: string;
}) {
  return (
    <FuchsiaGlowCard
      variant="card"
      className="h-full rounded-xl border border-white/10 bg-[#111111] p-6"
      contentClassName="flex h-full flex-col"
    >
      <h3 className="text-lg font-bold text-white">{name}</h3>
      <p className="mt-1 text-sm font-semibold text-leanme-fuchsia">{role}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/70">
        {description}
      </p>
    </FuchsiaGlowCard>
  );
}

export function CreditsContent({ data }: CreditsContentProps) {
  return (
    <div className="space-y-16">
      <div className="space-y-16">
        <section aria-labelledby="credits-people-heading">
          <h2
            id="credits-people-heading"
            className="text-lg font-bold uppercase tracking-[0.1em] text-white"
          >
            {data.people.title}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {data.people.members.map((member) => (
              <CreditCard key={member.name} {...member} />
            ))}
          </div>
        </section>

        <section aria-labelledby="credits-agents-heading">
          <h2
            id="credits-agents-heading"
            className="text-lg font-bold uppercase tracking-[0.1em] text-white"
          >
            {data.agents.title}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.agents.members.map((member) => (
              <CreditCard key={member.name} {...member} />
            ))}
          </div>
        </section>

        <section aria-labelledby="credits-tech-heading">
          <h2
            id="credits-tech-heading"
            className="text-lg font-bold uppercase tracking-[0.1em] text-white"
          >
            {data.technologies.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            {data.technologies.intro}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {data.technologies.items.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white/85"
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-white/50">{data.technologies.footer}</p>
        </section>
      </div>

      <Link
        href="/"
        className="inline-block text-sm font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia transition hover:text-white"
      >
        ← Torna alla Home
      </Link>
    </div>
  );
}
