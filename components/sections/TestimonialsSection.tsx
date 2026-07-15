import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import type { Testimonial } from "@/types/content";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  showAllLink?: boolean;
}

export function TestimonialsSection({
  testimonials,
  title = "Dicono di noi",
  subtitle = "Testimonials",
  showAllLink = true,
}: TestimonialsSectionProps) {
  return (
    <section id="testimonials" className="section-padding">
      <Container>
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <RevealOnScroll key={item.id} delay={index * 0.08}>
              <figure className="flex h-full flex-col rounded-2xl border border-leanme-black/5 bg-white p-8 shadow-sm">
                <blockquote className="flex-1 text-lg leading-relaxed text-leanme-gray-700">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-4 border-t border-leanme-black/5 pt-6">
                  {item.image && (
                    <PlaceholderImage
                      image={item.image}
                      aspectRatio="square"
                      className="h-14 w-14 shrink-0 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-leanme-gray-500">
                      {[item.role, item.company].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </RevealOnScroll>
          ))}
        </div>
        {showAllLink && (
          <div className="mt-10">
            <Link
              href="/dicono-di-noi"
              className="text-sm font-medium text-leanme-purple transition-colors hover:text-leanme-black"
            >
              Tutte le testimonianze →
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
