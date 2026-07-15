"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowIcon } from "@/components/homepage/Icons";
import { SectionTitle } from "@/components/homepage/SectionTitle";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { LeanLabArticle } from "@/types/content";
import type { HomepageData } from "@/types/homepage";
import { ASSETS } from "@/lib/assets";

interface LeanLabCarouselProps {
  data: HomepageData["leanLab"];
  articles: LeanLabArticle[];
  compactTop?: boolean;
  showNewsletterCta?: boolean;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  "progetti-conclusi": "PROGETTO",
  "ricerca-e-innovazione": "RICERCA",
  "vita-in-leanme": "VITA IN LEANME",
  tutorial: "ACADEMY",
};

function ArticleCard({ article }: { article: LeanLabArticle }) {
  const imageSrc = article.image?.src ?? ASSETS.decorative.bannerAmbient;

  return (
    <Link
      href={`/leanlab/articolo/${article.slug}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
    >
      <FuchsiaGlowCard
        variant="card"
        className="leanlab-article-card flex flex-col rounded-lg border border-white/[0.08] bg-leanme-card"
        contentClassName="flex flex-col"
      >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="leanlab-article-card-media absolute inset-0">
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        </div>
        <div className="leanlab-article-card-overlay pointer-events-none absolute inset-0 z-[1]" />
      </div>
      <div className="flex flex-1 flex-col space-y-2 p-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia">
          {categoryLabels[article.category] ?? "ARTICOLO"}
        </span>
        <h3 className="min-h-[2.75rem] flex-1 text-sm font-semibold leading-snug text-white">
          {article.title}
        </h3>
        <p className="text-xs text-white/45">{article.readTime} di lettura</p>
      </div>
      </FuchsiaGlowCard>
    </Link>
  );
}

export function LeanLabCarousel({
  data,
  articles,
  compactTop = false,
  showNewsletterCta = true,
  className,
}: LeanLabCarouselProps) {
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState(data.tabs[0]?.id ?? "progetti");
  const [page, setPage] = useState(0);

  const activeCategory = data.tabs.find((tab) => tab.id === activeTab)?.category;
  const filtered = useMemo(
    () => articles.filter((article) => article.category === activeCategory),
    [articles, activeCategory]
  );

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);

  function selectTab(id: string) {
    setActiveTab(id);
    setPage(0);
  }

  return (
    <section
      aria-labelledby="leanlab-heading"
      className={cn(
        "bg-black px-5 md:px-10 lg:px-16",
        compactTop
          ? "pb-16 pt-6 md:pb-20 md:pt-8 lg:pb-24 lg:pt-10"
          : "section-padding",
        className
      )}
    >
      <div className="mx-auto max-w-[1440px]">
        <RevealOnScroll>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <SectionTitle id="leanlab-heading" align="left" underline={false}>
                {data.title}
              </SectionTitle>
              {showNewsletterCta ? (
                <div className="mt-4">
                  <Link
                    href={data.newsletter.href}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-leanme-fuchsia px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-leanme-fuchsia-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia md:text-[11px]"
                  >
                    {data.newsletter.label}
                    <ArrowIcon />
                  </Link>
                </div>
              ) : null}
            </div>
            <Link
              href={data.viewAll.href}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia transition hover:text-white md:mt-1 md:shrink-0"
            >
              {data.viewAll.label}
              <ArrowIcon />
            </Link>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <div
            role="tablist"
            aria-label="Categorie LeanLab"
            className="mt-8 flex gap-5 overflow-x-auto border-b border-white/[0.08] pb-0 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-8 [&::-webkit-scrollbar]:hidden"
          >
            {data.tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "relative shrink-0 pb-3 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 md:text-[11px]",
                    isActive ? "text-white" : "text-white/45 hover:text-white/75"
                  )}
                >
                  {tab.label}
                  {isActive &&
                    (reducedMotion ? (
                      <span
                        className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-leanme-fuchsia"
                        aria-hidden="true"
                      />
                    ) : (
                      <motion.span
                        layoutId="leanlab-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-leanme-fuchsia"
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      />
                    ))}
                </button>
              );
            })}
          </div>
        </RevealOnScroll>

        <div className="relative mt-8 md:mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${page}`}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
              className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 lg:gap-5"
            >
              {visible.map((article, index) => (
                <RevealOnScroll key={article.slug} delay={index * 0.06}>
                  <ArticleCard article={article} />
                </RevealOnScroll>
              ))}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${page}-mobile`}
              initial={reducedMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
              className="md:hidden"
            >
              {visible[0] && <ArticleCard article={visible[0]} />}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Pagina ${index + 1}`}
                aria-current={page === index ? "true" : undefined}
                onClick={() => setPage(index)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all duration-300",
                  page === index
                    ? "scale-125 bg-leanme-fuchsia"
                    : "bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pointer-events-none absolute inset-y-0 hidden w-full items-center justify-between lg:flex">
              <button
                type="button"
                aria-label="Articoli precedenti"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="pointer-events-auto rounded-full border border-white/20 bg-black/80 px-3 py-2 text-lg text-white transition hover:border-leanme-fuchsia disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Articoli successivi"
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                disabled={page >= totalPages - 1}
                className="pointer-events-auto rounded-full border border-white/20 bg-black/80 px-3 py-2 text-lg text-white transition hover:border-leanme-fuchsia disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
