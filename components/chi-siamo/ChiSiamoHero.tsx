import { PageHero } from "@/components/layout/PageHero";
import type { ChiSiamoData } from "@/types/content";

interface ChiSiamoHeroProps {
  intro: ChiSiamoData["intro"];
  hero: ChiSiamoData["hero"];
}

export function ChiSiamoHero({ intro, hero }: ChiSiamoHeroProps) {
  return (
    <PageHero
      id="chi-siamo-heading"
      title={intro.title}
      subtitle={intro.subtitle}
      background={hero.background}
      imageAlt={hero.imageAlt}
    />
  );
}
