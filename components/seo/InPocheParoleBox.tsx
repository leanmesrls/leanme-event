import { FadeIn } from "@/components/motion/FadeIn";

interface InPocheParoleBoxProps {
  paragraphs: string[];
  title?: string;
}

export function InPocheParoleBox({
  paragraphs,
  title = "In poche parole",
}: InPocheParoleBoxProps) {
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <aside
      aria-labelledby="in-poche-parole-heading"
      className="rounded-xl border border-leanme-fuchsia/25 bg-gradient-to-br from-leanme-fuchsia/[0.08] to-black p-6 md:p-8"
    >
      <FadeIn>
        <h2
          id="in-poche-parole-heading"
          className="text-xs font-bold uppercase tracking-[0.12em] text-leanme-fuchsia"
        >
          {title}
        </h2>
        <div className="mt-4 space-y-3">
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-sm leading-relaxed text-white/75"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </FadeIn>
    </aside>
  );
}
