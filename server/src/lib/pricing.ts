import { env, feesConfigured } from "../env.js";

/**
 * Ported from src/lib/api/pricing.ts on the frontend. Kept bit-for-bit
 * identical so a price computed during search preview and the price actually
 * charged at booking never disagree.
 */

export type PriceBreakdown = {
  currency: string;
  subtotalCents: number;
  discountCents?: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  hostEarningsCents?: number;
  hostFeeCents?: number;
  feesKnown: boolean;
};

export function quote(input: {
  pricePerHourCents: number;
  dailyMaxCents?: number | null;
  minutes: number;
  currency: string;
  discountCents?: number;
}): PriceBreakdown {
  const hours = input.minutes / 60;
  const raw = Math.round(input.pricePerHourCents * hours);

  const subtotalCents = input.dailyMaxCents
    ? (() => {
        const days = Math.floor(input.minutes / 1440);
        const remainderMinutes = input.minutes % 1440;
        const remainder = Math.min(
          Math.round(input.pricePerHourCents * (remainderMinutes / 60)),
          input.dailyMaxCents!,
        );
        return days * input.dailyMaxCents! + remainder;
      })()
    : raw;

  const discountCents = input.discountCents ?? 0;
  const discounted = Math.max(0, subtotalCents - discountCents);

  const serviceFeeCents =
    env.SERVICE_FEE_BPS === undefined ? 0 : Math.round((discounted * env.SERVICE_FEE_BPS) / 10000);

  const taxCents =
    env.TAX_BPS === undefined
      ? 0
      : Math.round(((discounted + serviceFeeCents) * env.TAX_BPS) / 10000);

  const hostFeeCents =
    env.HOST_FEE_BPS === undefined ? undefined : Math.round((discounted * env.HOST_FEE_BPS) / 10000);

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

export function estimateHostEarnings(
  pricePerHourCents: number,
  hours: number,
): { grossCents: number; feeCents: number | null; netCents: number | null } {
  const grossCents = Math.round(pricePerHourCents * hours);
  if (env.HOST_FEE_BPS === undefined) {
    return { grossCents, feeCents: null, netCents: null };
  }
  const feeCents = Math.round((grossCents * env.HOST_FEE_BPS) / 10000);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}
