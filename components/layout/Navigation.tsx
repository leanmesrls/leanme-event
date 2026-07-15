"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/content";

interface NavigationProps {
  items: NavItem[];
  className?: string;
  onNavigate?: () => void;
  variant?: "light" | "dark";
  layout?: "horizontal" | "vertical";
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isItemActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function getLinkClassName(
  isActive: boolean,
  isDark: boolean,
  options?: { isChild?: boolean; isVertical?: boolean }
) {
  const { isChild = false, isVertical = false } = options ?? {};

  if (isChild && isVertical) {
    return cn(
      "block rounded-lg px-3 py-2.5 text-sm font-medium leading-snug transition-colors duration-200",
      isDark
        ? isActive
          ? "bg-white/10 text-leanme-fuchsia"
          : "text-white/90 hover:bg-white/5 hover:text-leanme-fuchsia"
        : isActive
          ? "bg-leanme-fuchsia/10 text-leanme-fuchsia"
          : "text-leanme-gray-700 hover:bg-leanme-gray-100 hover:text-leanme-fuchsia"
    );
  }

  if (isChild) {
    return cn(
      "block px-4 py-2.5 text-sm font-medium leading-snug transition-colors duration-200",
      isDark
        ? isActive
          ? "text-leanme-fuchsia"
          : "text-white/85 hover:bg-white/5 hover:text-leanme-fuchsia"
        : isActive
          ? "text-leanme-fuchsia"
          : "text-leanme-gray-700 hover:bg-leanme-gray-100 hover:text-leanme-fuchsia"
    );
  }

  return cn(
    "block px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 2xl:text-[11px]",
    isDark
      ? isActive
        ? "text-leanme-fuchsia"
        : "text-white/85 hover:text-leanme-fuchsia"
      : isActive
        ? "bg-leanme-fuchsia/10 font-medium text-leanme-fuchsia"
        : "text-leanme-gray-700 hover:text-leanme-fuchsia"
  );
}

export function Navigation({
  items,
  className,
  onNavigate,
  variant = "light",
  layout = "horizontal",
}: NavigationProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";
  const isVertical = layout === "vertical";
  const [expandedHref, setExpandedHref] = useState<string | null>(null);

  return (
    <nav aria-label="Navigazione principale" className={className}>
      <ul
        className={cn(
          isVertical
            ? "flex flex-col gap-1"
            : "flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-2.5 2xl:gap-3.5"
        )}
      >
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isActive =
            isItemActive(pathname, item.href) ||
            item.children?.some((child) => isItemActive(pathname, child.href)) ||
            false;
          const isExpanded = expandedHref === item.href;

          if (hasChildren && isVertical) {
            return (
              <li key={item.href}>
                <div className="flex items-stretch gap-1">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      getLinkClassName(isActive, isDark, { isVertical: true }),
                      "min-w-0 flex-1"
                    )}
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`Espandi sottomenu ${item.label}`}
                    onClick={() =>
                      setExpandedHref(isExpanded ? null : item.href)
                    }
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center rounded-lg px-2 transition-colors duration-200",
                      isDark
                        ? "text-white/85 hover:bg-white/5 hover:text-leanme-fuchsia"
                        : "text-leanme-gray-700 hover:bg-leanme-gray-100 hover:text-leanme-fuchsia"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </div>
                {isExpanded ? (
                  <ul className="mt-1 space-y-1 border-l border-white/10 pl-3">
                    {item.children?.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className={getLinkClassName(
                            isItemActive(pathname, child.href),
                            isDark,
                            { isChild: true, isVertical: true }
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          }

          if (hasChildren && !isVertical) {
            return (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-haspopup="true"
                  className={cn(
                    getLinkClassName(isActive, isDark),
                    "inline-flex items-center gap-1"
                  )}
                >
                  {item.label}
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Link>
                <div className="pointer-events-none absolute left-0 top-full z-50 hidden min-w-[20rem] pt-2 group-hover:pointer-events-auto group-hover:block group-focus-within:pointer-events-auto group-focus-within:block">
                  <ul className="overflow-hidden rounded-xl border border-white/10 bg-black py-2 shadow-2xl">
                    {item.children?.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onNavigate}
                          className={getLinkClassName(
                            isItemActive(pathname, child.href),
                            isDark,
                            { isChild: true }
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={getLinkClassName(isActive, isDark, { isVertical })}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
