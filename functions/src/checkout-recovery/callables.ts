// Abandoned-checkout recovery: the two PUBLIC callables the storefront uses.
//
//  • resolveCheckoutRecovery({ shopId, token }) — the /{shopId}/aterta/:token
//    page calls this on mount to rebuild the cart. Returns ONLY the line refs
//    (productId/variantSku/sku/quantity) — NO prices, NO PII (the client refetches
//    live products and re-adds them through the normal cart path, preserving the
//    total-parity invariant). Invalid/expired → { status:'invalid' }; already paid
//    → { status:'completed' }.
//
//  • unsubscribeCheckout({ shopId, token }) — the /{shopId}/avregistrera/:token
//    page calls this on mount. Writes an idempotent suppression doc keyed on
//    {shopId}_{sha256(emailNorm)} so future reminders for this shop+email are
//    suppressed. Works regardless of the checkout's status.
//
// Both are tenant-scoped: the equality query keys on BOTH shopId AND the raw
// recovery token, so a token only resolves within its own shop.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../config/database';
import { appUrls } from '../config/app-urls';
import { suppressionDocId, emailHash } from './tokens';

const COMMON = {
  region: 'us-central1' as const,
  memory: '256MiB' as const,
  timeoutSeconds: 30,
  cors: appUrls.CORS_ORIGINS,
};

function asTrimmed(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

// Resolve a single checkout doc by (shopId, raw token). Returns null if none.
async function findCheckout(shopId: string, token: string) {
  const q = await db
    .collection('checkouts')
    .where('shopId', '==', shopId)
    .where('recoveryToken', '==', token)
    .limit(1)
    .get();
  return q.empty ? null : q.docs[0];
}

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
}

/**
 * resolveCheckoutRecovery — rebuild the cart from an abandoned checkout.
 * Returns { status:'invalid' | 'completed' | 'open', items? }.
 */
export const resolveCheckoutRecovery = onCall(COMMON, async (request) => {
  const shopId = asTrimmed(request.data?.shopId);
  const token = asTrimmed(request.data?.token);
  if (!shopId || !token) {
    throw new HttpsError('invalid-argument', 'shopId and token are required.');
  }

  const snap = await findCheckout(shopId, token);
  if (!snap) return { status: 'invalid' };

  const c = snap.data() as any;

  // Already paid → tell the client (it shows a friendly "already completed").
  if (c.status === 'completed') return { status: 'completed' };

  // Expiry: past the 7-day window (or an explicit expiresAt) → invalid.
  const expMs = toMillis(c.expiresAt);
  if (expMs && expMs <= Date.now()) return { status: 'invalid' };

  // Open (or reminded, or failed — still recoverable so the buyer can complete):
  // return ONLY the line refs. No prices, no PII — the client refetches live
  // products and re-adds through the normal cart path (total-parity).
  const items = (Array.isArray(c.items) ? c.items : []).map((it: any) => ({
    productId: it?.productId || '',
    variantSku: it?.variantSku || '',
    sku: it?.sku || '',
    quantity: Number(it?.quantity) || 1,
  }));
  return { status: 'open', items };
});

/**
 * unsubscribeCheckout — suppress future reminders for this shop + email.
 * Idempotent; works regardless of the checkout's status. Returns { success:true }.
 */
export const unsubscribeCheckout = onCall(COMMON, async (request) => {
  const shopId = asTrimmed(request.data?.shopId);
  const token = asTrimmed(request.data?.token);
  if (!shopId || !token) {
    throw new HttpsError('invalid-argument', 'shopId and token are required.');
  }

  const snap = await findCheckout(shopId, token);
  if (!snap) {
    // Generic error — never reveal whether a token exists.
    throw new HttpsError('not-found', 'Not found.');
  }

  const c = snap.data() as any;
  const emailNorm: string = c.emailNorm || '';
  if (!emailNorm) {
    // Nothing to suppress on (shouldn't happen — emailNorm is always written).
    return { success: true };
  }

  try {
    await db
      .collection('checkoutSuppressions')
      .doc(suppressionDocId(shopId, emailNorm))
      .set(
        {
          shopId,
          emailHash: emailHash(emailNorm),
          createdAt: new Date(),
          source: 'unsubscribe',
        },
        { merge: true }
      );
  } catch (e: any) {
    logger.warn('checkout-recovery: unsubscribe write failed', { error: e?.message });
    // Still return success — the page is idempotent and the user shouldn't see
    // a scary error for a suppression that will be retried on the next click.
  }

  return { success: true };
});
