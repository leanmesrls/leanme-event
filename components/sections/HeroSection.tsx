import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { FadeIn } from "@/components/motion/FadeIn";
import type { HomepageData } from "@/types/content";

interface HeroSectionProps {
  data: HomepageData["hero"];
}

export function HeroSection({ data }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-title" className="relative min-h-[90vh]">
      <div className="grid min-h-[90vh] lg:grid-cols-2">
        <Container className="flex flex-col justify-center py-20 lg:py-28">
          <FadeIn>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-leanme-purple">
              {data.subtitle}
            </p>
            <h1
              id="hero-title"
              className="text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl"
            >
              {data.title}
            </h1>
            <p className="mt-4 text-lg font-medium text-leanme-purple">
              {data.claim}
            </p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-leanme-gray-600">
              {data.description}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                href={data.primaryCta.href}
                label={data.primaryCta.label}
                variant="primary"
              />
              <Button
                href={data.secondaryCta.href}
                label={data.secondaryCta.label}
                variant="secondary"
              />
            </div>
          </FadeIn>
        </Container>
        <FadeIn delay={0.15} className="relative min-h-[50vh] lg:min-h-full">
          <PlaceholderImage
            image={data.image}
            aspectRatio="auto"
            className="h-full min-h-[50vh] rounded-none lg:min-h-full"
          />
        </FadeIn>
      </div>
    </section>
  );
}
