import { cn } from "@/lib/utils";
import type { ImageAsset } from "@/types/content";

interface PlaceholderImageProps {
  image: ImageAsset;
  className?: string;
  aspectRatio?: "video" | "square" | "portrait" | "wide" | "auto";
  priority?: boolean;
}

const aspectClasses = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
  auto: "min-h-[240px]",
};

export function PlaceholderImage({
  image,
  className,
  aspectRatio = "video",
}: PlaceholderImageProps) {
  return (
    <div
      data-placeholder="true"
      data-replace-src={image.src}
      data-replace-hint={image.replaceHint}
      role="img"
      aria-label={image.alt}
      className={cn(
        "relative overflow-hidden border-2 border-dashed border-leanme-purple/25 bg-gradient-to-br from-leanme-gray-50 via-white to-leanme-purple/5",
        aspectClasses[aspectRatio],
        className
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <span className="rounded-full bg-leanme-purple/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-leanme-purple">
          Placeholder
        </span>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-leanme-gray-700">
          {image.replaceHint}
        </p>
        <p className="mt-2 font-mono text-[11px] text-leanme-gray-400">
          → {image.src}
        </p>
      </div>
    </div>
  );
}
