"use client";

import { useState } from "react";
import Image from "next/image";
import type { PartnerLogo } from "@/lib/companies";

interface PartnerMarqueeProps {
  logos: PartnerLogo[];
}

export function PartnerMarquee({ logos }: PartnerMarqueeProps) {
  const [paused, setPaused] = useState(false);

  if (logos.length === 0) return null;

  const track = [...logos, ...logos];

  return (
    <div
      className="relative cursor-default overflow-hidden py-2"
      aria-label="Loghi partner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent md:w-14" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent md:w-14" />

      <div
        className="partner-marquee-track flex w-max gap-10 md:gap-14"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {track.map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className="flex h-14 w-[140px] shrink-0 items-center justify-center md:h-16 md:w-[160px]"
          >
            <Image
              src={partner.logo}
              alt={partner.alt}
              width={160}
              height={64}
              className="max-h-10 w-auto max-w-full object-contain brightness-0 invert opacity-75 transition-opacity duration-300 hover:opacity-100 md:max-h-12"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
