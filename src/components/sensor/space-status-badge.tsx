import { cn } from "@/lib/cn";
import { IconCar, IconCheckCircle, IconInfo, IconWifiOff } from "@/components/ui/icons";
import { SPACE_STATUS_LABEL, type SpaceStatus } from "@/lib/sensor-types";

/**
 * Status is never color alone — every badge carries an icon and a text
 * label too, so it reads the same under color-blindness or on a broken
 * display, and it never depends on the amber/cyan distinction the rest of
 * the app reserves for free-parking reports vs. live sensor data.
 */
const CONFIG: Record<SpaceStatus, { icon: typeof IconCheckCircle; className: string }> = {
  AVAILABLE: { icon: IconCheckCircle, className: "bg-success-50 text-success-700 border-success-100" },
  OCCUPIED: { icon: IconCar, className: "bg-danger-50 text-danger-700 border-danger-100" },
  UNKNOWN: { icon: IconInfo, className: "bg-ink-100 text-ink-600 border-ink-200" },
  OFFLINE: { icon: IconWifiOff, className: "bg-ink-100 text-ink-500 border-ink-200" },
};

export function SpaceStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: SpaceStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors duration-200",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        toneClass,
        className,
      )}
    >
      <Icon className={size === "sm" ? "text-xs" : "text-sm"} aria-hidden="true" />
      {SPACE_STATUS_LABEL[status]}
    </span>
  );
}
