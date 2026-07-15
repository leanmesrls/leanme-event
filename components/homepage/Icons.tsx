import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ServiceIconName =
  | "rocket"
  | "medical"
  | "science"
  | "events"
  | "communication";

export const serviceIconStyles: Record<
  ServiceIconName,
  { text: string; border: string }
> = {
  rocket: {
    text: "text-leanme-fuchsia",
    border: "border-leanme-fuchsia/50",
  },
  medical: {
    text: "text-[#3DDBD9]",
    border: "border-[#3DDBD9]/50",
  },
  science: {
    text: "text-[#B06CFF]",
    border: "border-[#B06CFF]/50",
  },
  events: {
    text: "text-[#FF8A3D]",
    border: "border-[#FF8A3D]/50",
  },
  communication: {
    text: "text-[#FF5FA2]",
    border: "border-[#FF5FA2]/50",
  },
};

const icons: Record<ServiceIconName, ReactNode> = {
  /* Aziende: edificio corporate + lampadina (idee e innovazione) */
  rocket: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 21V11l6-4.5L18 11v10H6z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-3.5h6V21" />
      <path strokeLinecap="round" d="M9.5 14h1.5M13 14h1.5M9.5 16.5h1.5M13 16.5h1.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 8.5a2.25 2.25 0 0 1 3.5-1.85 2.25 2.25 0 0 1-.35 3.35 1.6 1.6 0 0 0-.65 1.3v.7"
      />
      <path strokeLinecap="round" d="M12 12.5v1.2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.5 5.5l.45 1.1 1.1.45-1.1.45-.45 1.1-.45-1.1-1.1-.45 1.1-.45.45-1.1z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  /* Struttura sanitaria: edificio clinica con croce medica */
  medical: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 21V12.5l7-4.5 7 4.5V21"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 21v-4h7v4" />
      <circle cx="12" cy="10.5" r="2.75" />
      <path strokeLinecap="round" d="M12 9v3M10.5 10.5h3" />
      <path strokeLinecap="round" d="M9 15.5h6" />
    </>
  ),
  /* Società scientifica: rete associativa + documento/abstract */
  science: (
    <>
      <circle cx="12" cy="7.5" r="2.25" />
      <circle cx="7" cy="17.5" r="2.25" />
      <circle cx="17" cy="17.5" r="2.25" />
      <path strokeLinecap="round" d="M12 9.75L8.2 15.25M12 9.75l3.8 5.5M7 17.5h10" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 5.5h3a1 1 0 0 1 1 1v1.5H9.5V6.5a1 1 0 0 1 1-1z"
      />
      <path strokeLinecap="round" d="M10.25 7.75h3.5" />
    </>
  ),
  /* Eventi: microfono da palco + luci e accento wow */
  events: (
    <>
      <rect x="10.25" y="4.5" width="3.5" height="7.5" rx="1.75" />
      <path strokeLinecap="round" d="M8.5 12.5a3.5 3.5 0 0 0 7 0" />
      <path strokeLinecap="round" d="M12 16v2.5" />
      <path strokeLinecap="round" d="M9.5 18.5h5" />
      <path strokeLinecap="round" d="M5.5 7.5l2 1.5M18.5 7.5l-2 1.5" />
      <path strokeLinecap="round" d="M4.5 5.5l1.5 1M19.5 5.5l-1.5 1" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.75 15.25l.55 1.35 1.35.55-1.35.55-.55 1.35-.55-1.35-1.35-.55 1.35-.55.55-1.35z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  /* Comunicazione: megafono con onde broadcast */
  communication: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 10.5v3l4.5 1.75V8.75L4.5 10.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 8.75v6.5l7.25 3.5V5.25L9 8.75z"
      />
      <path strokeLinecap="round" d="M17.25 9.25c1.1.85 1.1 4.65 0 5.5" />
      <path strokeLinecap="round" d="M19.25 7.25c2 1.55 2 7.95 0 9.5" />
      <path strokeLinecap="round" d="M21 5.25c2.85 2.2 2.85 11.3 0 13.5" />
    </>
  ),
};

function resolveIconName(name: string): ServiceIconName {
  if (name in icons) {
    return name as ServiceIconName;
  }
  return "rocket";
}

export function ServiceIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const iconName = resolveIconName(name);
  const color = serviceIconStyles[iconName].text;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      className={cn("h-7 w-7", color, className)}
    >
      {icons[iconName]}
    </svg>
  );
}

const badgeSizes = {
  sm: {
    wrapper: "h-10 w-10",
    icon: "h-5 w-5",
  },
  md: {
    wrapper: "h-11 w-11 lg:h-12 lg:w-12",
    icon: "h-5 w-5 lg:h-6 lg:w-6",
  },
  lg: {
    wrapper: "h-14 w-14",
    icon: "h-7 w-7",
  },
} as const;

export function ServiceIconBadge({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof badgeSizes;
  className?: string;
}) {
  const iconName = resolveIconName(name);
  const { border } = serviceIconStyles[iconName];
  const { wrapper, icon } = badgeSizes[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border bg-black/40",
        wrapper,
        border,
        className,
      )}
    >
      <ServiceIcon name={iconName} className={icon} />
    </div>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function GraduationCapIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("w-full text-leanme-fuchsia", className)}
    >
      <defs>
        <filter id="cap-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g opacity="0.2" stroke="currentColor" strokeWidth="1">
        <ellipse cx="160" cy="200" rx="100" ry="30" />
        <path d="M40 80 Q160 20 280 80" />
        <path d="M60 120 Q160 60 260 120" />
      </g>
      <g filter="url(#cap-glow)" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 98 160 42l128 56-128 56-128-56z" />
        <path d="M64 112v48c0 14 43 30 96 30s96-16 96-30v-48" />
        <path d="M256 114v52" />
        <circle cx="256" cy="172" r="6" fill="currentColor" stroke="none" />
        <path d="M256 168c0 12-28 22-64 22s-64-10-64-22" />
      </g>
      <g stroke="currentColor" strokeWidth="1.5" opacity="0.45">
        <path d="M160 42v56M96 84l64 28 64-28" />
        <path d="M120 200l40-24 40 24" />
      </g>
    </svg>
  );
}

export function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      className={cn("text-leanme-fuchsia", className)}
    >
      <path d="M8 28c0-8 4-14 12-16v6c-4 1-6 4-6 8h6v10H8V28zm22 0c0-8 4-14 12-16v6c-4 1-6 4-6 8h6v10H30V28z" />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v10l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z"
      />
    </svg>
  );
}
