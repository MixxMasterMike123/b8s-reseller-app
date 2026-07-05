// Abandoned-checkout recovery: token + email-minimization helpers.
//
// - generateToken(): a 32-byte URL-safe (base64url) opaque token stored RAW on
//   the checkouts/{paymentIntentId} doc (`recoveryToken`). The `checkouts`
//   collection is rules-locked (allow read, write: if false), so hashing at rest
//   adds nothing while the doc already holds email + items; the callables validate
//   by direct equality query on the raw token.
// - emailHash(): SHA-256 hex of the NORMALIZED email — used ONLY as the id
//   component of a checkoutSuppressions doc, so we never persist a raw email in
//   the suppression list (email minimization).
// - suppressionDocId(): the deterministic `${shopId}_${sha256(emailNorm)}` id so
//   suppression is idempotent per shop + email.

import { randomBytes, createHash } from 'crypto';

/** 32 random bytes as a URL-safe base64 string (no padding). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 (hex) of the already-normalized email. */
export function emailHash(emailNorm: string): string {
  return createHash('sha256').update(emailNorm, 'utf8').digest('hex');
}

/** Deterministic suppression doc id, per shop + normalized email. */
export function suppressionDocId(shopId: string, emailNorm: string): string {
  return `${shopId}_${emailHash(emailNorm)}`;
}
