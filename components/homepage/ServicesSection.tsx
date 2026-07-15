"use client";

import Link from "next/link";
import { ArrowIcon, ServiceIconBadge } from "@/components/homepage/Icons";
import { SectionTitle } from "@/components/homepage/SectionTitle";
import { PercorsoConsultationCta } from "@/components/percorsi/PercorsoConsultationCta";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { PercorsiConsultationCta } from "@/types/content";
import type { HomepageData } from "@/types/homepage";

interface ServicesSectionProps {
  data: HomepageData["services"];
  consultationCta: PercorsiConsultationCta;
}

function ServiceCard({
  item,
  linkLabel,
  size,
}: {
  item: HomepageData["services"]["items"][number];
  linkLabel: string;
  size: "md" | "sm";
}) {
  return (
    <FuchsiaGlowCard
      as="article"
      variant="card"
      className="flex flex-col rounded-lg border border-white/[0.08] bg-leanme-card p-5 lg:p-6"
      contentClassName="flex h-full flex-col"
    >
      <ServiceIconBadge name={item.icon} size={size} />
      <h3
        className={
          size === "md"
            ? "mt-5 min-h-[3.5rem] text-xs font-bold leading-snug tracking-[0.04em] text-white lg:text-sm"
            : "mt-4 text-xs font-bold leading-snug tracking-[0.04em] text-white"
        }
      >
        {item.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">
        {item.description}
      </p>
      <Link
        href={item.href}
        className={
          size === "md"
            ? "mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia lg:text-[11px]"
            : "mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia transition hover:text-white"
        }
      >
        {linkLabel}
        <ArrowIcon />
      </Link>
    </FuchsiaGlowCard>
  );
}

export function ServicesSection({ data, consultationCta }: ServicesSectionProps) {
  return (
    <RevealOnScroll>
      <section
        aria-labelledby="services-heading"
        className="section-padding bg-black"
      >
        <div className="mx-auto max-w-[1440px]">
          <SectionTitle id="services-heading">{data.title}</SectionTitle>

          <div className="mt-8 flex justify-center">
            <PercorsoConsultationCta
              href={consultationCta.href}
              label={consultationCta.label}
            />
          </div>

          <div className="mt-10 hidden gap-4 xl:grid xl:grid-cols-5 xl:gap-5">
            {data.items.map((item, index) => (
              <RevealOnScroll key={item.slug} delay={index * 0.06}>
                <ServiceCard item={item} linkLabel={data.linkLabel} size="md" />
              </RevealOnScroll>
            ))}
          </div>

          <div className="mt-10 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:hidden">
            {data.items.map((item, index) => (
              <RevealOnScroll key={item.slug} delay={index * 0.06}>
                <ServiceCard item={item} linkLabel={data.linkLabel} size="sm" />
              </RevealOnScroll>
            ))}
          </div>

          <div className="mt-8 divide-y divide-white/[0.08] md:hidden">
            {data.items.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className="flex items-center gap-4 py-4 transition hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-leanme-fuchsia"
              >
                <ServiceIconBadge name={item.icon} size="sm" />
                <span className="flex-1 text-[11px] font-bold leading-snug tracking-[0.03em] text-white">
                  {item.title}
                </span>
                <ArrowIcon className="shrink-0 text-leanme-fuchsia" />
              </Link>
            ))}
          </div>

        </div>
      </section>
    </RevealOnScroll>
  );
}
