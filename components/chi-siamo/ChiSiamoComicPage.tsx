import Link from "next/link";

import {
  ChiSiamoComicFullRow,
  ChiSiamoComicRow,
  COMIC_ROW_LAYOUT,
} from "@/components/chi-siamo/ChiSiamoComicRow";
import { ChiSiamoManifesto } from "@/components/chi-siamo/ChiSiamoManifesto";
import { ChiSiamoTeaser } from "@/components/chi-siamo/ChiSiamoTeaser";
import { ChiSiamoTeamGrid } from "@/components/chi-siamo/ChiSiamoTeamGrid";
import { ArrowIcon } from "@/components/homepage/Icons";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { ChiSiamoData } from "@/types/content";



interface ChiSiamoComicPageProps {

  comic: ChiSiamoData["comic"];

  team: ChiSiamoData["team"];

  teaser: ChiSiamoData["teaser"];

  manifesto: ChiSiamoData["manifesto"];

}



export function ChiSiamoComicPage({

  comic,

  team,

  teaser,

  manifesto,

}: ChiSiamoComicPageProps) {

  const [impegno] = comic.row4;



  return (

    <section

      aria-label="Fumetto Chi siamo LeanMe"

      className="bg-black px-5 py-6 md:px-10 md:py-8 lg:px-16"

    >

      <div className="mx-auto flex max-w-[1440px] flex-col gap-0">

        <div className="mb-4 md:mb-6">
          <ChiSiamoTeaser teaser={teaser} />
        </div>

        <RevealOnScroll className="mb-6 flex flex-wrap gap-3 md:mb-8">
          <Link
            href="/staff-ibrido"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Lo Staff Ibrido
          </Link>
          <Link
            href="/contatti"
            className="inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Connect
            <ArrowIcon />
          </Link>
        </RevealOnScroll>

        <ChiSiamoComicRow
          panels={comic.row1}
          columns={COMIC_ROW_LAYOUT.row1.columns}
          aspectRatio={COMIC_ROW_LAYOUT.row1.aspectRatio}
        />



        <ChiSiamoTeamGrid team={team} />



        <ChiSiamoComicRow

          panels={comic.row3}

          columns={COMIC_ROW_LAYOUT.row3.columns}

          aspectRatio={COMIC_ROW_LAYOUT.row3.aspectRatio}

          sizes="50vw"

        />



        {impegno && (

          <ChiSiamoComicFullRow

            panel={impegno}

            aspectRatio={COMIC_ROW_LAYOUT.row4.aspectRatio}

          />

        )}



        <div className="mt-4 md:mt-6">

          <ChiSiamoManifesto manifesto={manifesto} />

        </div>

      </div>

    </section>

  );

}


