import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { HomepageData } from "@/types/content";

interface CaseStudiesSectionProps {
  data: HomepageData["caseStudies"];
}

export function CaseStudiesSection({ data }: CaseStudiesSectionProps) {
  return (
    <section id={data.id} className="section-padding bg-leanme-gray-50">
      <Container>
        <SectionHeading
          title={data.title}
          subtitle={data.subtitle}
          description={data.description}
        />
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {data.items.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 0.08}>
              <a
                href={item.href}
                className="group block overflow-hidden rounded-2xl bg-white shadow-card transition-shadow hover:shadow-card-hover"
              >
                <PlaceholderImage image={item.image} aspectRatio="wide" className="rounded-none border-none" />
                <div className="p-8">
                  <p className="text-sm font-medium text-leanme-purple">{item.client}</p>
                  <h3 className="mt-2 text-2xl font-semibold group-hover:text-leanme-purple">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-leanme-gray-600">{item.description}</p>
                </div>
              </a>
            </RevealOnScroll>
          ))}
        </div>
        <div className="mt-10">
          <Button href={data.cta.href} label={data.cta.label} variant="secondary" />
        </div>
      </Container>
    </section>
  );
}
