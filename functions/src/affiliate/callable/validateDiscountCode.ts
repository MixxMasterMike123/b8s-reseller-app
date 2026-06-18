/**
 * Validates an affiliate/discount code for the storefront cart.
 * Replaces the client-side `affiliates` collection query, which would expose
 * affiliate PII (email, earnings) to anonymous visitors under locked-down
 * Firestore rules. Returns only what checkout needs.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../../config/database';
import { isShopFeatureEnabled } from '../../config/shopFeatures';

interface ValidateDiscountCodeRequest {
  code: string;
  shopId: string;
}

export const validateDiscountCode = onCall<ValidateDiscountCodeRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    const rawCode = (request.data?.code || '').toString().trim().toUpperCase();
    // TENANT ISOLATION: affiliate codes are unique only WITHIN a shop, so the
    // lookup must be scoped to the storefront's own shop. This isn't an
    // authority check (the caller is an anonymous shopper) — it's correctness:
    // a code belonging to shop B must not validate (or leak its discount) on
    // shop A's storefront. The storefront passes its own shopId (known from the
    // URL/shop context).
    const shopId = (request.data?.shopId || '').toString().trim();

    if (!rawCode || rawCode.length > 50) {
      throw new HttpsError('invalid-argument', 'A discount code is required');
    }
    if (!shopId) {
      throw new HttpsError('invalid-argument', 'A shopId is required');
    }

    const snapshot = await db
      .collection('affiliates')
      .where('shopId', '==', shopId)
      .where('affiliateCode', '==', rawCode)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { valid: false };
    }

    const affiliate = snapshot.docs[0].data();

    // Defense-in-depth: if the affiliate's shop has the affiliate add-on
    // disabled, the code is not valid here either (matches the createPaymentIntent
    // gate + the client). Default-ON, so existing shops are unaffected.
    if (!(await isShopFeatureEnabled(affiliate.shopId, 'affiliate'))) {
      return { valid: false };
    }

    return {
      valid: true,
      code: rawCode,
      checkoutDiscount: affiliate.checkoutDiscount || 0
    };
  }
);
