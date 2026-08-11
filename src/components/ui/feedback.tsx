import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "./button";
import { IconAlert, IconSpinner, IconStar } from "./icons";

/* -------------------------------------------------------------------------
   Skeletons — shaped like the content they stand in for.
   ------------------------------------------------------------------------- */

export function Skeleton({
  className,
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return <div className={cn("skeleton", rounded, className)} aria-hidden="true" />;
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")}
          rounded="rounded-md"
        />
      ))}
    </div>
  );
}

/**
 * Wrap a skeleton region so screen readers hear "loading" once rather than
 * navigating a tree of meaningless placeholder boxes.
 */
export function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonListingCard() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-ink-50">
      <Skeleton className="aspect-[16/10] w-full" rounded="rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" rounded="rounded-md" />
        <Skeleton className="h-3 w-1/2" rounded="rounded-md" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16" rounded="rounded-full" />
          <Skeleton className="h-6 w-20" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-card border border-ink-200 bg-ink-50 p-4">
      <Skeleton className="h-16 w-16 shrink-0" rounded="rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" rounded="rounded-md" />
        <Skeleton className="h-3 w-3/5" rounded="rounded-md" />
      </div>
      <Skeleton className="h-9 w-24 shrink-0" rounded="rounded-xl" />
    </div>
  );
}

export function Spinner({
  label = "Loading",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "text-base", md: "text-2xl", lg: "text-4xl" } as const;
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <IconSpinner className={cn("animate-spin-slow text-brand-600", sizes[size])} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------
   Empty and error states
   ------------------------------------------------------------------------- */

export type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "tertiary";
};

function ActionRow({ actions }: { actions: StateAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-6 flex flex-col flex-wrap justify-center gap-2.5 sm:flex-row">
      {actions.map((a, i) =>
        a.href ? (
          <ButtonLink
            key={a.label}
            href={a.href}
            variant={a.variant ?? (i === 0 ? "primary" : "secondary")}
          >
            {a.label}
          </ButtonLink>
        ) : (
          <Button
            key={a.label}
            onClick={a.onClick}
            variant={a.variant ?? (i === 0 ? "primary" : "secondary")}
          >
            {a.label}
          </Button>
        ),
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: StateAction[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-ink-300 bg-ink-50/50 text-center",
        compact ? "px-5 py-8" : "px-6 py-14",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-2xl text-ink-400 shadow-e1">
          {icon}
        </span>
      ) : null}
      <h3 className={cn("font-bold text-ink-900", compact ? "text-base" : "text-lg")}>{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-600">{description}</p>
      ) : null}
      <ActionRow actions={actions} />
    </div>
  );
}

/**
 * Error surface. Every instance states what happened, what the user can do,
 * and whether their input survived.
 */
export function ErrorState({
  title,
  description,
  actions = [],
  progressNote,
  reference,
  className,
  compact,
}: {
  title: string;
  description: ReactNode;
  actions?: StateAction[];
  /** e.g. "Your answers have been saved." */
  progressNote?: string;
  /** Support reference code, when one is available. */
  reference?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-danger-200 bg-danger-50/60 text-center",
        compact ? "px-5 py-8" : "px-6 py-12",
        className,
      )}
    >
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-2xl text-danger-600 shadow-e1">
        <IconAlert />
      </span>
      <h3 className={cn("font-bold text-ink-900", compact ? "text-base" : "text-lg")}>{title}</h3>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-700">{description}</div>
      {progressNote ? (
        <p className="mt-3 rounded-lg bg-ink-100 px-3 py-2 text-xs font-medium text-ink-600">
          {progressNote}
        </p>
      ) : null}
      <ActionRow actions={actions} />
      {reference ? (
        <p className="mt-5 font-mono text-2xs text-ink-500">Reference: {reference}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Rating
   ------------------------------------------------------------------------- */

export function RatingStars({
  value,
  count,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value * 10) / 10;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <IconStar
        className={cn("fill-current text-accent-500", size === "sm" ? "text-sm" : "text-base")}
        aria-hidden="true"
      />
      {showValue ? (
        <span
          className={cn("font-bold tabular-nums text-ink-900", size === "sm" ? "text-sm" : "text-base")}
        >
          {rounded.toFixed(1)}
        </span>
      ) : null}
      {typeof count === "number" ? (
        <span className={cn("text-ink-500", size === "sm" ? "text-xs" : "text-sm")}>
          ({count})
        </span>
      ) : null}
      <span className="sr-only">
        Rated {rounded.toFixed(1)} out of 5
        {typeof count === "number" ? ` from ${count} review${count === 1 ? "" : "s"}` : ""}
      </span>
    </span>
  );
}

/** Horizontal distribution bar used in the reviews summary. */
export function RatingBar({ stars, value, total }: { stars: number; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-10 shrink-0 tabular-nums text-ink-600">{stars} star</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
        <span
          className="block h-full rounded-full bg-accent-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right tabular-nums text-ink-500">{value}</span>
    </div>
  );
}
