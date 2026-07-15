import Link from "next/link";

import { ArrowIcon } from "@/components/homepage/Icons";
import { cn } from "@/lib/utils";

interface PercorsoConsultationCtaProps {
  href: string;
  label: string;
  variant?: "default" | "banner";
  className?: string;
}

export function PercorsoConsultationCta({
  href,
  label,
  variant = "default",
  className,
}: PercorsoConsultationCtaProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-3xl items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold leading-snug transition",
        variant === "banner"
          ? "bg-white text-leanme-fuchsia hover:scale-105 hover:bg-white/90"
          : "bg-leanme-purple text-white hover:bg-leanme-purple/90",
        className
      )}
    >
      {label}
      <ArrowIcon className="shrink-0" />
    </Link>
  );
}
