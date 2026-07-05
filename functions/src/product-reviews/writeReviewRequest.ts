// Native product reviews: the order trigger. When a B2C order transitions into a
// "qualifying" (fulfilled) status for the FIRST time, this writes ONE
// reviewRequests/{orderId} doc scheduled for a later email (sent by sweep.ts).
//
// Modelled on order-processing/commissionReversal.ts — the proven named-DB
// onDocumentUpdated trigger (database:'b8s-reseller-db'). Idempotent: the
// reviewRequests doc id IS the orderId, so a second qualifying transition (or a
// retry) is a no-op via the existence check.
//
// PRIVACY: the doc holds email + item names (needed to send + resolve the
// review). It lives in the rules-locked reviewRequests collection (function-only)
// and is never client-readable. The public storefront reaches it only through the
// scoped resolveReviewRequest callable (which returns NO PII).

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { db } from '../config/database';
import { generateToken } from './tokens';

// A fulfilled order the buyer can meaningfully review. Mirrors the storefront's
// fulfillment vocabulary (shipped / delivered / picked up).
const QUALIFYING = ['shipped', 'delivered', 'ready_for_pickup'];

const DEFAULT_DELAY_DAYS = 7;
const MIN_DELAY_DAYS = 3;
const MAX_DELAY_DAYS = 21;
const EXPIRY_DAYS = 180;

// Flatten an i18n name object → a plain display string, strip control chars, cap.
function flattenName(name: any): string {
  let s = '';
  if (typeof name === 'string') {
    s = name;
  } else if (name && typeof name === 'object') {
    s = name['sv-SE'] || name['en-GB'] || name['en-US'] || '';
    if (!s) {
      const first = Object.values(name).find((v) => typeof v === 'string' && v.trim());
      s = typeof first === 'string' ? first : '';
    }
  }
  // Strip control chars, collapse whitespace, cap length.
  return String(s).replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export const onOrderReviewQualify = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db',
    region: 'us-central1',
    memory: '256MiB',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Strictly B2C only. B2B / other sources never get a review request.
    if (after.source !== 'b2c') return;

    // First-time transition into a qualifying (fulfilled) status.
    const becameQualifying =
      !QUALIFYING.includes(before.status) && QUALIFYING.includes(after.status);
    if (!becameQualifying) return;

    const orderId = event.params.orderId;

    try {
      // Idempotency: doc id == orderId. If it already exists, we've already
      // scheduled a request for this order — nothing to do.
      const reqRef = db.collection('reviewRequests').doc(orderId);
      const existing = await reqRef.get();
      if (existing.exists) return;

      const shopId: string = after.shopId || '';
      const customerEmail: string = after.customerInfo?.email || '';
      if (!shopId || !customerEmail) {
        logger.info('product-reviews: skipping request (missing shopId/email)', { orderId });
        return;
      }
      const emailNorm = customerEmail.trim().toLowerCase();
      if (!emailNorm) return;

      // Build the reviewable items from the order lines. Flatten i18n names here
      // (the sweep/template flatten defensively too). Only carry the minimal
      // fields the review flow needs.
      const rawItems = Array.isArray(after.items) ? after.items : [];
      const seen = new Set<string>();
      const items: Array<{ productId: string; sku: string; name: string; image?: string }> = [];
      for (const it of rawItems) {
        const productId = it?.productId || it?.id || '';
        if (!productId || seen.has(productId)) continue; // one review row per product
        seen.add(productId);
        const item: { productId: string; sku: string; name: string; image?: string } = {
          productId,
          sku: typeof it?.sku === 'string' ? it.sku : '',
          name: flattenName(it?.name) || 'Produkt',
        };
        const image = it?.image || it?.imageUrl || '';
        if (typeof image === 'string' && image) item.image = image;
        items.push(item);
      }
      if (items.length === 0) {
        logger.info('product-reviews: skipping request (no reviewable items)', { orderId });
        return;
      }

      // Per-shop delay (clamped). Best-effort read; default on any error.
      let requestDelayDays = DEFAULT_DELAY_DAYS;
      try {
        const shopSnap = await db.collection('shops').doc(shopId).get();
        const n = Number(shopSnap.data()?.productReviews?.requestDelayDays);
        if (Number.isFinite(n)) {
          requestDelayDays = Math.min(MAX_DELAY_DAYS, Math.max(MIN_DELAY_DAYS, Math.round(n)));
        }
      } catch (e: any) {
        logger.warn('product-reviews: shop delay read failed, using default', {
          orderId,
          error: e?.message,
        });
      }

      const now = Date.now();
      const dueAt = new Date(now + requestDelayDays * 86400 * 1000);
      const expiresAt = new Date(now + EXPIRY_DAYS * 86400 * 1000);
      const language: string = after.customerInfo?.preferredLang || 'sv-SE';
      const customerFirstName: string = after.customerInfo?.firstName || '';

      // create() (not set()) — atomic idempotency. Two concurrent qualifying
      // transitions can both pass the exists-check above; set() would then
      // overwrite the token and kill an already-emailed link. ALREADY_EXISTS
      // (code 6) is a benign no-op.
      try {
        await reqRef.create({
          shopId,
          orderId,
          emailNorm,
          customerEmail,
          customerFirstName,
          language,
          items,
          token: generateToken(),
          dueAt,
          expiresAt,
          status: 'scheduled',
          qualifyingStatus: after.status,
          createdAt: new Date(),
        });
      } catch (createError: any) {
        if (createError?.code === 6) return; // ALREADY_EXISTS — another invocation won
        throw createError;
      }

      logger.info('product-reviews: review request scheduled', {
        orderId,
        shopId,
        items: items.length,
        dueAt: dueAt.toISOString(),
      });
    } catch (error: any) {
      logger.error('product-reviews: failed to write review request', {
        orderId,
        error: error?.message,
      });
      throw error; // let the trigger retry
    }
  }
);
