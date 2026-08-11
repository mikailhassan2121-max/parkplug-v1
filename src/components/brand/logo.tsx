import { cn } from "@/lib/cn";

/**
 * Single reusable brand mark. Reads the actual SVG assets under
 * `public/brand/` rather than inlining artwork, so dropping in the final
 * files is a file replacement, not a code change.
 */
export function Logo({
  variant = "wordmark",
  className,
}: {
  /** `wordmark` is the full horizontal lockup (icon + "PARKPLUGS"); `mark` is the icon alone, for tight or square spaces. */
  variant?: "wordmark" | "mark";
  className?: string;
}) {
  const src = variant === "mark" ? "/brand/parkplugs-mark.svg" : "/brand/parkplugs-wordmark.svg";
  return (
    // Local static SVG — no benefit from the Next image optimizer, and SVG
    // scales natively without it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="ParkPlugs"
      className={cn(variant === "mark" ? "h-8 w-8" : "h-8 w-auto", className)}
    />
  );
}
