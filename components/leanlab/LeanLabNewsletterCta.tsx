import Link from "next/link";

import { ArrowIcon } from "@/components/homepage/Icons";
import { cn } from "@/lib/utils";

interface LeanLabNewsletterCtaProps {
  href: string;
  label: string;
  className?: string;
}

export function LeanLabNewsletterCta({
  href,
  label,
  className,
}: LeanLabNewsletterCtaProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-leanme-fuchsia px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-leanme-fuchsia-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leanme-fuchsia md:text-[11px]",
        className
      )}
    >
      {label}
      <ArrowIcon className="shrink-0" />
    </Link>
  );
}
