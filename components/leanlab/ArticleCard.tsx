"use client";

import Image from "next/image";
import Link from "next/link";
import { ASSETS } from "@/lib/assets";
import { FuchsiaGlowCard } from "@/components/motion/FuchsiaGlowCard";
import type { LeanLabArticle } from "@/types/content";

interface ArticleCardProps {
  article: LeanLabArticle;
}

const categoryLabels: Record<string, string> = {
  "progetti-conclusi": "PROGETTO",
  "ricerca-e-innovazione": "RICERCA",
  "vita-in-leanme": "VITA IN LEANME",
  tutorial: "ACADEMY",
};

export function ArticleCard({ article }: ArticleCardProps) {
  const imageSrc = article.image.src.startsWith("/assets/")
    ? article.image.src
    : ASSETS.decorative.bannerAmbient;

  return (
    <Link
      href={`/leanlab/articolo/${article.slug}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
    >
      <FuchsiaGlowCard
        variant="card"
        className="flex flex-col rounded-xl border border-white/10 bg-[#111111]"
        contentClassName="flex flex-col"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
          <Image
            src={imageSrc}
            alt={article.image.alt}
            fill
            className="object-cover opacity-80 transition group-hover:opacity-100"
            sizes="(max-width: 1280px) 33vw, 320px"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-transparent transition-colors duration-300 group-hover:bg-leanme-fuchsia/20" />
        </div>
        <div className="space-y-3 p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-purple">
            {categoryLabels[article.category] ?? article.category}
          </span>
          <h3 className="min-h-[3rem] text-sm font-semibold leading-snug text-white">
            {article.title}
          </h3>
          <p className="text-xs text-white/50">{article.readTime} di lettura</p>
        </div>
      </FuchsiaGlowCard>
    </Link>
  );
}
