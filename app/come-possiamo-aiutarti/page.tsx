import Link from "next/link";
import { ArrowIcon, ServiceIconBadge } from "@/components/homepage/Icons";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { PercorsoConsultationCta } from "@/components/percorsi/PercorsoConsultationCta";
import { FaqSection } from "@/components/seo/FaqSection";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import {
  getPercorsiData,
  getSeoHubFaq,
  getSeoHubInPocheParole,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema, faqPageSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Come possiamo aiutarti",
  description:
    "Percorsi su misura per innovare la tua azienda, strutture sanitarie, società scientifiche, eventi e comunicazione.",
  path: "/come-possiamo-aiutarti",
});

export default function ComePossiamoAiutartiPage() {
  const data = getPercorsiData();
  const hubFaq = getSeoHubFaq();
  const hubSummary = getSeoHubInPocheParole();
  const path = "/come-possiamo-aiutarti";

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Come possiamo aiutarti", path },
          ]),
          faqPageSchema(hubFaq, path),
        ]}
      />
      <PageHero
        id="percorsi-heading"
        title={data.intro.title}
        subtitle={data.intro.subtitle}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={data.intro.description} />
      </PageSection>
      <PageSection className={`${PAGE_CONTENT_AFTER_INTRO_CLASS} pb-0 md:pb-0`}>
        <PercorsoConsultationCta
          href={data.consultationCta.href}
          label={data.consultationCta.label}
        />
      </PageSection>
      <PageSection className="pt-10 md:pt-12">
        <div className="hidden gap-6 lg:grid lg:grid-cols-5">
          {data.percorsi.map((percorso, index) => (
            <RevealOnScroll key={percorso.slug} delay={index * 0.06}>
              <FuchsiaGlowCard
                variant="card"
                className="flex h-full flex-col rounded-xl border border-white/10 bg-[#111111] p-6"
                contentClassName="flex h-full flex-col"
              >
                <ServiceIconBadge name={percorso.icon} size="md" />
                <h2 className="mt-5 min-h-[4.5rem] text-sm font-bold leading-snug tracking-[0.06em] text-white">
                  {percorso.title.toUpperCase()}
                </h2>
                <p className="mt-3 flex-1 text-sm text-white/60">
                  {percorso.shortDescription}
                </p>
                <Link
                  href={`/come-possiamo-aiutarti/${percorso.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-leanme-purple transition hover:text-white"
                >
                  SCOPRI I SERVIZI
                  <ArrowIcon />
                </Link>
              </FuchsiaGlowCard>
            </RevealOnScroll>
          ))}
        </div>

        <div className="divide-y divide-white/10 lg:hidden">
          {data.percorsi.map((percorso) => (
            <Link
              key={percorso.slug}
              href={`/come-possiamo-aiutarti/${percorso.slug}`}
              className="flex items-center gap-4 py-4 transition hover:bg-white/[0.03]"
            >
              <ServiceIconBadge name={percorso.icon} size="sm" />
              <span className="flex-1 text-xs font-bold leading-snug tracking-[0.05em] text-white">
                {percorso.title.toUpperCase()}
              </span>
              <ArrowIcon className="shrink-0 text-white/40" />
            </Link>
          ))}
        </div>

        <div className="mt-12 md:mt-16">
          <FaqSection items={hubFaq} />
        </div>
        <div className="mt-12">
          <InPocheParoleBox paragraphs={hubSummary} />
        </div>
      </PageSection>
    </>
  );
}
