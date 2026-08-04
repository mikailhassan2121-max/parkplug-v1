/**
 * Business configuration.
 *
 * Anything ParkPlugs has not confirmed is `null` here rather than guessed
 * (the registered legal entity, ParkPlugs LLC, is the one exception — that
 * name is confirmed, not a placeholder). The UI renders an explicit
 * placeholder wherever a value is genuinely missing, so no invented fee,
 * email address, or policy term can ever reach a public page. Fill the rest
 * in (or set the matching environment variables) as the real details are
 * confirmed.
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

/**
 * Fallback text rendered wherever a legal or business value is unknown.
 * Plain sentences, not bracketed template tokens — a policy page or fee
 * table that visibly says "[LEGAL BUSINESS NAME]" reads as an unfinished
 * template to a real visitor (and to Google/Meta ad review); "the operator
 * of ParkPlugs" reads as a true, if incomplete, sentence. The production
 * build fails outright before any of these can actually ship — see
 * scripts/check-required-env.mjs — so this is the defense-in-depth fallback
 * for any other build path, not the primary safeguard.
 */
export const PLACEHOLDER = {
  legalName: "an entity to be named",
  mailingAddress: "an address not yet published",
  supportEmail: "not yet published",
  privacyEmail: "not yet published",
  governingState: "a jurisdiction to be confirmed",
  serviceFee: "not yet set",
  hostFee: "not yet set",
  effectiveDate: "not yet published",
  responseTime: "not yet published",
} as const;

export const business = {
  /** Consumer-facing brand. This one is known. */
  brandName: "ParkPlugs",

  /**
   * Registered legal entity: ParkPlugs LLC. NEXT_PUBLIC_LEGAL_NAME can still
   * override this (e.g. if the entity structure changes later), but the
   * name itself is confirmed, not a guess — everything else in this file
   * that's still unconfirmed stays null rather than being given a default.
   */
  legalName: envString(process.env.NEXT_PUBLIC_LEGAL_NAME) ?? "ParkPlugs LLC",
  mailingAddress: envString(process.env.NEXT_PUBLIC_MAILING_ADDRESS),
  supportEmail: envString(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  privacyEmail: envString(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
  governingState: envString(process.env.NEXT_PUBLIC_GOVERNING_STATE),

  /** Effective date printed on legal pages. */
  policyEffectiveDate: envString(process.env.NEXT_PUBLIC_POLICY_EFFECTIVE_DATE),

  /**
   * Fees in basis points (1000 = 10%). The commission split is confirmed —
   * ParkPlugs keeps 15% of the driver's subtotal (hostFeeBps, deducted from
   * the host's payout) with no separate markup on top (serviceFeeBps = 0) —
   * so these default rather than reading as unconfirmed. Still overridable
   * via env if the split ever changes. Must match server/src/env.ts.
   */
  serviceFeeBps: envInt(process.env.NEXT_PUBLIC_SERVICE_FEE_BPS) ?? 0,
  hostFeeBps: envInt(process.env.NEXT_PUBLIC_HOST_FEE_BPS) ?? 1500,
  /** Sales tax has no confirmed rate yet, so this one stays genuinely unset. */
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
   * Whether listings go live automatically or after a review. Defaults on —
   * set NEXT_PUBLIC_LISTINGS_AUTO_PUBLISH=false to hold new listings at
   * "in_review" instead. Must match server/src/env.ts's LISTINGS_AUTO_PUBLISH
   * so the "what happens after you submit" copy in the listing wizard stays
   * accurate.
   */
  listingsAutoPublish: process.env.NEXT_PUBLIC_LISTINGS_AUTO_PUBLISH !== "false",
} as const;

export const siteUrl =
  envString(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://parkplug.example";

/** Real key value, for actually loading Stripe.js — null until one is set. */
export const stripePublishableKey = envString(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/** True once a payment provider publishable key is present. */
export const paymentsConfigured = Boolean(stripePublishableKey);

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
