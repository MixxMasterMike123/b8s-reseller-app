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
}

export const validateDiscountCode = onCall<ValidateDiscountCodeRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    const rawCode = (request.data?.code || '').toString().trim().toUpperCase();

    if (!rawCode || rawCode.length > 50) {
      throw new HttpsError('invalid-argument', 'A discount code is required');
    }

    const snapshot = await db
      .collection('affiliates')
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
