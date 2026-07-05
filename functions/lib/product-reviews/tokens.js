"use strict";
// Native product reviews ("Recensioner" add-on): token + email-minimization
// helpers. Copied locally from checkout-recovery/tokens.ts (same shapes) so the
// two add-ons stay independent.
//
// - generateToken(): a 32-byte URL-safe (base64url) opaque token stored RAW on
//   the reviewRequests/{orderId} doc (`token`). The `reviewRequests` collection
//   is rules-locked (allow read, write: if false), so hashing at rest adds
//   nothing while the doc already holds email + items; the callables validate by
//   direct equality query on the raw token.
// - emailHash(): SHA-256 hex of the NORMALIZED email — used as the emailHash
//   component on productReviews docs + as the id component of a
//   reviewSuppressions doc, so we never persist a raw email in either.
// - suppressionDocId(): the deterministic `${shopId}_${sha256(emailNorm)}` id so
//   suppression is idempotent per shop + email.
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressionDocId = exports.emailHash = exports.generateToken = void 0;
const crypto_1 = require("crypto");
/** 32 random bytes as a URL-safe base64 string (no padding). */
function generateToken() {
    return (0, crypto_1.randomBytes)(32).toString('base64url');
}
exports.generateToken = generateToken;
/** SHA-256 (hex) of the already-normalized email. */
function emailHash(emailNorm) {
    return (0, crypto_1.createHash)('sha256').update(emailNorm, 'utf8').digest('hex');
}
exports.emailHash = emailHash;
/** Deterministic suppression doc id, per shop + normalized email. */
function suppressionDocId(shopId, emailNorm) {
    return `${shopId}_${emailHash(emailNorm)}`;
}
exports.suppressionDocId = suppressionDocId;
//# sourceMappingURL=tokens.js.map