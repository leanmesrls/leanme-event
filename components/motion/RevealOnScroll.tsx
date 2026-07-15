"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function RevealOnScroll({
  children,
  className,
  delay = 0,
}: RevealOnScrollProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={cn("reveal-instant", className)}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 64, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -80px 0px" }}
      transition={{
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
