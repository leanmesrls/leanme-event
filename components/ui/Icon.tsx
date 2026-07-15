import { cn } from "@/lib/utils";

const icons: Record<string, React.ReactNode> = {
  workflow: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h6M4 12h10M4 18h14M16 6l4 4-4 4"
    />
  ),
  communication: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v10l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z"
    />
  ),
  ai: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6 6.3 17.7"
    />
  ),
  hybrid: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4M7.5 4.5A7 7 0 1012 5"
    />
  ),
  menu: (
    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
  ),
  close: (
    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
  ),
  arrow: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
  ),
  linkedin: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path strokeLinecap="round" d="M8 10v8M8 8v.01M12 16v-5a2 2 0 014 0v5" />
    </>
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 8h2V6h-2a2 2 0 00-2 2v2H9v2h2v6h2v-6h2l1-2h-3V8z" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 10l5 2-5 2v-4z" fill="currentColor" stroke="none" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
    </>
  ),
};

interface IconProps {
  name: keyof typeof icons | string;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const path = icons[name] ?? icons.workflow;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn("h-5 w-5", className)}
    >
      {path}
    </svg>
  );
}
