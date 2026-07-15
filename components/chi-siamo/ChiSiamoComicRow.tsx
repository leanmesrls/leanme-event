import Image from "next/image";
import type { ChiSiamoPanel } from "@/types/content";

interface ChiSiamoComicRowProps {
  panels: ChiSiamoPanel[];
  /** Colonne proporzionali alle card originali, es. "368fr 394fr 400fr" */
  columns: string;
  /** Rapporto larghezza totale / altezza riga, es. "1162 / 442" */
  aspectRatio: string;
  sizes?: string;
  objectFit?: "cover" | "contain";
  cellClassName?: string;
}

function ComicCell({
  panel,
  sizes,
  objectFit = "cover",
  className,
}: {
  panel: ChiSiamoPanel;
  sizes: string;
  objectFit?: "cover" | "contain";
  className?: string;
}) {
  return (
    <figure
      id={panel.id}
      className={`relative m-0 h-full min-h-0 w-full overflow-hidden ${className ?? ""}`}
    >
      <Image
        src={panel.image}
        alt={panel.alt}
        fill
        className={
          objectFit === "contain"
            ? "object-contain object-center"
            : "object-cover object-top"
        }
        sizes={sizes}
      />
    </figure>
  );
}

export function ChiSiamoComicRow({
  panels,
  columns,
  aspectRatio,
  sizes = "33vw",
  objectFit = "cover",
  cellClassName,
}: ChiSiamoComicRowProps) {
  return (
    <>
      <div
        className="hidden w-full gap-0 overflow-hidden md:grid"
        style={{ gridTemplateColumns: columns, aspectRatio }}
      >
        {panels.map((panel) => (
          <ComicCell
            key={panel.id}
            panel={panel}
            sizes={sizes}
            objectFit={objectFit}
            className={cellClassName}
          />
        ))}
      </div>

      {/* Mobile — impilate senza spazi */}
      <div className="flex flex-col gap-0 md:hidden">
        {panels.map((panel) => (
          <figure
            key={panel.id}
            id={panel.id}
            className="relative m-0 block w-full leading-none"
          >
            <Image
              src={panel.image}
              alt={panel.alt}
              width={680}
              height={442}
              className="block h-auto w-full"
              sizes="100vw"
            />
          </figure>
        ))}
      </div>
    </>
  );
}

interface ChiSiamoComicFullRowProps {
  panel: ChiSiamoPanel;
  aspectRatio: string;
}

export function ChiSiamoComicFullRow({
  panel,
  aspectRatio,
}: ChiSiamoComicFullRowProps) {
  return (
    <>
      <div
        className="relative hidden w-full overflow-hidden md:block"
        style={{ aspectRatio }}
      >
        <ComicCell panel={panel} sizes="100vw" />
      </div>
      <figure
        id={panel.id}
        className="relative m-0 block w-full leading-none md:hidden"
      >
        <Image
          src={panel.image}
          alt={panel.alt}
          width={1024}
          height={209}
          className="block h-auto w-full"
          sizes="100vw"
        />
      </figure>
    </>
  );
}

/** Riga 1: altezza allineata alla vignetta 3 (1122px) per evitare tagli */
const ROW1_REF_HEIGHT = 1122;
const ROW1_W1 = (1127 * ROW1_REF_HEIGHT) / 1396;
const ROW1_W2 = (1122 * ROW1_REF_HEIGHT) / 1402;
const ROW1_W3 = 1402;
const ROW1_TOTAL_W = ROW1_W1 + ROW1_W2 + ROW1_W3;

/** Proporzioni card HD — allineamento mockup desktop */
export const COMIC_ROW_LAYOUT = {
  row1: {
    columns: `${ROW1_W1}fr ${ROW1_W2}fr ${ROW1_W3}fr`,
    aspectRatio: `${ROW1_TOTAL_W} / ${ROW1_REF_HEIGHT}`,
  },
  row2: { columns: "1174fr 1176fr 1186fr 1178fr", aspectRatio: "4714 / 1339" },
  row3: { columns: "1fr 1fr", aspectRatio: "3072 / 1024" },
  row4: { aspectRatio: "1793 / 877" },
} as const;
