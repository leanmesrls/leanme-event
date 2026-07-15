import Image from "next/image";
import Link from "next/link";

import { ArrowIcon } from "@/components/homepage/Icons";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { cn } from "@/lib/utils";
import type { ChiSiamoPerson } from "@/types/content";

interface ChiSiamoPersonProfileProps {
  person: ChiSiamoPerson;
}

function ProfileSection({
  title,
  children,
  className,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <section
        className={cn(
          "rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8",
          className
        )}
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </section>
    </RevealOnScroll>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 py-3 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white">{value}</p>
    </div>
  );
}

function NarrativeBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph.slice(0, 48)}
          className="text-sm leading-relaxed text-white/75 md:text-base"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function ChiSiamoPersonProfile({ person }: ChiSiamoPersonProfileProps) {
  const profile = person.profile;
  if (!profile) {
    return null;
  }

  const quote = profile.quote ?? person.tagline;

  return (
    <div className="bg-black text-white">
      <section
        aria-labelledby="chi-siamo-person-heading"
        className="border-b border-white/10 bg-black"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia md:text-sm">
            {profile.identity.title}
          </p>
          <h1
            id="chi-siamo-person-heading"
            className="mt-3 text-3xl font-bold tracking-[0.04em] text-white md:text-4xl lg:text-[2.75rem] lg:leading-tight"
          >
            {person.name}
          </h1>
          <p className="mt-4 max-w-4xl text-sm font-semibold uppercase tracking-[0.1em] text-white/85 md:text-base">
            {person.role}
          </p>
          <blockquote className="mt-6 max-w-3xl border-l-2 border-leanme-fuchsia pl-5 text-lg italic leading-relaxed text-white/80 md:text-xl md:leading-relaxed">
            {quote}
          </blockquote>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 md:px-10 md:py-12 lg:grid-cols-[minmax(0,280px)_1fr_minmax(0,220px)] lg:items-start lg:gap-10 lg:px-12">
          <RevealOnScroll>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-[#111111] shadow-[0_0_40px_rgba(230,0,126,0.12)] lg:mx-0 lg:max-w-none">
              <Image
                src={person.image}
                alt={person.name}
                fill
                priority
                className="object-cover object-top"
                sizes="(max-width: 1024px) 240px, 280px"
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.06}>
            <section className="rounded-xl border border-white/10 bg-[#111111] p-6 md:p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
                Carta d&apos;identità
              </h2>
              <div className="mt-5">
                <IdentityRow label="Ruolo" value={profile.identity.title} />
                <IdentityRow
                  label="Formazione"
                  value={profile.identity.background}
                />
                <IdentityRow label="Percorso" value={profile.identity.path} />
                <IdentityRow
                  label="Esperienza"
                  value={profile.identity.experience}
                />
                <IdentityRow label="Focus" value={profile.identity.focus} />
              </div>
            </section>
          </RevealOnScroll>

          {profile.accentImage ? (
            <RevealOnScroll delay={0.1} className="hidden lg:block">
              <div className="relative aspect-[278/406] w-full overflow-hidden rounded-xl border border-white/10 bg-[#111111]">
                <Image
                  src={profile.accentImage.src}
                  alt={profile.accentImage.alt}
                  fill
                  className="object-contain object-bottom"
                  sizes="220px"
                />
              </div>
            </RevealOnScroll>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14 lg:px-12">
        <RevealOnScroll>
          <div className="flex flex-wrap gap-3">
            {profile.pillars.map((pillar) => (
              <span
                key={pillar}
                className="rounded-full border border-leanme-fuchsia/30 bg-leanme-fuchsia/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/90"
              >
                {pillar}
              </span>
            ))}
          </div>
        </RevealOnScroll>

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {profile.sections.map((section, index) => (
            <ProfileSection
              key={section.id}
              title={section.title}
              delay={index * 0.04}
              className={cn(
                section.id === "philosophy" &&
                  "lg:col-span-2 border-leanme-fuchsia/20 bg-gradient-to-br from-[#111111] via-[#141018] to-[#111111]"
              )}
            >
              <NarrativeBlock paragraphs={section.paragraphs} />
            </ProfileSection>
          ))}
        </div>

        {profile.surprise ? (
          <RevealOnScroll delay={0.12} className="mt-8">
            <section className="overflow-hidden rounded-xl border border-leanme-fuchsia/25 bg-gradient-to-br from-[#120810] via-[#111111] to-[#0a0a0a]">
              <div className="grid lg:grid-cols-[1fr_minmax(0,320px)] lg:items-stretch">
                <div className="p-6 md:p-8 lg:p-10">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-leanme-fuchsia">
                    {profile.surprise.title}
                  </p>
                  <div className="mt-5 space-y-4">
                    {profile.surprise.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="text-sm leading-relaxed text-white/80 md:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
                {profile.surprise.image ? (
                  <div className="relative min-h-[280px] border-t border-white/10 bg-black/40 lg:min-h-0 lg:border-l lg:border-t-0">
                    <Image
                      src={profile.surprise.image}
                      alt={profile.surprise.imageAlt ?? profile.surprise.title}
                      fill
                      className="object-cover object-center opacity-90"
                      sizes="(max-width: 1024px) 100vw, 320px"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-l lg:from-black/70 lg:via-transparent lg:to-transparent"
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </RevealOnScroll>
        ) : null}

        <RevealOnScroll delay={0.16} className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/chi-siamo"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Chi siamo
          </Link>
          <Link
            href="/staff-ibrido"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-white"
          >
            Staff Ibrido
          </Link>
          <Link
            href="/contatti"
            className="inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark"
          >
            Connect
            <ArrowIcon />
          </Link>
        </RevealOnScroll>
      </div>
    </div>
  );
}
