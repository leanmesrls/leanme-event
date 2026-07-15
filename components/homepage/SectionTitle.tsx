"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
  underline?: boolean;
  id?: string;
}

export function SectionTitle({
  children,
  className,
  align = "center",
  underline = true,
  id,
}: SectionTitleProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <h2
        id={id}
        className="text-lg font-bold tracking-[0.14em] text-white md:text-xl lg:text-2xl"
      >
        {children}
      </h2>
      {underline &&
        (reducedMotion ? (
          <div
            className={cn(
              "mt-3 h-[2px] w-10 bg-leanme-fuchsia",
              align === "center" ? "mx-auto" : ""
            )}
          />
        ) : (
          <motion.div
            initial={{ width: 0, opacity: 0.6 }}
            whileInView={{ width: 40, opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mt-3 h-[2px] bg-leanme-fuchsia",
              align === "center" ? "mx-auto" : ""
            )}
          />
        ))}
    </div>
  );
}
