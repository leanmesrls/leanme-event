import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/homepage/Icons";
import { PageSection } from "@/components/layout/PageSection";
import { VisibleBreadcrumb } from "@/components/layout/VisibleBreadcrumb";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  getAcademyData,
  getAllAcademyResourceSlugs,
} from "@/lib/content";
import { ASSETS } from "@/lib/assets";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import Image from "next/image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllAcademyResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const resource = getAcademyData().publicArea.resources.find(
    (r) => r.slug === slug
  );

  if (!resource) {
    return createPageMetadata({
      title: "Risorsa non trovata",
      description: "La risorsa richiesta non esiste.",
      path: `/lean-academy/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: resource.title,
    description: resource.description,
    path: `/lean-academy/${slug}`,
    image: ASSETS.decorative.bannerAmbient,
  });
}

export default async function AcademyResourcePage({ params }: PageProps) {
  const { slug } = await params;
  const resource = getAcademyData().publicArea.resources.find(
    (r) => r.slug === slug
  );

  if (!resource) {
    notFound();
  }

  const path = `/lean-academy/${slug}`;
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Lean Academy", path: "/lean-academy" },
    { name: resource.title, path },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbItems)} />
      <VisibleBreadcrumb items={breadcrumbItems} />
      <PageSection>
        <FadeIn>
          <Link
            href="/lean-academy"
            className="mb-6 inline-block text-xs font-semibold uppercase tracking-[0.1em] text-leanme-purple transition hover:text-white"
          >
            ← Lean Academy
          </Link>
          <span className="inline-block rounded-full border border-leanme-purple/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-purple">
            {resource.type}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            {resource.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-white/65">{resource.description}</p>
          <div className="relative mt-10 aspect-[21/9] overflow-hidden rounded-xl border border-white/10">
            <Image
              src={ASSETS.decorative.bannerAmbient}
              alt={resource.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <Link
            href="/contatti"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-leanme-purple px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-purple/90"
          >
            Richiedi informazioni
            <ArrowIcon />
          </Link>
        </FadeIn>
      </PageSection>
    </>
  );
}
