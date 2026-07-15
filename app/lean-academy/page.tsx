import Image from "next/image";
import Link from "next/link";
import { PAGE_CONTENT_AFTER_INTRO_CLASS, PAGE_INTRO_SECTION_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import { getAcademyData, getSeoInPocheParole } from "@/lib/content";
import { ASSETS } from "@/lib/assets";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Lean Academy",
  description:
    "Formazione, guide, tutorial e webinar di LeanMe. Area pubblica e area riservata per corsi premium e certificazioni.",
  path: "/lean-academy",
});

export default function LeanAcademyPage() {
  const data = getAcademyData();
  const summary = getSeoInPocheParole("/lean-academy");

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Lean Academy", path: "/lean-academy" },
        ])}
      />
      <PageHero
        id="lean-academy-heading"
        title={data.intro.title}
        subtitle={data.intro.subtitle}
        background={ASSETS.decorative.leanAcademy}
        imageAlt="Lean Academy — monitor didattico"
        variant="lean-academy"
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={data.intro.description} />
      </PageSection>
      <PageSection className={PAGE_CONTENT_AFTER_INTRO_CLASS}>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">
            {data.publicArea.title}
          </h2>
          <p className="mt-4 max-w-3xl text-white/65">{data.publicArea.description}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {data.publicArea.resources.map((resource, index) => (
              <RevealOnScroll key={resource.slug} delay={index * 0.05}>
                <Link
                  href={`/lean-academy/${resource.slug}`}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
                >
                  <FuchsiaGlowCard
                    variant="card"
                    className="rounded-xl border border-white/10 bg-[#111111]"
                    contentClassName="flex flex-col"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-xl">
                      <Image
                        src={ASSETS.decorative.bannerAmbient}
                        alt={resource.title}
                        fill
                        className="object-cover opacity-80 transition group-hover:opacity-100"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="p-6">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-purple">
                        {resource.type}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-white">{resource.title}</h3>
                      <p className="mt-2 text-sm text-white/60">{resource.description}</p>
                    </div>
                  </FuchsiaGlowCard>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        <FuchsiaGlowCard
          variant="card"
          className="mt-16 rounded-xl border border-white/10 bg-[#111111] p-8 md:p-12"
        >
          <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">
            {data.reservedArea.title}
          </h2>
          <p className="mt-4 max-w-3xl text-white/65">{data.reservedArea.description}</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {data.reservedArea.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-leanme-purple" />
                {feature}
              </li>
            ))}
          </ul>
        </FuchsiaGlowCard>

        {summary.length > 0 ? (
          <div className="mt-16">
            <InPocheParoleBox paragraphs={summary} />
          </div>
        ) : null}
      </PageSection>
    </>
  );
}
