import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps {
  href?: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}

const variants = {
  primary:
    "bg-leanme-purple text-white hover:bg-leanme-purple/90 shadow-lg shadow-leanme-purple/20",
  secondary:
    "border border-leanme-black/10 bg-white text-leanme-black hover:border-leanme-purple/40 hover:text-leanme-purple",
  ghost: "text-leanme-black hover:text-leanme-purple",
};

export function Button({
  href,
  label,
  variant = "primary",
  className,
  type = "button",
  onClick,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leanme-purple focus-visible:ring-offset-2",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {label}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {label}
    </button>
  );
}
