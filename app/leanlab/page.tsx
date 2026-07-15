import { LeanLabCarousel } from "@/components/homepage/LeanLabCarousel";
import { LeanLabIntro } from "@/components/leanlab/LeanLabIntro";
import { LeanLabNewsletterCta } from "@/components/leanlab/LeanLabNewsletterCta";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import {
  getHomepageData,
  getLeanLabArticles,
  getLeanLabPageData,
  getSeoInPocheParole,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Dal LeanLab",
  description:
    "Il blog ufficiale LeanMe. Progetti conclusi, ricerca, vita in LeanMe e tutorial dal laboratorio di innovazione.",
  path: "/leanlab",
});

export default function LeanLabPage() {
  const homepage = getHomepageData();
  const articles = getLeanLabArticles();
  const pageData = getLeanLabPageData();
  const summary = getSeoInPocheParole("/leanlab");

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Dal LeanLab", path: "/leanlab" },
        ])}
      />
      <PageHero
        id="leanlab-heading"
        title="Dal LeanLab"
        subtitle={pageData.pageIntro.subtitle}
      />
      {pageData.pageIntro.descriptions.length > 0 && (
        <PageSection className={PAGE_INTRO_SECTION_CLASS}>
          <PageHighlightBlock paragraphs={pageData.pageIntro.descriptions} />
        </PageSection>
      )}
      <PageSection className={`${PAGE_CONTENT_AFTER_INTRO_CLASS} pb-0 md:pb-0`}>
        <LeanLabNewsletterCta
          href={homepage.leanLab.newsletter.href}
          label={homepage.leanLab.newsletter.label}
        />
      </PageSection>
      <LeanLabCarousel
        data={homepage.leanLab}
        articles={articles}
        compactTop
        showNewsletterCta={false}
      />
      <section
        aria-label="Guida alle categorie LeanLab"
        className="bg-black px-5 pb-16 md:px-10 md:pb-20 lg:px-16"
      >
        <div className="mx-auto max-w-[1440px] -mt-6 md:-mt-10">
          <LeanLabIntro intro={pageData.intro} />
          {summary.length > 0 ? (
            <div className="mt-12">
              <InPocheParoleBox paragraphs={summary} />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
