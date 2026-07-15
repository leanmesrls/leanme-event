"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/homepage/Icons";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ASSETS } from "@/lib/assets";
import type { HomepageData } from "@/types/homepage";

interface LeanAcademySectionProps {
  data: HomepageData["leanAcademy"];
}

export function LeanAcademySection({ data }: LeanAcademySectionProps) {
  return (
    <RevealOnScroll>
      <section
        aria-labelledby="academy-heading"
        className="section-padding relative overflow-hidden bg-black"
      >
        <div
          className="pointer-events-none absolute inset-0 lg:translate-x-[11%]"
          aria-hidden="true"
        >
          <Image
            src={ASSETS.decorative.leanAcademy}
            alt=""
            fill
            className="object-contain object-[72%_center] lg:object-[58%_center]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.5)_30%,rgba(0,0,0,0.08)_55%,transparent_75%)] lg:hidden" />
          <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.82)_24%,rgba(0,0,0,0.35)_40%,rgba(0,0,0,0.04)_50%,transparent_58%)] lg:block" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.18)_0%,transparent_22%)]" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1440px] items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          <div>
            <h2
              id="academy-heading"
              className="text-xl font-bold tracking-[0.12em] text-white md:text-2xl"
            >
              {data.title}
            </h2>
            <p className="mt-2 text-base text-leanme-fuchsia md:text-lg">
              {data.tagline}
            </p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/60 md:text-base">
              {data.description}
            </p>
            <Link
              href={data.cta.href}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark md:text-xs"
            >
              {data.cta.label}
              <ArrowIcon />
            </Link>
          </div>

          <div
            className="hidden min-h-[320px] lg:block xl:min-h-[380px]"
            aria-hidden="true"
          />
        </div>
      </section>
    </RevealOnScroll>
  );
}
