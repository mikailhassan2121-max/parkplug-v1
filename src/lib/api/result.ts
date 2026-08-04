/**
 * Every API call resolves to an `ApiResult`. Callers branch on `ok` and, when
 * it fails, on `error.code` — which maps directly onto the error states the
 * UI is required to render.
 */

export type ApiErrorCode =
  | "network" // request never reached the server
  | "timeout"
  | "unauthorized" // signed out or session expired
  | "forbidden"
  | "not_found"
  | "conflict" // e.g. the space was reserved by someone else first
  | "validation"
  | "rate_limited"
  | "payment_failed"
  | "payment_unavailable"
  | "host_not_ready"
  | "upload_failed"
  | "server"
  | "unknown";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  /** Per-field messages for form validation failures. */
  fieldErrors?: Record<string, string>;
  /** Shown to the user so support can trace the failure. */
  reference?: string;
  /** False when the caller should not offer a retry button. */
  retryable?: boolean;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ApiErrorCode,
  message: string,
  extra: Omit<ApiError, "code" | "message"> = {},
): ApiResult<T> {
  return { ok: false, error: { code, message, retryable: true, ...extra } };
}

/** Human-readable copy for each failure, used by generic error surfaces. */
export const ERROR_COPY: Record<ApiErrorCode, { title: string; description: string }> = {
  network: {
    title: "You appear to be offline",
    description:
      "We could not reach ParkPlugs. Check your connection and try again — nothing you entered has been lost.",
  },
  timeout: {
    title: "That took too long",
    description: "The request timed out before it finished. Please try again.",
  },
  unauthorized: {
    title: "Your session has expired",
    description: "Sign in again to pick up where you left off.",
  },
  forbidden: {
    title: "You do not have access to this",
    description: "This page belongs to a different account.",
  },
  not_found: {
    title: "We could not find that",
    description: "It may have been removed, or the link may be out of date.",
  },
  conflict: {
    title: "That time is no longer available",
    description:
      "Someone reserved this space while you were booking. Choose a different time or another space nearby.",
  },
  validation: {
    title: "Some details need fixing",
    description: "Check the highlighted fields and try again.",
  },
  rate_limited: {
    title: "Too many attempts",
    description: "Wait a moment before trying again.",
  },
  payment_failed: {
    title: "Your payment could not be completed",
    description:
      "No charge was made and your reservation was not created. Try a different payment method.",
  },
  payment_unavailable: {
    title: "Payments are temporarily unavailable",
    description: "We could not reach the payment processor. Your details have been kept.",
  },
  host_not_ready: {
    title: "This space cannot accept bookings yet",
    description: "The host has not finished setting up payouts. Try another space, or check back later.",
  },
  upload_failed: {
    title: "That upload did not finish",
    description: "Check the file size and format, then try again.",
  },
  server: {
    title: "Something went wrong on our end",
    description: "This is not your fault. Try again in a moment.",
  },
  unknown: {
    title: "Something went wrong",
    description: "Try again, and contact support if it keeps happening.",
  },
};
