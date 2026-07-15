import Image from "next/image";

export const PAGE_HERO_DEFAULT = {
  background: "/assets/official/reception-render.png",
  imageAlt:
    "Reception LeanMe — ambiente premium, parete in legno e illuminazione calda",
} as const;

interface PageHeroProps {
  title: string;
  subtitle?: string;
  id?: string;
  background?: string;
  imageAlt?: string;
  variant?: "reception" | "lean-academy";
}

export function PageHero({
  title,
  subtitle,
  id = "page-hero-heading",
  background = PAGE_HERO_DEFAULT.background,
  imageAlt = PAGE_HERO_DEFAULT.imageAlt,
  variant = "reception",
}: PageHeroProps) {
  const isLeanAcademy = variant === "lean-academy";

  return (
    <section
      aria-labelledby={id}
      className="relative min-h-[300px] overflow-hidden bg-black md:min-h-[340px] lg:min-h-[360px]"
    >
      {isLeanAcademy ? (
        <div className="absolute inset-y-0 right-0 w-full md:w-[92%] lg:w-[88%] xl:w-[82%]">
          <Image
            src={background}
            alt={imageAlt}
            fill
            priority
            className="object-contain object-right"
            sizes="(max-width: 768px) 100vw, 85vw"
          />
        </div>
      ) : (
        <Image
          src={background}
          alt={imageAlt}
          fill
          priority
          className="object-cover object-[58%_center]"
          sizes="100vw"
        />
      )}

      {isLeanAcademy ? (
        <>
          <div
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.6)_35%,rgba(0,0,0,0.15)_62%,transparent_82%)] md:hidden"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.88)_28%,rgba(0,0,0,0.45)_46%,rgba(0,0,0,0.08)_58%,transparent_68%)] md:block"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.5)_0%,transparent_42%)]"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.4)_38%,rgba(0,0,0,0.12)_58%,transparent_72%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55)_0%,transparent_45%)]"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative z-10 flex min-h-[300px] items-end px-5 pb-10 md:min-h-[340px] md:px-10 md:pb-12 lg:min-h-[360px] lg:px-16 lg:pb-14">
        <div className="mx-auto w-full max-w-[1440px] text-left">
          <h1
            id={id}
            className="text-3xl font-bold tracking-[0.06em] text-white md:text-4xl lg:text-5xl"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base font-semibold tracking-[0.04em] text-leanme-fuchsia md:text-lg">
              {subtitle}
            </p>
          )}
          <div className="mt-5 h-[2px] w-12 bg-leanme-fuchsia" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
