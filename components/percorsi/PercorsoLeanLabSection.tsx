import Link from "next/link";

import { ArrowIcon } from "@/components/homepage/Icons";
import { SectionTitle } from "@/components/homepage/SectionTitle";
import { ArticleCard } from "@/components/leanlab/ArticleCard";
import { PageSection } from "@/components/layout/PageSection";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { getHomepageData, getLeanLabArticlesByTag } from "@/lib/content";

interface PercorsoLeanLabSectionProps {
  tag: string;
}

export function PercorsoLeanLabSection({ tag }: PercorsoLeanLabSectionProps) {
  const leanLab = getHomepageData().leanLab;
  const articles = getLeanLabArticlesByTag(tag);

  if (articles.length === 0) {
    return null;
  }

  return (
    <PageSection className="pt-12 md:pt-16">
      <RevealOnScroll>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <SectionTitle id="percorso-leanlab-heading" align="left" underline={false}>
              {leanLab.title}
            </SectionTitle>
            <p className="text-sm text-white/55">
              Articoli filtrati per tag{" "}
              <span className="font-semibold text-leanme-fuchsia">{tag}</span>
            </p>
          </div>
          <Link
            href={leanLab.viewAll.href}
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia transition hover:text-white md:mb-1"
          >
            {leanLab.viewAll.label}
            <ArrowIcon />
          </Link>
        </div>
      </RevealOnScroll>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articles.map((article, index) => (
          <RevealOnScroll key={article.slug} delay={index * 0.06}>
            <ArticleCard article={article} />
          </RevealOnScroll>
        ))}
      </div>
    </PageSection>
  );
}
