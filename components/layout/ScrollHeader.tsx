"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollHeaderProps {
  children: React.ReactNode;
}

export function ScrollHeader({ children }: ScrollHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,backdrop-filter,border-color] duration-300",
        scrolled
          ? "border-white/10 bg-black/75 backdrop-blur-lg"
          : "border-white/[0.08] bg-black/90 backdrop-blur-md"
      )}
    >
      {children}
    </header>
  );
}
