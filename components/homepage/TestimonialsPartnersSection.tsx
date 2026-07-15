"use client";

import { useCallback, useEffect, useState } from "react";
import { QuoteIcon } from "@/components/homepage/Icons";
import { PartnerMarquee } from "@/components/homepage/PartnerMarquee";
import { SectionTitle } from "@/components/homepage/SectionTitle";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { PartnerLogo } from "@/lib/companies";
import type { Testimonial } from "@/types/content";
import type { HomepageData } from "@/types/homepage";

interface TestimonialsPartnersSectionProps {
  testimonials: Testimonial[];
  testimonialsData: HomepageData["testimonials"];
  partnersData: HomepageData["partners"];
  partnerLogos: PartnerLogo[];
}

const SLIDE_INTERVAL_MS = 8000;

export function TestimonialsPartnersSection({
  testimonials,
  testimonialsData,
  partnersData,
  partnerLogos,
}: TestimonialsPartnersSectionProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      if (testimonials.length === 0) return;
      setIndex((next + testimonials.length) % testimonials.length);
    },
    [testimonials.length]
  );

  useEffect(() => {
    if (isPaused || testimonials.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % testimonials.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, testimonials.length]);

  const current = testimonials[index] ?? testimonials[0];
  if (!current) return null;

  return (
    <RevealOnScroll>
      <section
        aria-labelledby="testimonials-heading"
        className="section-padding bg-black"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionTitle id="testimonials-heading" align="left" underline={false}>
            {testimonialsData.title}
          </SectionTitle>
          <QuoteIcon className="mt-8 h-9 w-9 md:h-10 md:w-10" />

          <div className="relative mt-6 min-h-[180px] md:min-h-[200px]">
            {testimonials.map((item, itemIndex) => (
              <blockquote
                key={item.id}
                className={`absolute inset-0 text-sm leading-relaxed text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:text-base ${
                  itemIndex === index
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0"
                }`}
                aria-hidden={itemIndex !== index}
              >
                &ldquo;{item.quote}&rdquo;
                <footer className="mt-6">
                  <cite className="not-italic">
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-white/50">
                      {[item.role, item.company].filter(Boolean).join(", ")}
                    </p>
                  </cite>
                </footer>
              </blockquote>
            ))}
          </div>

          <div
            className="mt-8 flex gap-2"
            role="tablist"
            aria-label="Testimonianze"
          >
            {testimonials.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === dotIndex}
                aria-label={`Testimonianza ${dotIndex + 1} di ${testimonials.length}`}
                onClick={() => goTo(dotIndex)}
                className={`h-2 w-2 rounded-full transition ${
                  index === dotIndex ? "bg-leanme-fuchsia" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle id="partners-heading" align="left" underline={false}>
            {partnersData.title}
          </SectionTitle>
          <div className="mt-10">
            <PartnerMarquee logos={partnerLogos} />
          </div>
        </div>
      </div>
    </section>
    </RevealOnScroll>
  );
}
