import { FadeIn } from "@/components/motion/FadeIn";
import type { FaqItem } from "@/types/content";

interface FaqSectionProps {
  items: FaqItem[];
  title?: string;
}

export function FaqSection({
  items,
  title = "Domande frequenti",
}: FaqSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="faq-heading" className="border-t border-white/10 pt-12 md:pt-16">
      <FadeIn>
        <h2
          id="faq-heading"
          className="text-sm font-bold uppercase tracking-[0.1em] text-white"
        >
          {title}
        </h2>
      </FadeIn>
      <div className="mt-8 divide-y divide-white/10">
        {items.map((item, index) => (
          <FadeIn key={item.question} delay={index * 0.04}>
            <details className="group py-5">
              <summary className="cursor-pointer list-none text-base font-semibold leading-snug text-white transition hover:text-leanme-fuchsia [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-lg text-white/40 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70">
                {item.answer}
              </p>
            </details>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
