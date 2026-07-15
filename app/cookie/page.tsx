import { LegalDocument } from "@/components/legal/LegalDocument";
import { PAGE_CONTENT_AFTER_INTRO_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCookiePolicyData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = createPageMetadata({
  title: "Cookie Policy",
  description:
    "Informativa sui cookie del sito LeanMe S.r.l.s. Categorie, servizi di terze parti e gestione del consenso.",
  path: "/cookie",
});

export default function CookiePage() {
  const data = getCookiePolicyData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Cookie Policy", path: "/cookie" },
        ])}
      />
      <PageHero id="cookie-heading" title={data.hero.title} />
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <LegalDocument data={data} />
      </PageSection>
    </>
  );
}
