import { cn } from "@/lib/utils";

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function PageSection({ children, className, id }: PageSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "bg-black px-5 py-16 md:px-10 md:py-24 lg:px-16",
        className
      )}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

interface PageIntroProps {
  title: string;
  subtitle?: string;
  description?: string;
  descriptions?: string[];
  align?: "left" | "center";
}

export function PageIntro({
  title,
  subtitle,
  description,
  descriptions,
  align = "left",
}: PageIntroProps) {
  const body = descriptions?.length
    ? descriptions
    : description
      ? [description]
      : [];

  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {subtitle && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-leanme-purple">
          {subtitle}
        </p>
      )}
      <h1 className="text-3xl font-bold tracking-[0.06em] text-white md:text-4xl">
        {title}
      </h1>
      {body.length > 0 && (
        <div className="mt-4 space-y-4">
          {body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-base leading-relaxed text-white/65 md:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
      <div className={cn("mt-4 h-[2px] w-12 bg-leanme-purple", align === "center" && "mx-auto")} />
    </div>
  );
}
