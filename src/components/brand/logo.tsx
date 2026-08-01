import { cn } from "@/lib/cn";

/**
 * ParkPlug mark: a map pin whose counter forms a plug. Uses `currentColor` for
 * the wordmark so it inherits from context, and the brand ramp for the pin.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 2.5c-5.8 0-10.5 4.6-10.5 10.3 0 7.4 9.2 15.7 9.6 16.1a1.4 1.4 0 0 0 1.8 0c.4-.4 9.6-8.7 9.6-16.1C26.5 7.1 21.8 2.5 16 2.5Z"
        className="fill-brand-600"
      />
      {/* Plug body */}
      <rect x="11.6" y="10.4" width="8.8" height="7.2" rx="2.2" className="fill-white" />
      {/* Prongs */}
      <path
        d="M13.9 7.6v3M18.1 7.6v3"
        stroke="currentColor"
        className="stroke-white"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* Cord */}
      <path
        d="M16 17.6v2.6"
        stroke="currentColor"
        className="stroke-white"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
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
          Park<span className="text-brand-600">Plug</span>
        </span>
      ) : null}
    </span>
  );
}
