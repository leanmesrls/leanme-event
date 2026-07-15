import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import type { ChiSiamoData } from "@/types/content";

interface ChiSiamoTeaserProps {
  teaser: ChiSiamoData["teaser"];
}

export function ChiSiamoTeaser({ teaser }: ChiSiamoTeaserProps) {
  return <PageHighlightBlock id="teaser" paragraphs={teaser.text} />;
}
