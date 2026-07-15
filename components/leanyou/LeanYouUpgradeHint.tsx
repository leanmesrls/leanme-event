import Image from "next/image";

import { ASSETS } from "@/lib/assets";
import { LEONARDO_UPGRADE_HINT } from "@/lib/leanyou/capabilities";
import { cn } from "@/lib/utils";

interface LeanYouUpgradeHintProps {
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export function LeanYouUpgradeHint({
  className,
  iconSize = 18,
  showLabel = true,
}: LeanYouUpgradeHintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-start gap-2 text-[10px] leading-snug text-white/40",
        className
      )}
    >
      <Image
        src={ASSETS.pittogramma}
        alt=""
        width={iconSize}
        height={iconSize}
        className="mt-0.5 shrink-0"
        aria-hidden
      />
      {showLabel ? <span>{LEONARDO_UPGRADE_HINT}</span> : null}
    </span>
  );
}
