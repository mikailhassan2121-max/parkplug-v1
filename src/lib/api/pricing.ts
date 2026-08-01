import { business, feesConfigured } from "@/config/business";
import type { PriceBreakdown } from "@/lib/types";

export type QuoteInput = {
  pricePerHourCents: number;
  dailyMaxCents?: number;
  minutes: number;
  currency: string;
  discountCents?: number;
};

/**
 * Builds the full price breakdown up front so no fee is revealed for the first
 * time at the final step. Returns `feesKnown: false` when platform fees have
 * not been configured, in which case `totalCents` covers the parking subtotal
 * only and the UI must say so rather than presenting it as the final amount.
 */
export function quote(input: QuoteInput): PriceBreakdown & { feesKnown: boolean } {
  const hours = input.minutes / 60;
  const raw = Math.round(input.pricePerHourCents * hours);

  // A daily cap applies per 24-hour block of the reservation.
  const subtotalCents = input.dailyMaxCents
    ? (() => {
        const days = Math.floor(input.minutes / 1440);
        const remainderMinutes = input.minutes % 1440;
        const remainder = Math.min(
          Math.round(input.pricePerHourCents * (remainderMinutes / 60)),
          input.dailyMaxCents,
        );
        return days * input.dailyMaxCents + remainder;
      })()
    : raw;

  const discountCents = input.discountCents ?? 0;
  const discounted = Math.max(0, subtotalCents - discountCents);

  const serviceFeeCents =
    business.serviceFeeBps === null
      ? 0
      : Math.round((discounted * business.serviceFeeBps) / 10000);

  const taxCents =
    business.taxBps === null
      ? 0
      : Math.round(((discounted + serviceFeeCents) * business.taxBps) / 10000);

  const hostFeeCents =
    business.hostFeeBps === null
      ? undefined
      : Math.round((discounted * business.hostFeeBps) / 10000);

  return {
    currency: input.currency,
    subtotalCents,
    discountCents: discountCents || undefined,
    serviceFeeCents,
    taxCents,
    totalCents: discounted + serviceFeeCents + taxCents,
    hostEarningsCents: hostFeeCents === undefined ? undefined : discounted - hostFeeCents,
    hostFeeCents,
    feesKnown: feesConfigured,
  };
}

/** Host's estimated take for a listing at a given rate, when fees are known. */
export function estimateHostEarnings(
  pricePerHourCents: number,
  hours: number,
): { grossCents: number; feeCents: number | null; netCents: number | null } {
  const grossCents = Math.round(pricePerHourCents * hours);
  if (business.hostFeeBps === null) {
    return { grossCents, feeCents: null, netCents: null };
  }
  const feeCents = Math.round((grossCents * business.hostFeeBps) / 10000);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}
