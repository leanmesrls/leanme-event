import Image from "next/image";
import Link from "next/link";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Navigation } from "@/components/layout/Navigation";
import { ScrollHeader } from "@/components/layout/ScrollHeader";
import { getHomepageData, getPercorsiData } from "@/lib/content";
import { buildHeaderNavigation } from "@/lib/navigation";
import { ASSETS } from "@/lib/assets";

export function Header() {
  const homepage = getHomepageData();
  const { consultationCta, percorsi } = getPercorsiData();
  const navigation = buildHeaderNavigation(homepage.headerNavigation, percorsi);

  return (
    <ScrollHeader>
      <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-2 px-5 md:h-[60px] md:px-10 lg:px-12 xl:h-16 xl:px-16">
        <Link
          href="/"
          className="flex shrink-0 items-center self-center"
          aria-label="LeanMe — Home"
        >
          <Image
            src={ASSETS.logo.pinkWhite}
            alt="LeanMe Open Innovation Hub"
            width={2200}
            height={590}
            className="h-[34px] w-auto object-contain object-left md:h-9 xl:h-[38px]"
            priority
          />
        </Link>

        <div className="hidden min-w-0 justify-center xl:flex">
          <Navigation items={navigation} variant="dark" />
        </div>

        <div className="hidden items-center justify-end xl:flex">
          <Link
            href={homepage.headerCta.href}
            className="inline-flex items-center justify-center rounded-full bg-leanme-fuchsia px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-leanme-fuchsia-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia"
          >
            {homepage.headerCta.label}
          </Link>
        </div>

        <div className="col-start-3 flex justify-end xl:hidden">
          <MobileMenu
            items={navigation}
            cta={{ label: "CONSULENZA", href: consultationCta.href }}
            variant="dark"
          />
        </div>
      </div>
    </ScrollHeader>
  );
}
