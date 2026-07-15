import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChiSiamoPersonProfile } from "@/components/chi-siamo/ChiSiamoPersonProfile";
import { ArrowIcon } from "@/components/homepage/Icons";
import { PAGE_INTRO_SECTION_CLASS } from "@/components/layout/HighlightCard";
import { PageHero } from "@/components/layout/PageHero";
import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import { PageSection } from "@/components/layout/PageSection";
import { VisibleBreadcrumb } from "@/components/layout/VisibleBreadcrumb";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  getAllChiSiamoPersonSlugs,
  getChiSiamoPersonBySlug,
} from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema, personSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function honorificPrefix(name: string): string | undefined {
  if (name.startsWith("Dr. ")) return "Dr.";
  if (name.startsWith("Ing. ")) return "Ing.";
  return undefined;
}

function buildFounderStructuredData(
  person: NonNullable<ReturnType<typeof getChiSiamoPersonBySlug>>,
  path: string
) {
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Chi siamo", path: "/chi-siamo" },
    { name: person.name, path },
  ];

  return {
    breadcrumbItems,
    jsonLd: [
      breadcrumbSchema(breadcrumbItems),
      personSchema({
        name: person.name,
        jobTitle: person.role,
        description: person.tagline,
        path,
        image: person.image,
        knowsAbout: person.profile?.pillars,
        alumniOf: person.profile?.identity.background,
        honorificPrefix: honorificPrefix(person.name),
      }),
    ],
  };
}

export async function generateStaticParams() {
  return getAllChiSiamoPersonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const person = getChiSiamoPersonBySlug(slug);

  if (!person) {
    return createPageMetadata({
      title: "Profilo non trovato",
      description: "Il profilo richiesto non esiste.",
      path: `/chi-siamo/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${person.name} — ${person.role}`,
    description: person.tagline,
    path: `/chi-siamo/${slug}`,
    image: person.image,
  });
}

function SimplePersonProfile({
  person,
  path,
}: {
  person: NonNullable<ReturnType<typeof getChiSiamoPersonBySlug>>;
  path: string;
}) {
  const { breadcrumbItems, jsonLd } = buildFounderStructuredData(person, path);

  return (
    <>
      <JsonLd data={jsonLd} />
      <VisibleBreadcrumb items={breadcrumbItems} />
      <PageHero
        id="chi-siamo-person-heading"
        title={person.name}
        subtitle={person.role}
      />
      <PageSection className={PAGE_INTRO_SECTION_CLASS}>
        <PageHighlightBlock paragraphs={[person.tagline, ...person.bio]} />
      </PageSection>
      <PageSection className="pt-0 md:pt-0">
        <FadeIn>
          <Link
            href="/chi-siamo"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/50 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Torna a Chi siamo
          </Link>
        </FadeIn>

        <FadeIn delay={0.08} className="mt-10 max-w-sm">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Image
              src={person.image}
              alt={person.name}
              width={720}
              height={900}
              className="h-auto w-full object-cover object-top"
              priority
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          </div>
          <Link
            href="/contatti"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark md:text-xs"
          >
            Connect
            <ArrowIcon />
          </Link>
        </FadeIn>
      </PageSection>
    </>
  );
}

export default async function ChiSiamoPersonPage({ params }: PageProps) {
  const { slug } = await params;
  const person = getChiSiamoPersonBySlug(slug);

  if (!person) {
    notFound();
  }

  const path = `/chi-siamo/${slug}`;
  const { breadcrumbItems, jsonLd } = buildFounderStructuredData(person, path);

  if (person.profile) {
    return (
      <>
        <JsonLd data={jsonLd} />
        <VisibleBreadcrumb items={breadcrumbItems} />
        <ChiSiamoPersonProfile person={person} />
      </>
    );
  }

  return <SimplePersonProfile person={person} path={path} />;
}
