import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { cloneElement, isValidElement } from "react";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  accent: "bg-accent-50 text-accent-800 ring-accent-200",
  success: "bg-success-50 text-success-700 ring-success-100",
  warning: "bg-warning-50 text-warning-700 ring-warning-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  info: "bg-info-50 text-info-700 ring-info-100",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        tones[tone],
        className,
      )}
    >
      {icon ? <span className="text-[1.05em] shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
}

/**
 * Every status the product can show, mapped to a tone *and* a distinct label.
 * Status is never communicated by colour alone — the text always carries it.
 */
export type StatusKind =
  | "confirmed"
  | "pending"
  | "in_progress"
  | "completed"
  | "canceled"
  | "refunded"
  | "active"
  | "paused"
  | "draft"
  | "in_review"
  | "needs_changes"
  | "archived"
  | "recently_reported"
  | "expiring_soon"
  | "expired"
  | "taken";

const statusMap: Record<StatusKind, { label: string; tone: BadgeTone }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  canceled: { label: "Canceled", tone: "danger" },
  refunded: { label: "Refunded", tone: "info" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
  in_review: { label: "In review", tone: "info" },
  needs_changes: { label: "Needs changes", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
  recently_reported: { label: "Recently reported", tone: "accent" },
  expiring_soon: { label: "Expiring soon", tone: "warning" },
  expired: { label: "Expired", tone: "neutral" },
  taken: { label: "Taken", tone: "danger" },
};

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: StatusKind;
  size?: "sm" | "md";
  className?: string;
}) {
  const { label, tone } = statusMap[status];
  return (
    <Badge tone={tone} size={size} className={className}>
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-success-500",
          tone === "warning" && "bg-warning-500",
          tone === "danger" && "bg-danger-500",
          tone === "info" && "bg-info-500",
          tone === "accent" && "bg-accent-500",
          tone === "brand" && "bg-brand-500",
          tone === "neutral" && "bg-ink-400",
        )}
      />
      {label}
    </Badge>
  );
}

/** Small count bubble for notifications. Hidden entirely when the count is 0. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-danger-600
                 text-white text-2xs font-bold grid place-items-center ring-2 ring-ink-50"
    >
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">
        {count} {label}
      </span>
    </span>
  );
}

/** Removable chip used for active search filters. */
export function FilterChip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="grid h-5.5 w-5.5 place-items-center rounded-full text-brand-700 transition-colors hover:bg-brand-200/70 hover:text-brand-900"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}

/** Icon + label pair used for amenity lists on cards and listing pages. */
export function AmenityTag({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  const sized =
    isValidElement<{ className?: string }>(icon)
      ? cloneElement(icon, { className: cn("text-[0.95rem]", icon.props.className) })
      : icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
      <span className="text-ink-500 shrink-0">{sized}</span>
      {children}
    </span>
  );
}
