"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/content";

interface MobileMenuProps {
  items: NavItem[];
  cta?: { label: string; href: string };
  variant?: "light" | "dark";
}

export function MobileMenu({ items, cta, variant = "light" }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isDark = variant === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const overlay = open ? (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu di navigazione"
      className={cn(
        "fixed inset-0 z-[200] overflow-y-auto xl:hidden",
        isDark ? "bg-black" : "bg-white"
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-[201] flex items-center justify-between border-b px-5 py-5",
          isDark ? "border-white/10 bg-black" : "border-leanme-gray-200 bg-white"
        )}
      >
        <span
          className={cn(
            "text-lg font-semibold",
            isDark ? "text-white" : "text-leanme-black"
          )}
        >
          Menu
        </span>
        <button
          type="button"
          aria-label="Chiudi menu"
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-full p-2",
            isDark ? "text-white hover:bg-white/10" : "hover:bg-leanme-gray-100"
          )}
        >
          <Icon name="close" className="h-6 w-6" />
        </button>
      </div>
      <div className="px-5 py-6">
        <Navigation
          items={items}
          onNavigate={() => setOpen(false)}
          variant={variant}
          layout="vertical"
        />
        {cta ? (
          <div className="mt-8">
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-full bg-leanme-fuchsia px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Chiudi menu" : "Apri menu"}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "rounded-full p-2 transition-colors",
          isDark ? "text-white hover:bg-white/10" : "text-leanme-black hover:bg-leanme-gray-100"
        )}
      >
        <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
      </button>

      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </div>
  );
}
