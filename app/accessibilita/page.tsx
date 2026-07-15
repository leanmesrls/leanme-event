import { LegalDocument } from "@/components/legal/LegalDocument";
import { PAGE_CONTENT_AFTER_INTRO_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAccessibilityData } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = createPageMetadata({
  title: "Dichiarazione di Accessibilità",
  description:
    "Dichiarazione di accessibilità del sito LeanMe S.r.l.s. conforme alle WCAG 2.2 e al European Accessibility Act (EAA).",
  path: "/accessibilita",
});

export default function AccessibilitaPage() {
  const data = getAccessibilityData();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Dichiarazione di Accessibilità", path: "/accessibilita" },
        ])}
      />
      <PageHero
        id="accessibilita-heading"
        title={data.hero.title}
        subtitle={data.hero.subtitle}
      />
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <LegalDocument data={data} />
      </PageSection>
    </>
  );
}
