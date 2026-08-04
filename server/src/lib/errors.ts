/**
 * HTTP status codes here are the sole signal the frontend's `request()`
 * helper (src/lib/api/index.ts) uses to pick an `ApiErrorCode`:
 *   400 -> validation   401 -> unauthorized   403 -> forbidden
 *   404 -> not_found    409 -> conflict       429 -> rate_limited
 *   5xx -> server
 * The response body's `message` and `fieldErrors` are read verbatim, so both
 * must always be present on an error response.
 */

/**
 * A handful of frontend ApiErrorCode values (payment_failed,
 * payment_unavailable, upload_failed) have no natural HTTP status of their
 * own. For those, the server sets an explicit `code` in the JSON body, which
 * the frontend's request() helper prefers over its status-based mapping.
 * Everything else is inferred from the HTTP status as before.
 */
export type ExplicitErrorCode = "payment_failed" | "payment_unavailable" | "host_not_ready" | "upload_failed";

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  code?: ExplicitErrorCode;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
    code?: ExplicitErrorCode,
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }

  toJSON() {
    return { message: this.message, fieldErrors: this.fieldErrors, code: this.code };
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string>) =>
  new ApiError(400, message, fieldErrors);
export const unauthorized = (message = "You are signed out.") => new ApiError(401, message);
export const forbidden = (message = "You do not have access to this.") => new ApiError(403, message);
export const notFound = (message = "We could not find that.") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);
export const rateLimited = (message = "Too many attempts. Try again shortly.") =>
  new ApiError(429, message);
export const paymentUnavailable = (message: string) => new ApiError(402, message, undefined, "payment_unavailable");
export const paymentFailed = (message: string) => new ApiError(402, message, undefined, "payment_failed");
export const hostNotReady = (message: string) => new ApiError(409, message, undefined, "host_not_ready");
export const uploadFailed = (message: string) => new ApiError(422, message, undefined, "upload_failed");
