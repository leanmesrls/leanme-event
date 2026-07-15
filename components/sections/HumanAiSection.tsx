import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeIn } from "@/components/motion/FadeIn";
import type { HomepageData } from "@/types/content";

interface HumanAiSectionProps {
  data: HomepageData["humanAi"];
}

export function HumanAiSection({ data }: HumanAiSectionProps) {
  return (
    <section id={data.id} className="section-padding bg-leanme-gray-50">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <SectionHeading
              title={data.title}
              subtitle={data.subtitle}
              description={data.description}
            />
            <ul className="mt-8 space-y-4">
              {data.content.map((line) => (
                <li
                  key={line}
                  className="border-l-2 border-leanme-purple pl-4 text-lg text-leanme-gray-700"
                >
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button
                href={data.cta.href}
                label={data.cta.label}
                variant="primary"
              />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <PlaceholderImage image={data.image} aspectRatio="square" />
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
