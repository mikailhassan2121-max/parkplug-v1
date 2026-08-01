/**
 * Business configuration.
 *
 * Anything ParkPlug has not confirmed is `null` here rather than guessed. The
 * UI renders an explicit placeholder wherever a value is missing, so no
 * invented company name, fee, email address, or policy term can ever reach a
 * public page. Fill these in (or set the matching environment variables) as
 * the real details are confirmed.
 */

function envInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function envString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Placeholder token rendered wherever a legal or business value is unknown. */
export const PLACEHOLDER = {
  legalName: "[LEGAL BUSINESS NAME]",
  mailingAddress: "[MAILING ADDRESS]",
  supportEmail: "[SUPPORT EMAIL]",
  privacyEmail: "[PRIVACY EMAIL]",
  governingState: "[GOVERNING STATE]",
  serviceFee: "[SERVICE FEE RATE]",
  hostFee: "[HOST FEE RATE]",
  effectiveDate: "[EFFECTIVE DATE]",
  responseTime: "[RESPONSE TIME]",
} as const;

export const business = {
  /** Consumer-facing brand. This one is known. */
  brandName: "ParkPlug",

  /**
   * Registered legal entity. Left null until confirmed — the footer and legal
   * pages fall back to brand-only wording rather than asserting an entity.
   */
  legalName: envString(process.env.NEXT_PUBLIC_LEGAL_NAME),
  mailingAddress: envString(process.env.NEXT_PUBLIC_MAILING_ADDRESS),
  supportEmail: envString(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  privacyEmail: envString(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
  governingState: envString(process.env.NEXT_PUBLIC_GOVERNING_STATE),

  /** Effective date printed on legal pages. */
  policyEffectiveDate: envString(process.env.NEXT_PUBLIC_POLICY_EFFECTIVE_DATE),

  /**
   * Fees in basis points (1000 = 10%). Null means "not yet confirmed"; the
   * pricing page shows a placeholder and checkout explains that the total
   * cannot be finalised until fees are configured.
   */
  serviceFeeBps: envInt(process.env.NEXT_PUBLIC_SERVICE_FEE_BPS),
  hostFeeBps: envInt(process.env.NEXT_PUBLIC_HOST_FEE_BPS),
  /** Sales tax in basis points, where applicable. */
  taxBps: envInt(process.env.NEXT_PUBLIC_TAX_BPS),

  /**
   * Social profiles. Only rendered when a real URL is present — the footer
   * shows no social row at all while these are null.
   */
  social: {
    instagram: envString(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
    facebook: envString(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK),
    x: envString(process.env.NEXT_PUBLIC_SOCIAL_X),
    linkedin: envString(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
  },

  /**
   * Support response-time commitment. Null means the support page makes no
   * promise about how quickly a reply arrives.
   */
  supportResponseTime: envString(process.env.NEXT_PUBLIC_SUPPORT_RESPONSE_TIME),

  /**
   * Whether listings go live automatically or after a review. Defaults to
   * review, which matches the wording used across the host flow.
   */
  listingsAutoPublish: process.env.NEXT_PUBLIC_LISTINGS_AUTO_PUBLISH === "true",
} as const;

export const siteUrl =
  envString(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://parkplug.example";

/** True once a payment provider publishable key is present. */
export const paymentsConfigured = Boolean(
  envString(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
);

/** True once fees are known well enough to quote a final total. */
export const feesConfigured = business.serviceFeeBps !== null;

/** Formats a basis-point rate as a percentage, or the placeholder if unknown. */
export function formatBps(bps: number | null, placeholder: string): string {
  if (bps === null) return placeholder;
  const pct = bps / 100;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`;
}

/** Legal entity for policy pages, falling back to the placeholder token. */
export function legalEntity(): string {
  return business.legalName ?? PLACEHOLDER.legalName;
}

/** Footer copyright line — brand-only when no entity is confirmed. */
export function copyrightHolder(): string {
  return business.legalName ?? business.brandName;
}
