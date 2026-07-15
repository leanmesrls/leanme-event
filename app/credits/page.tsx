import { CreditsContent } from "@/components/credits/CreditsContent";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCreditsData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = createPageMetadata({
  title: "Credits",
  description:
    "Credits del sito LeanMe: persone, Lean.Agent AI e tecnologie del nostro primo case study.",
  path: "/credits",
});

export default function CreditsPage() {
  const data = getCreditsData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Credits", path: "/credits" },
        ])}
      />
      <PageHero
        id="credits-heading"
        title={data.hero.title}
        subtitle={data.hero.subtitle}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={data.intro} animate={false} />
      </PageSection>
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <CreditsContent data={data} />
      </PageSection>
    </>
  );
}
