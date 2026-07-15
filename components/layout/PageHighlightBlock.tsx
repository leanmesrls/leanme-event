import { HighlightCard } from "@/components/layout/HighlightCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

interface PageHighlightBlockProps {
  paragraphs: string | string[] | undefined;
  id?: string;
  className?: string;
  animate?: boolean;
}

export function PageHighlightBlock({
  paragraphs,
  id,
  className,
  animate = true,
}: PageHighlightBlockProps) {
  if (!paragraphs) {
    return null;
  }

  const items = (Array.isArray(paragraphs) ? paragraphs : [paragraphs]).filter(
    Boolean
  );

  if (items.length === 0) {
    return null;
  }

  const content = (
    <HighlightCard id={id} className={className}>
      <div className="space-y-4">
        {items.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="text-base leading-relaxed text-white/80 md:text-lg"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </HighlightCard>
  );

  if (!animate) {
    return content;
  }

  return <RevealOnScroll>{content}</RevealOnScroll>;
}
