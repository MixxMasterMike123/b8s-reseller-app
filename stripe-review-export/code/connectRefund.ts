// ============================================================================
// EXTRACT for legal review — the refund handler. Verbatim; secret is an env
// reference (no value). Refund param shape is decided by buildRefundParams
// (see connectParams.ts in this bundle).
// from: functions/src/payment/connectRefund.ts L40-79
// ============================================================================

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

const key = (process.env.STRIPE_SECRET_KEY || '').trim();   // value = <REDACTED>
if (!key) throw new HttpsError('failed-precondition', 'Stripe is not configured');
const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

const isConnect = order.connect?.isDestinationCharge === true;
// Pure builder (connectParams.ts): a destination-charge order gets
// reverse_transfer + refund_application_fee; a legacy order is plain.
const params = buildRefundParams(order, request.data?.amount) as Stripe.RefundCreateParams;

const refund = await stripe.refunds.create(params);

const patch: Record<string, any> = {
  status: 'refunded',
  updatedAt: FieldValue.serverTimestamp(),
  'payment.refundId': refund.id,
  'payment.refundedAt': FieldValue.serverTimestamp(),
};
if (isConnect) patch['connect.transferReversed'] = true;
await orderRef.update(patch);

return { refundId: refund.id, isConnect, amount: refund.amount };

// NOTE for the reviewer:
//  - For a Connect (destination-charge) order the refund includes
//    reverse_transfer + refund_application_fee → the principal is clawed back
//    from the SHOP's connected account and the platform fee is returned, so a
//    voluntary refund is NOT borne by the platform. (Disputes/chargebacks are
//    different — see stripeWebhook.handlers.ts notes: those hit the platform.)
