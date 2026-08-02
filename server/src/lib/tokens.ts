import crypto from "node:crypto";

/**
 * Raw tokens (emailed / returned to the caller) are never stored — only their
 * SHA-256 digest is, so a database read alone can never forge a valid
 * verification or reset link.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O

function referenceBlock(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += REFERENCE_ALPHABET[bytes[i]! % REFERENCE_ALPHABET.length];
  }
  return out;
}

/** Human-readable reservation reference, e.g. "PP-4KD9-27XA". */
export function newReservationReference(): string {
  return `PP-${referenceBlock(4)}-${referenceBlock(4)}`;
}

/** Support ticket reference, e.g. "SUP-4KD9-27XA". */
export function newTicketReference(): string {
  return `SUP-${referenceBlock(4)}-${referenceBlock(4)}`;
}

/** URL-safe slug suffix appended to a listing title. */
export function slugify(title: string, uniqueSuffix: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "space"}-${uniqueSuffix.toLowerCase().slice(-8)}`;
}
