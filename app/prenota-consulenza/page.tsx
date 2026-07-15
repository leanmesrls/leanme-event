import { JotFormEmbed } from "@/components/forms/JotFormEmbed";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { FadeIn } from "@/components/motion/FadeIn";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import { getPrenotaConsulenzaData, getSeoInPocheParole } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Prenota consulenza",
  description:
    "Prenota una dimostrazione o una consulenza gratuita di 30 minuti con LeanMe.",
  path: "/prenota-consulenza",
});

export default function PrenotaConsulenzaPage() {
  const data = getPrenotaConsulenzaData();
  const summary = getSeoInPocheParole("/prenota-consulenza");
  const hasEmbed = Boolean(data.form.iframeId && data.form.src);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Prenota consulenza", path: "/prenota-consulenza" },
        ])}
      />
      <PageHero
        id="prenota-consulenza-heading"
        title={data.intro.title}
        subtitle={data.intro.subtitle}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={data.introBlocks} />
      </PageSection>
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <FadeIn>
          {hasEmbed ? (
            <JotFormEmbed form={data.form} />
          ) : (
            <div className="flex min-h-[320px] flex-col justify-center rounded-xl border border-white/10 bg-[#111111] p-8 text-center md:p-10">
              <h2 className="text-lg font-bold text-white">{data.form.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
                Modulo di prenotazione in configurazione.
              </p>
            </div>
          )}
        </FadeIn>
        {summary.length > 0 ? (
          <div className="mt-12">
            <InPocheParoleBox paragraphs={summary} />
          </div>
        ) : null}
      </PageSection>
    </>
  );
}
