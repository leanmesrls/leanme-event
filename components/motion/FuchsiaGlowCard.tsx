"use client";

import { motion, type Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

type FuchsiaGlowVariant = "agent" | "card";

const CARD_VARIANTS: Record<FuchsiaGlowVariant, Variants> = {
  agent: {
    rest: {
      y: 0,
      scale: 1,
      boxShadow: "0 0 0 rgba(230, 0, 126, 0)",
    },
    hover: {
      y: -3,
      scale: 1.015,
      boxShadow:
        "0 0 20px rgba(230, 0, 126, 0.45), 0 0 40px rgba(230, 0, 126, 0.2)",
    },
  },
  card: {
    rest: {
      y: 0,
      scale: 1,
      boxShadow: "0 0 0 rgba(230, 0, 126, 0)",
    },
    hover: {
      y: -4,
      scale: 1.01,
      boxShadow:
        "0 0 18px rgba(230, 0, 126, 0.4), 0 0 36px rgba(230, 0, 126, 0.18)",
    },
  },
};

const GLOW_VARIANTS: Record<FuchsiaGlowVariant, Variants> = {
  agent: {
    rest: { opacity: 0, scale: 0.96 },
    hover: { opacity: 0.4, scale: 1 },
  },
  card: {
    rest: { opacity: 0, scale: 0.98 },
    hover: { opacity: 0.32, scale: 1 },
  },
};

interface FuchsiaGlowCardProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: FuchsiaGlowVariant;
  as?: "div" | "article";
}

export function FuchsiaGlowCard({
  children,
  className,
  contentClassName,
  variant = "card",
  as = "div",
}: FuchsiaGlowCardProps) {
  const reducedMotion = useReducedMotion();
  const MotionComponent = motion[as];

  const baseHover = CARD_VARIANTS[variant].hover as {
    boxShadow: string;
  };

  const cardVariants: Variants = reducedMotion
    ? {
        rest: { boxShadow: "0 0 0 rgba(230, 0, 126, 0)" },
        hover: { boxShadow: baseHover.boxShadow },
      }
    : CARD_VARIANTS[variant];

  return (
    <MotionComponent
      className={cn("relative overflow-visible", className)}
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.span
        aria-hidden
        variants={GLOW_VARIANTS[variant]}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "pointer-events-none absolute z-0 rounded-[inherit] bg-[#e6007e] blur-2xl",
          variant === "agent" ? "-inset-3" : "-inset-2"
        )}
      />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </MotionComponent>
  );
}
