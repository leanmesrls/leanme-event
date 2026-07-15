import { LegalDocument } from "@/components/legal/LegalDocument";
import { PAGE_CONTENT_AFTER_INTRO_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPrivacyNewsletterData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = createPageMetadata({
  title: "Informativa Newsletter",
  description:
    "Informativa sul trattamento dei dati personali per l'iscrizione alla Newsletter LeanLab di LeanMe S.r.l.s.",
  path: "/privacy-newsletter",
});

export default function PrivacyNewsletterPage() {
  const data = getPrivacyNewsletterData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Informativa Newsletter", path: "/privacy-newsletter" },
        ])}
      />
      <PageHero id="privacy-newsletter-heading" title={data.hero.title} />
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <LegalDocument data={data} />
      </PageSection>
    </>
  );
}
