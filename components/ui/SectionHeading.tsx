import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {subtitle && (
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-leanme-purple">
          {subtitle}
        </p>
      )}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-leanme-black md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-leanme-gray-600">
          {description}
        </p>
      )}
    </div>
  );
}
