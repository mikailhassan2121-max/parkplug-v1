import { feesConfigured } from "@/config/business";
import { formatDuration, formatMoneyExact } from "@/lib/format";
import type { PriceBreakdown as Breakdown } from "@/lib/types";
import { Alert } from "@/components/ui/alert";

/**
 * Full cost breakdown. Every line is shown from the first screen — no fee is
 * introduced for the first time at checkout.
 */
export function PriceBreakdown({
  price,
  minutes,
  hourlyRateCents,
  compact,
}: {
  price: Breakdown;
  minutes: number;
  hourlyRateCents: number;
  compact?: boolean;
}) {
  const hours = minutes / 60;

  return (
    <div className={compact ? "text-sm" : "text-sm"}>
      <dl className="space-y-2.5">
        <Row
          label={`${formatMoneyExact(hourlyRateCents, price.currency)}/hr × ${formatDuration(minutes)}`}
          value={formatMoneyExact(price.subtotalCents, price.currency)}
          hint={hours > 24 ? "Daily maximum applied where it lowers the price." : undefined}
        />

        {price.discountCents ? (
          <Row
            label="Discount"
            value={`−${formatMoneyExact(price.discountCents, price.currency)}`}
            tone="success"
          />
        ) : null}

        {feesConfigured ? (
          <Row label="Service fee" value={formatMoneyExact(price.serviceFeeCents, price.currency)} />
        ) : (
          <Row label="Service fee" value="Not yet set" tone="muted" />
        )}

        {price.taxCents > 0 ? (
          <Row label="Taxes" value={formatMoneyExact(price.taxCents, price.currency)} />
        ) : null}
      </dl>

      <div className="mt-3.5 flex items-baseline justify-between gap-3 border-t border-ink-200 pt-3.5">
        <span className="text-base font-bold text-ink-900">Total</span>
        <span className="text-lg font-extrabold tabular-nums text-ink-950">
          {formatMoneyExact(price.totalCents, price.currency)}
        </span>
      </div>

      {!feesConfigured ? (
        <Alert tone="warning" className="mt-3.5">
          ParkPlug&rsquo;s service fee has not been configured yet, so this total
          covers the parking cost only. The full amount will be shown before any
          payment is taken.
        </Alert>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className={tone === "muted" ? "text-ink-500" : "text-ink-700"}>
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
      </dt>
      <dd
        className={
          tone === "success"
            ? "shrink-0 font-semibold tabular-nums text-success-700"
            : tone === "muted"
              ? "shrink-0 tabular-nums text-ink-500"
              : "shrink-0 font-semibold tabular-nums text-ink-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
