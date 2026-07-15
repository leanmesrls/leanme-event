import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeIn } from "@/components/motion/FadeIn";
import type { HomepageData } from "@/types/content";

interface CtaSectionProps {
  data: HomepageData["cta"];
}

export function CtaSection({ data }: CtaSectionProps) {
  return (
    <section id={data.id} className="section-padding">
      <Container>
        <FadeIn>
          <div className="rounded-3xl gradient-purple px-8 py-16 text-center text-white md:px-16">
            <SectionHeading
              title={data.title}
              subtitle={data.subtitle}
              description={data.description}
              align="center"
              className="mx-auto [&_h2]:text-white [&_p]:text-white/80 [&_span]:text-white/70"
            />
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                href={data.primaryCta.href}
                label={data.primaryCta.label}
                variant="secondary"
                className="border-white/20 bg-white text-leanme-purple hover:bg-white/90"
              />
              <Button
                href={data.secondaryCta.href}
                label={data.secondaryCta.label}
                variant="ghost"
                className="text-white hover:text-white/80"
              />
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
