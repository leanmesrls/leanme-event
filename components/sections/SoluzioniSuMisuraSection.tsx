import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { HomepageData } from "@/types/content";

interface SoluzioniSuMisuraSectionProps {
  data: HomepageData["soluzioniSuMisura"];
}

const slugMap: Record<string, string> = {
  "Voglio nuove idee per la mia azienda o per un mio progetto": "innovare-la-mia-azienda",
  "Voglio un partner per la mia struttura sanitaria": "partner-struttura-sanitaria",
  "Voglio un partner per la mia società scientifica": "partner-societa-scientifica",
  "Voglio un partner per i miei eventi": "partner-eventi",
  "Voglio comunicare meglio": "comunicare-meglio",
};

export function SoluzioniSuMisuraSection({ data }: SoluzioniSuMisuraSectionProps) {
  return (
    <section id={data.id} className="section-padding bg-leanme-black text-white">
      <Container>
        <SectionHeading
          title={data.title}
          subtitle={data.subtitle}
          description={data.description}
          className="text-white [&_p]:text-white/70 [&_h2]:text-white [&_span]:text-leanme-purple"
        />
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item, index) => {
            const slug = slugMap[item.title];
            const href = slug
              ? `/come-possiamo-aiutarti/${slug}`
              : "/come-possiamo-aiutarti";

            return (
              <RevealOnScroll key={item.title} delay={index * 0.08}>
                <Link href={href} className="group block overflow-hidden rounded-2xl bg-white/5 transition-colors hover:bg-white/10">
                  <PlaceholderImage
                    image={item.image}
                    aspectRatio="video"
                    className="rounded-none border-none"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold group-hover:text-leanme-purple">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </RevealOnScroll>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/come-possiamo-aiutarti"
            className="text-sm font-medium text-leanme-purple transition-colors hover:text-white"
          >
            Vedi tutti i percorsi →
          </Link>
        </div>
      </Container>
    </section>
  );
}
