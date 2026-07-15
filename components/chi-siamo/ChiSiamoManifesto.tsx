import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ChiSiamoHighlightCard } from "@/components/chi-siamo/ChiSiamoHighlightCard";
import type { ChiSiamoData } from "@/types/content";

interface ChiSiamoManifestoProps {
  manifesto: ChiSiamoData["manifesto"];
}

export function ChiSiamoManifesto({ manifesto }: ChiSiamoManifestoProps) {
  return (
    <RevealOnScroll>
      <ChiSiamoHighlightCard
        id="manifesto"
        ariaLabelledBy="chi-siamo-manifesto-heading"
      >
        <h2
          id="chi-siamo-manifesto-heading"
          className="text-xl font-bold leading-snug tracking-[0.03em] text-leanme-fuchsia md:text-2xl lg:text-[1.65rem]"
        >
          {manifesto.title}
        </h2>
        <div className="mt-6 space-y-4">
          {manifesto.content.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-relaxed text-white/80 md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </ChiSiamoHighlightCard>
    </RevealOnScroll>
  );
}
