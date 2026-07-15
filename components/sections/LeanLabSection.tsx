import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArticleCard } from "@/components/leanlab/ArticleCard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { getLeanLabArticles } from "@/lib/content";
import type { HomepageData } from "@/types/content";

interface LeanLabSectionProps {
  data: HomepageData["leanLab"];
}

export function LeanLabSection({ data }: LeanLabSectionProps) {
  const articles = getLeanLabArticles().slice(0, 3);

  return (
    <section id={data.id} className="section-padding">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            title={data.title}
            subtitle={data.subtitle}
            description={data.description}
          />
          <Button href={data.cta.href} label={data.cta.label} variant="secondary" />
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <RevealOnScroll key={article.slug} delay={index * 0.08}>
              <ArticleCard article={article} />
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
