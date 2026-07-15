import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ContattiIntro } from "@/components/contatti/ContattiIntro";
import { ContactFormEmbed } from "@/components/contatti/ContactFormEmbed";
import { PageHero } from "@/components/layout/PageHero";
import { PageSection } from "@/components/layout/PageSection";
import { FadeIn } from "@/components/motion/FadeIn";
import { InPocheParoleBox } from "@/components/seo/InPocheParoleBox";
import { getContattiData, getSeoInPocheParole } from "@/lib/content";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbSchema, localBusinessSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = createPageMetadata({
  title: "Contatti",
  description:
    "Contatta LeanMe S.r.l.s. Sede legale, sede operativa, telefono, email, modulo contatti e mappa.",
  path: "/contatti",
});

export default function ContattiPage() {
  const data = getContattiData();
  const summary = getSeoInPocheParole("/contatti");

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contatti", path: "/contatti" },
          ]),
          localBusinessSchema({
            name: "LeanMe S.r.l.s. — LeanMe Open Innovation Hub",
            description:
              "Digital Innovation Company che progetta Aziende Ibride. Sede operativa e legale a Bologna.",
            telephone: data.phone.value,
            email: data.email.value,
            legalAddress: data.legalAddress,
            operationalAddress: data.operationalAddress,
            social: data.social,
            mapUrl: `https://maps.google.com/maps?q=${encodeURIComponent("Via Porrettana 148/2, 40135 Bologna, Italia")}`,
          }),
        ]}
      />
      <PageHero
        id="contatti-heading"
        title={data.intro.title}
        subtitle={data.intro.subtitle}
      />
      <PageSection>
        <ContattiIntro blocks={data.introBlocks} />

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          <FadeIn delay={0.1}>
            <div className="space-y-8">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-white">
                  {data.legalAddress.label}
                </h2>
                <address className="mt-3 not-italic text-white/65">
                  {data.legalAddress.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>

              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-white">
                  {data.operationalAddress.label}
                </h2>
                <address className="mt-3 not-italic text-white/65">
                  {data.operationalAddress.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                    {data.phone.label}
                  </h3>
                  <a
                    href={data.phone.href}
                    className="mt-1 block text-lg font-medium text-white transition hover:text-leanme-fuchsia"
                  >
                    {data.phone.value}
                  </a>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                    {data.email.label}
                  </h3>
                  <a
                    href={data.email.href}
                    className="mt-1 block text-lg font-medium text-white transition hover:text-leanme-fuchsia"
                  >
                    {data.email.value}
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                  Social
                </h3>
                <ul className="mt-3 space-y-2">
                  {data.social.map((social) => (
                    <li key={social.platform}>
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white/75 transition hover:text-leanme-fuchsia"
                      >
                        <Icon name={social.platform} className="h-4 w-4" />
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {data.foundation.sectionTitle && (
                <section
                  aria-labelledby="foundation-heading"
                  className="rounded-xl border border-leanme-fuchsia/30 bg-gradient-to-br from-leanme-fuchsia/10 to-black p-6 md:p-8"
                >
                  <h2
                    id="foundation-heading"
                    className="text-base font-bold uppercase tracking-[0.08em] text-white md:text-lg"
                  >
                    {data.foundation.sectionTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {data.foundation.description}
                  </p>
                  {data.foundation.donateUrl && data.foundation.donateLabel && (
                    <Link
                      href={data.foundation.donateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center rounded-full bg-leanme-fuchsia px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-leanme-fuchsia-dark"
                    >
                      {data.foundation.donateLabel}
                    </Link>
                  )}
                </section>
              )}

              <div>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-white">
                  {data.map.label}
                </h2>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <iframe
                    title={data.map.label}
                    src={data.map.embedUrl}
                    className="h-[280px] w-full md:h-[320px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <ContactFormEmbed form={data.form} />
          </FadeIn>
        </div>

        {summary.length > 0 ? (
          <div className="mt-16">
            <InPocheParoleBox paragraphs={summary} />
          </div>
        ) : null}
      </PageSection>
    </>
  );
}
