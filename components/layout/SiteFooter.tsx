import Image from "next/image";
import Link from "next/link";
import { SocialIcon } from "@/components/ui/SocialIcon";
import {
  getContattiData,
  getHomepageData,
  getPercorsiData,
  getSiteConfig,
} from "@/lib/content";
import { buildHeaderNavigation } from "@/lib/navigation";
import { ASSETS } from "@/lib/assets";

export function SiteFooter() {
  const site = getSiteConfig();
  const homepage = getHomepageData();
  const { percorsi } = getPercorsiData();
  const navigation = buildHeaderNavigation(homepage.headerNavigation, percorsi);
  const contatti = getContattiData();

  return (
    <footer className="border-t border-white/[0.08] bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-16 lg:px-12 xl:px-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div>
            <Link href="/" aria-label="LeanMe Home">
              <Image
                src={ASSETS.logo.pinkWhite}
                alt="LeanMe"
                width={2200}
                height={543}
                className="h-[3.75rem] w-auto max-w-none object-contain object-left object-top md:h-[4.25rem]"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {homepage.footer.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {site.footer.social.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  {...(social.platform !== "email"
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-leanme-fuchsia hover:text-leanme-fuchsia"
                >
                  <SocialIcon name={social.platform} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Navigazione
            </p>
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                  {item.children?.length ? (
                    <ul className="mt-1 space-y-1 border-l border-white/10 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="text-sm text-white/55 transition hover:text-white"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {homepage.footer.servicesTitle}
            </p>
            <ul className="space-y-2">
              {percorsi.map((percorso) => (
                <li key={percorso.slug}>
                  <Link
                    href={`/come-possiamo-aiutarti/${percorso.slug}`}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {percorso.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              {homepage.footer.contactsTitle}
            </p>
            <address className="space-y-3 not-italic text-sm text-white/70">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {contatti.legalAddress.label}
                </p>
                {contatti.legalAddress.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {contatti.operationalAddress.label}
                </p>
                {contatti.operationalAddress.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </div>
              {contatti.piva?.value && (
                <p>
                  <span className="text-white/45">{contatti.piva.label}: </span>
                  {contatti.piva.value}
                </p>
              )}
              {contatti.pec?.value && (
                <a href={contatti.pec.href} className="block transition hover:text-white">
                  <span className="text-white/45">{contatti.pec.label}: </span>
                  {contatti.pec.value}
                </a>
              )}
              {contatti.sdi?.value && (
                <p>
                  <span className="text-white/45">{contatti.sdi.label}: </span>
                  {contatti.sdi.value}
                </p>
              )}
              <a href={contatti.email.href} className="block transition hover:text-white">
                {contatti.email.value}
              </a>
              <a href={contatti.phone.href} className="block transition hover:text-white">
                {contatti.phone.value}
              </a>
            </address>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.08] pt-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1 text-xs text-white/40">
              <p>{site.footer.copyright}</p>
              <p className="text-[11px] text-leanme-fuchsia">{site.claim}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-white/40">
              {site.footer.legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-white/70"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/credits" className="hover:text-white/70">
                {homepage.footer.credits}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
