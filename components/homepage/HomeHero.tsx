"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowIcon } from "@/components/homepage/Icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { HomepageData } from "@/types/homepage";

interface HomeHeroProps {
  data: HomepageData["hero"];
}

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function HomeHero({ data }: HomeHeroProps) {
  const reducedMotion = useReducedMotion();

  const container = reducedMotion
    ? undefined
    : {
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.14, delayChildren: 0.12 },
        },
      };

  const item = reducedMotion ? undefined : fadeUp;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative min-h-[480px] overflow-hidden bg-black md:min-h-[540px] lg:min-h-[580px]"
    >
      <div
        className={cn(
          "absolute inset-0",
          !reducedMotion && "animate-hero-ken-burns"
        )}
      >
        <Image
          src={data.background}
          alt="Reception LeanMe — parete in legno, logo, monitor e illuminazione calda"
          fill
          priority
          className="object-cover object-center lg:object-[52%_center]"
          sizes="100vw"
        />
      </div>

      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.28)_30%,rgba(0,0,0,0.08)_48%,transparent_62%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.15)_0%,transparent_22%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 px-5 md:px-10 lg:px-16">
        <motion.div
          variants={container}
          initial={reducedMotion ? false : "hidden"}
          animate={reducedMotion ? false : "visible"}
          className="mx-auto flex min-h-[480px] w-full max-w-[1440px] flex-col items-start justify-center pb-0 pt-10 text-left md:min-h-[540px] md:pt-12 lg:min-h-[580px] lg:pt-14"
        >
          <motion.p
            variants={item}
            className="text-[10px] font-medium uppercase tracking-[0.2em] text-white md:text-[11px]"
          >
            {data.claimPrimary}{" "}
            <span className="text-leanme-fuchsia">{data.claimAccent}</span>
          </motion.p>

          <motion.h1
            id="hero-heading"
            variants={item}
            className="mt-3 max-w-xl text-[1.75rem] font-bold leading-[1.15] md:mt-4 lg:text-[2.75rem] xl:text-5xl"
          >
            <span className="block text-white">{data.headlinePrefix}</span>
            <span className="mt-1 block text-[1.35rem] text-leanme-fuchsia sm:text-[1.5rem] md:mt-1.5 md:whitespace-nowrap md:text-4xl lg:text-[2.75rem] xl:text-5xl">
              {data.headlineAccent}
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-3 max-w-lg text-base text-white/95 md:mt-4 md:text-lg lg:text-xl"
          >
            {data.subheadline}
          </motion.p>

          <motion.div variants={item} className="mt-4 max-w-lg space-y-2">
            {data.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed text-white/85 md:text-[15px]"
              >
                {paragraph}
              </p>
            ))}
          </motion.div>

          <motion.div
            variants={item}
            className="mt-6 flex w-full flex-col items-start gap-3 sm:flex-row sm:flex-wrap"
          >
            <Link
              href={data.primaryCta.href}
              className="animate-cta-glow inline-flex items-center justify-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia md:text-xs"
            >
              {data.primaryCta.label}
              <ArrowIcon />
            </Link>
            <Link
              href={data.secondaryCta.href}
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-black/25 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:text-xs"
            >
              {data.secondaryCta.label}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
