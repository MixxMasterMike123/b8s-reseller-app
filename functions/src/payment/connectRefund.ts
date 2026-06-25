// Stripe refund — Connect-aware (Slice 4).
//
// Refunds an order's payment. For a CONNECT (destination-charge) order the
// refund MUST also claw the money back from the connected account
// (reverse_transfer) and return the platform's cut (refund_application_fee),
// otherwise the platform eats the refund while the shop keeps the transfer.
// A LEGACY (single-account) order takes a plain refund.
//
// Auth: requireAdminOfShop(order.shopId, uid) — the target shop is read from
// the ORDER doc, never a request field (Admin SDK bypasses rules, so the shop
// boundary is enforced here). A shop admin may only refund their OWN shop's
// orders; platform may refund any.
//
// On success the order is moved to status 'refunded' (which fires the existing
// reverseAffiliateCommissionOnCancel trigger → the affiliate ledger reverses
// automatically; no affiliate code here) and order.connect.transferReversed is
// stamped. Double-refund guarded by the existing status / transferReversed.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/database';
import { appUrls } from '../config/app-urls';
import { requireAdminOfShop } from '../email-orchestrator/functions/authGuard';
import { buildRefundParams } from './connectParams';
import { readPlatformConfig } from './platformConfig';

interface RefundRequest { orderId: string; amount?: number } // amount in SEK (optional partial)

export const refundOrder = onCall<RefundRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: appUrls.CORS_ORIGINS,
    secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request) => {
    const orderId = (request.data?.orderId || '').trim();
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
    const order = snap.data() as any;

    // Authority: derive the shop from the ORDER (trustworthy), not the request.
    await requireAdminOfShop(order.shopId, request.auth?.uid);

    // Double-refund guard.
    if (order.status === 'refunded' || order.connect?.transferReversed === true) {
      throw new HttpsError('failed-precondition', 'Order is already refunded');
    }
    const paymentIntentId = order.payment?.paymentIntentId;
    if (!paymentIntentId) throw new HttpsError('failed-precondition', 'Order has no payment to refund');

    const key = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!key) throw new HttpsError('failed-precondition', 'Stripe is not configured');
    const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

    const isConnect = order.connect?.isDestinationCharge === true;
    // Platform policy: should a refund ALSO return the platform fee to the buyer?
    // Default true (current behaviour); settings/platform.refundApplicationFee
    // can flip it to keep the fee as a non-refundable service fee.
    const { refundApplicationFee } = await readPlatformConfig();
    // Pure builder (connectParams.ts, unit-tested): a destination-charge order
    // gets reverse_transfer (+ refund_application_fee per policy); a legacy
    // order is plain.
    const params = buildRefundParams(
      order,
      request.data?.amount,
      refundApplicationFee
    ) as Stripe.RefundCreateParams;

    const refund = await stripe.refunds.create(params);

    // Stamp the order. Setting status 'refunded' fires the affiliate-reversal
    // trigger (commissionReversal.ts) — the affiliate ledger reverses on its own.
    const patch: Record<string, any> = {
      status: 'refunded',
      updatedAt: FieldValue.serverTimestamp(),
      'payment.refundId': refund.id,
      'payment.refundedAt': FieldValue.serverTimestamp(),
    };
    if (isConnect) {
      patch['connect.transferReversed'] = true;
      // Reconciliation: record whether the platform fee was returned on this
      // refund (policy at the time of the refund), so the ledger is auditable.
      patch['connect.refundApplicationFee'] = refundApplicationFee === true;
    }
    await orderRef.update(patch);

    return { refundId: refund.id, isConnect, amount: refund.amount, refundApplicationFee };
  }
);
