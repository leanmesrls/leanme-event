import Link from "next/link";
import type { LegalDocumentData } from "@/types/content";

interface LegalDocumentProps {
  data: LegalDocumentData;
}

export function LegalDocument({ data }: LegalDocumentProps) {
  return (
    <div>
      <p className="text-sm text-white/50">
        Ultimo aggiornamento: {data.hero.lastUpdated}
      </p>

      <div className="mt-10 space-y-10">
        {data.sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2
              id={`${section.id}-heading`}
              className="text-base font-bold tracking-[0.02em] text-leanme-fuchsia md:text-lg"
            >
              {section.title}
            </h2>
            <div className="mt-4 space-y-3">
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-base leading-relaxed text-white/80"
                >
                  {paragraph}
                </p>
              ))}
              {section.lines && (
                <address className="not-italic text-base leading-relaxed text-white/80">
                  {section.lines.map((line) => (
                    <span key={line} className="block">
                      {line.startsWith("E-mail:") ? (
                        <>
                          E-mail:{" "}
                          <a
                            href="mailto:info@leanme.it"
                            className="text-leanme-fuchsia transition hover:text-white"
                          >
                            info@leanme.it
                          </a>
                        </>
                      ) : line.startsWith("PEC:") ? (
                        <>
                          PEC:{" "}
                          <a
                            href="mailto:LeanMe@pec.it"
                            className="text-leanme-fuchsia transition hover:text-white"
                          >
                            LeanMe@pec.it
                          </a>
                        </>
                      ) : (
                        line
                      )}
                    </span>
                  ))}
                </address>
              )}
              {section.items && (
                <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-white/80">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.footerParagraphs?.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-base leading-relaxed text-white/80"
                >
                  {paragraph}
                </p>
              ))}
              {section.subsections?.map((subsection) => (
                <div key={subsection.title} className="space-y-2 border-l-2 border-leanme-fuchsia/30 pl-4">
                  <h3 className="text-sm font-semibold text-white md:text-base">
                    {subsection.title}
                  </h3>
                  {subsection.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className="text-base leading-relaxed text-white/80"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
              {section.embedPlaceholder && (
                <div
                  id="CookieDeclaration"
                  className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm italic text-white/45"
                >
                  {section.embedPlaceholder}
                </div>
              )}
              {section.email && (
                <p className="text-base leading-relaxed text-white/80">
                  <a
                    href={`mailto:${section.email}`}
                    className="text-leanme-fuchsia transition hover:text-white"
                  >
                    {section.email}
                  </a>
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-12 inline-block text-sm font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia transition hover:text-white"
      >
        ← Torna alla Home
      </Link>
    </div>
  );
}
