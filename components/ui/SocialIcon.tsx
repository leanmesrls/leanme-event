import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconDef = {
  node: ReactNode;
  fillRule?: "evenodd" | "nonzero";
  stroke?: boolean;
};

/** Loghi ufficiali (Simple Icons) + envelope standard — monocromatici via currentColor */
const icons: Record<string, IconDef> = {
  linkedin: {
    node: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.067 2.067 0 01-2.063-2.065 2.067 2.067 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
  facebook: {
    node: (
      <path d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    ),
  },
  instagram: {
    stroke: true,
    node: (
      <>
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="12"
          cy="12"
          r="3.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="16.75" cy="7.25" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  email: {
    stroke: true,
    node: (
      <>
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3.5 7.5 12 13l8.5-5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
};

interface SocialIconProps {
  name: string;
  className?: string;
}

export function SocialIcon({ name, className }: SocialIconProps) {
  const icon = icons[name];
  if (!icon) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={icon.stroke ? "none" : "currentColor"}
      stroke={icon.stroke ? "currentColor" : undefined}
      strokeWidth={icon.stroke ? 1.5 : undefined}
      className={cn("h-4 w-4", className)}
    >
      {icon.node}
    </svg>
  );
}
