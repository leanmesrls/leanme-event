import { PageHighlightBlock } from "@/components/layout/PageHighlightBlock";
import type { ContactData } from "@/types/content";

interface ContattiIntroProps {
  blocks: ContactData["introBlocks"];
}

export function ContattiIntro({ blocks }: ContattiIntroProps) {
  return <PageHighlightBlock id="contatti-intro" paragraphs={blocks} />;
}
