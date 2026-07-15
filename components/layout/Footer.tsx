import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getSiteConfig } from "@/lib/content";

export function Footer() {
  const site = getSiteConfig();

  return (
    <footer className="border-t border-leanme-black/5 bg-leanme-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{site.name}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {site.footer.tagline}
            </p>
            <p className="mt-6 text-sm font-medium text-leanme-purple">
              {site.claim}
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-white/50">
              Navigazione
            </p>
            <ul className="space-y-2">
              {site.navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/80 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-white/50">
              Social
            </p>
            <ul className="space-y-3">
              {site.footer.social.map((social) => (
                <li key={social.platform}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white"
                  >
                    <Icon name={social.platform} className="h-4 w-4" />
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p>{site.footer.copyright}</p>
          <div className="flex gap-4">
            {site.footer.legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
