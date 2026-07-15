import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { HomepageData } from "@/types/content";

interface PercorsiTrasformazioneSectionProps {
  data: HomepageData["percorsiTrasformazione"];
}

export function PercorsiTrasformazioneSection({
  data,
}: PercorsiTrasformazioneSectionProps) {
  return (
    <section id={data.id} className="section-padding">
      <Container>
        <SectionHeading
          title={data.title}
          subtitle={data.subtitle}
          description={data.description}
          align="center"
          className="mx-auto"
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {data.items.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 0.08}>
              <div className="h-full rounded-2xl border border-leanme-black/5 bg-white p-8 shadow-sm transition-shadow duration-500 hover:shadow-card">
                <div className="mb-5 inline-flex rounded-full bg-leanme-purple/10 p-3 text-leanme-purple">
                  <Icon name={item.icon} className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-leanme-gray-600">{item.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
