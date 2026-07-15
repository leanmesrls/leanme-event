import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ChiSiamoHighlightCard } from "@/components/chi-siamo/ChiSiamoHighlightCard";
import type { LeanLabPageData } from "@/types/content";

interface LeanLabIntroProps {
  intro: LeanLabPageData["intro"];
}

export function LeanLabIntro({ intro }: LeanLabIntroProps) {
  return (
    <RevealOnScroll>
      <ChiSiamoHighlightCard id="leanlab-intro">
        <div className="space-y-6">
          {intro.sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-bold tracking-[0.03em] text-leanme-fuchsia md:text-lg">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3">
                {section.content.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-base leading-relaxed text-white/80 md:text-lg"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ChiSiamoHighlightCard>
    </RevealOnScroll>
  );
}
