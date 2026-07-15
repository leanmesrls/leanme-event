import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { HomepageData } from "@/types/content";

interface MetodoLeanMeSectionProps {
  data: HomepageData["metodoLeanMe"];
}

export function MetodoLeanMeSection({ data }: MetodoLeanMeSectionProps) {
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
        <div className="mt-16 space-y-0">
          {data.steps.map((step, index) => (
            <RevealOnScroll key={step.number} delay={index * 0.06}>
              <div className="grid gap-4 border-t border-leanme-black/10 py-8 md:grid-cols-[80px_1fr_2fr] md:items-start">
                <span className="font-mono text-sm font-medium text-leanme-purple">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-leanme-gray-600">{step.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
