import { NewsletterFormEmbed } from "@/components/newsletter/NewsletterFormEmbed";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { FadeIn } from "@/components/motion/FadeIn";
import { getNewsletterData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Newsletter",
  description:
    "Iscriviti alla newsletter LeanMe. Aggiornamenti dal LeanLab, innovazione, Intelligenza Artificiale e novità dall'ecosistema LeanMe.",
  path: "/newsletter",
});

export default function NewsletterPage() {
  const data = getNewsletterData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Newsletter", path: "/newsletter" },
        ])}
      />
      <PageHero
        id="newsletter-heading"
        title={data.intro.title}
        subtitle={data.intro.subtitle}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={data.introBlocks} />
      </PageSection>
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <FadeIn>
          <NewsletterFormEmbed form={data.form} />
        </FadeIn>
      </PageSection>
    </>
  );
}
