import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/homepage/Icons";
import { PAGE_INTRO_SECTION_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { AgentHomepageCard } from "@/components/lean-agent/AgentCard";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import { getStaffData, getSeoInPocheParole } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Lo Staff Ibrido",
  description:
    "Persone, Lean.Agent e network di specialisti. Lo Staff Ibrido LeanMe mette le persone al centro dell'innovazione.",
  path: "/staff-ibrido",
});

export default function StaffIbridoPage() {
  const staff = getStaffData();
  const summary = getSeoInPocheParole("/staff-ibrido");

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Lo Staff Ibrido", path: "/staff-ibrido" },
        ])}
      />
      <PageHero
        id="staff-heading"
        title={staff.intro.title}
        subtitle={staff.intro.subtitle}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={staff.intro.description} />
        <RevealOnScroll className="mt-6 flex flex-wrap gap-3 md:mt-8">
          <Link
            href="/chi-siamo"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Chi siamo
          </Link>
          <Link
            href="/contatti"
            className="inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Connect
            <ArrowIcon />
          </Link>
        </RevealOnScroll>
      </PageSection>
      <PageSection className="pt-0 md:pt-0">
        <div className="mt-10 md:mt-14">
          <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">
            Persone
          </h2>
          <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
            {staff.people.map((person, index) => (
              <RevealOnScroll key={person.slug} delay={index * 0.06}>
                <Link
                  href={`/chi-siamo/${person.slug}`}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
                >
                  <FuchsiaGlowCard
                    variant="card"
                    className="rounded-xl border border-white/10 bg-[#111111]"
                    contentClassName="flex items-start gap-4 p-4"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
                      <Image
                        src={person.image.src}
                        alt={person.image.alt}
                        fill
                        className="object-cover object-top"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold leading-snug text-white group-hover:text-leanme-fuchsia">
                        {person.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold leading-snug text-leanme-fuchsia">
                        {person.role}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        {person.description}
                      </p>
                    </div>
                  </FuchsiaGlowCard>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        <div className="mt-16" id="network-di-specialisti">
          <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">
            {staff.network.title}
          </h2>
          <p className="mt-4 max-w-3xl text-white/65">{staff.network.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {staff.network.specialists.map((specialist, index) => (
              <RevealOnScroll key={specialist.slug} delay={index * 0.05}>
                <div
                  id={`specialist-${specialist.slug}`}
                  className="scroll-mt-28"
                >
                  <FuchsiaGlowCard
                    variant="card"
                    className="rounded-xl border border-white/10 bg-[#111111] p-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-purple">
                      {specialist.area}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-white">
                      {specialist.name}
                    </h3>
                    <p className="mt-2 text-sm text-white/65">
                      {specialist.description}
                    </p>
                  </FuchsiaGlowCard>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">
            LEAN.AGENT.AI
          </h2>
          <p className="mt-4 max-w-3xl text-white/65">
            Ogni Lean.Agent possiede una pagina dedicata. Non sostituiscono il
            lavoro umano: lo completano, lo accelerano, lo rendono più efficace.
          </p>
          <div className="mt-6 grid grid-cols-2 items-start gap-5 px-2 sm:grid-cols-3 md:grid-cols-4 md:gap-6 xl:grid-cols-7">
            {staff.leanAgents.map((agent, index) => (
              <RevealOnScroll key={agent.slug} delay={index * 0.05}>
                <AgentHomepageCard agent={agent} />
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {summary.length > 0 ? (
          <div className="mt-16">
            <InPocheParoleBox paragraphs={summary} />
          </div>
        ) : null}
      </PageSection>
    </>
  );
}
