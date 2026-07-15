import Image from "next/image";
import { notFound } from "next/navigation";

import { ServiceIconBadge } from "@/components/homepage/Icons";
import {
  PAGE_CONTENT_AFTER_INTRO_CLASS,
  PAGE_INTRO_SECTION_CLASS,
} from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { VisibleBreadcrumb } from "@/components/layout/VisibleBreadcrumb";
import { FadeIn } from "@/components/motion/FadeIn";
import { PercorsoConsultationCta } from "@/components/percorsi/PercorsoConsultationCta";
import { PercorsoLeanLabSection } from "@/components/percorsi/PercorsoLeanLabSection";
import { PercorsoVignettes } from "@/components/percorsi/PercorsoVignettes";
import { FaqSection } from "@/components/seo/FaqSection";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import {
  getAllPercorsoSlugs,
  getPercorsoBySlug,
  getPercorsiData,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  serviceSchema,
} from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ percorso: string }>;
}

function percorsoDescriptionText(description: string | string[]): string {
  return Array.isArray(description) ? description.join(" ") : description;
}

export async function generateStaticParams() {
  return getAllPercorsoSlugs().map((percorso) => ({ percorso }));
}

export async function generateMetadata({ params }: PageProps) {
  const { percorso: slug } = await params;
  const percorso = getPercorsoBySlug(slug);

  if (!percorso) {
    return createPageMetadata({
      title: "Percorso non trovato",
      description: "Il percorso richiesto non esiste.",
      path: `/come-possiamo-aiutarti/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: percorso.title,
    description: percorso.shortDescription,
    path: `/come-possiamo-aiutarti/${slug}`,
    image: percorso.image.src,
  });
}

export default async function PercorsoPage({ params }: PageProps) {
  const { percorso: slug } = await params;
  const percorso = getPercorsoBySlug(slug);
  const { consultationCta } = getPercorsiData();

  if (!percorso) {
    notFound();
  }

  const path = `/come-possiamo-aiutarti/${slug}`;
  const vignettes = percorso.vignettes ?? [];
  const showLegacyLayout = !percorso.leanLabTag && vignettes.length === 0;
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Come possiamo aiutarti", path: "/come-possiamo-aiutarti" },
    { name: percorso.title, path },
  ];
  const structuredData = [
    breadcrumbSchema(breadcrumbItems),
    serviceSchema({
      name: percorso.title,
      description: percorsoDescriptionText(percorso.description),
      path,
    }),
    ...(percorso.faq?.length
      ? [faqPageSchema(percorso.faq, path)]
      : []),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <VisibleBreadcrumb items={breadcrumbItems} />
      <PageHero
        id="percorso-heading"
        title={percorso.title}
        subtitle={percorso.shortDescription}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={percorso.description} />
      </PageSection>

      <PageSection className={`${PAGE_CONTENT_AFTER_INTRO_CLASS} pb-0 md:pb-0`}>
        <PercorsoConsultationCta
          href={consultationCta.href}
          label={consultationCta.label}
        />
      </PageSection>

      {vignettes.length > 0 ? (
        <PercorsoVignettes
          vignettes={vignettes}
          showArrowBetweenColumns={percorso.vignetteArrowBetween}
        />
      ) : null}

      {showLegacyLayout ? (
        <PageSection className="pt-10 md:pt-12">
          <div className="grid gap-12 lg:grid-cols-2">
            <FadeIn>
              <ServiceIconBadge name={percorso.icon} size="lg" className="mb-4" />
              <ul className="space-y-3">
                {percorso.services?.map((service) => (
                  <li
                    key={service}
                    className="flex items-start gap-3 text-white/75"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leanme-purple" />
                    {service}
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={percorso.image.src}
                  alt={percorso.image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
          </div>
        </PageSection>
      ) : null}

      {percorso.leanLabTag ? (
        <PercorsoLeanLabSection tag={percorso.leanLabTag} />
      ) : null}

      {percorso.faq?.length || percorso.inPocheParole?.length ? (
        <PageSection className="pt-10 md:pt-12">
          {percorso.faq?.length ? (
            <FaqSection items={percorso.faq} />
          ) : null}
          {percorso.inPocheParole?.length ? (
            <div className={percorso.faq?.length ? "mt-12" : undefined}>
              <InPocheParoleBox paragraphs={percorso.inPocheParole} />
            </div>
          ) : null}
        </PageSection>
      ) : null}
    </>
  );
}
