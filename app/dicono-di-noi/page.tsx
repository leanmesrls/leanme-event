import { TestimonialsPartnersSection } from "@/components/homepage/TestimonialsPartnersSection";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import {
  getDiconoDiNoiData,
  getHomepageData,
  getPartnerLogos,
  getSeoInPocheParole,
  getTestimonials,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Dicono di noi",
  description:
    "Testimonianze di clienti e partner che hanno scelto LeanMe per innovare con l'Azienda Ibrida.",
  path: "/dicono-di-noi",
});

export default function DiconoDiNoiPage() {
  const pageData = getDiconoDiNoiData();
  const testimonials = getTestimonials();
  const homepage = getHomepageData();
  const partnerLogos = getPartnerLogos();
  const summary = getSeoInPocheParole("/dicono-di-noi");

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Dicono di noi", path: "/dicono-di-noi" },
        ])}
      />
      <PageHero
        id="dicono-di-noi-heading"
        title={pageData.intro.title}
        subtitle={pageData.intro.subtitle}
      />
      <TestimonialsPartnersSection
        testimonials={testimonials}
        testimonialsData={homepage.testimonials}
        partnersData={homepage.partners}
        partnerLogos={partnerLogos}
      />
      {summary.length > 0 ? (
        <PageSection className="pt-0 md:pt-0">
          <InPocheParoleBox paragraphs={summary} />
        </PageSection>
      ) : null}
    </>
  );
}
