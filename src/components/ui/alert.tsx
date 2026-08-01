import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheckCircle, IconInfo } from "./icons";

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

const tones: Record<AlertTone, { wrap: string; icon: string }> = {
  info: { wrap: "bg-info-50 border-info-100 text-info-700", icon: "text-info-600" },
  success: { wrap: "bg-success-50 border-success-100 text-success-700", icon: "text-success-600" },
  warning: { wrap: "bg-warning-50 border-warning-100 text-warning-700", icon: "text-warning-600" },
  danger: { wrap: "bg-danger-50 border-danger-100 text-danger-700", icon: "text-danger-600" },
  neutral: { wrap: "bg-ink-50 border-ink-200 text-ink-700", icon: "text-ink-500" },
};

const defaultIcons: Record<AlertTone, ReactNode> = {
  info: <IconInfo />,
  success: <IconCheckCircle />,
  warning: <IconAlert />,
  danger: <IconAlert />,
  neutral: <IconInfo />,
};

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  className,
  /**
   * Error and warning alerts that appear in response to a user action should
   * announce themselves. Static advisory copy should not.
   */
  live,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const t = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      aria-live={live ? (tone === "danger" ? "assertive" : "polite") : undefined}
      className={cn("flex gap-3 rounded-xl border p-4", t.wrap, className)}
    >
      <span className={cn("mt-0.5 shrink-0 text-[1.15rem]", t.icon)}>
        {icon ?? defaultIcons[tone]}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? (
          <div className={cn("leading-relaxed", title && "mt-1", tone !== "neutral" && "opacity-95")}>
            {children}
          </div>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * The standing advisory shown wherever community-reported free parking
 * appears. Centralised so the wording can never drift out of sync.
 */
export function CommunityParkingNotice({ className }: { className?: string }) {
  return (
    <Alert tone="warning" title="Availability is not guaranteed" className={className}>
      Community reports describe parking someone recently observed. Spaces may
      already be taken. Always follow posted signs and local parking laws.
    </Alert>
  );
}
