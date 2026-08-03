import { cn } from "@/lib/cn";

/**
 * ParkPlugs mark: a navy rounded square, a bold white "P", and a plug glyph
 * badge notched into the bottom-right corner. Matches the supplied brand
 * artwork — `brand-600` (#184878) is sampled directly from it.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="6" width="88" height="88" rx="22" className="fill-brand-600" />

      {/* "P" bowl, with a punched counter revealing the navy behind it */}
      <rect x="26" y="24" width="42" height="32" rx="16" className="fill-white" />
      <rect x="40" y="33" width="16" height="10" rx="5" className="fill-brand-600" />
      {/* "P" stem, drawn last so it stays solid where it meets the bowl */}
      <rect x="26" y="24" width="16" height="54" rx="7" className="fill-white" />

      {/* Plug badge, overlapping the rounded corner like the source mark */}
      <rect x="59" y="59" width="37" height="37" rx="13" className="fill-white" />
      <g transform="translate(77.5 77.5) rotate(45)" className="fill-brand-600">
        <rect x="-7" y="-2" width="14" height="9" rx="3" />
        <rect x="-4.3" y="-9.5" width="2.8" height="8.5" rx="1.4" />
        <rect x="1.5" y="-9.5" width="2.8" height="8.5" rx="1.4" />
        <rect x="-1.4" y="6.5" width="2.8" height="7" rx="1.4" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-xl font-extrabold tracking-tight text-ink-950">
          Park<span className="text-brand-600">Plugs</span>
        </span>
      ) : null}
    </span>
  );
}
