import { LegalDocument } from "@/components/legal/LegalDocument";
import { PAGE_CONTENT_AFTER_INTRO_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPrivacyData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Informativa sul trattamento dei dati personali di LeanMe S.r.l.s. ai sensi del GDPR.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const data = getPrivacyData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
      <PageHero id="privacy-heading" title={data.hero.title} />
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <LegalDocument data={data} />
      </PageSection>
    </>
  );
}
