import { ChiSiamoComicPage } from "@/components/chi-siamo/ChiSiamoComicPage";
import { ChiSiamoHero } from "@/components/chi-siamo/ChiSiamoHero";
import { PageSection } from "@/components/layout/PageSection";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import { getChiSiamoData, getSeoInPocheParole } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Chi siamo",
  description:
    "Persone e Agenti AI, insieme. Scopri la visione LeanMe sull'Azienda Ibrida, il team e il nostro impegno.",
  path: "/chi-siamo",
  image: "/assets/official/reception-render.png",
});

export default function ChiSiamoPage() {
  const data = getChiSiamoData();
  const summary = getSeoInPocheParole("/chi-siamo");

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Chi siamo", path: "/chi-siamo" },
        ])}
      />
      <ChiSiamoHero intro={data.intro} hero={data.hero} />
      <ChiSiamoComicPage
        comic={data.comic}
        team={data.team}
        teaser={data.teaser}
        manifesto={data.manifesto}
      />
      {summary.length > 0 ? (
        <PageSection className="pt-0 md:pt-0">
          <InPocheParoleBox paragraphs={summary} />
        </PageSection>
      ) : null}
    </>
  );
}
