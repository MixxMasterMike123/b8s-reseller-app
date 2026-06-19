"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
const connectParams_1 = require("./connectParams");
exports.refundOrder = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
    secrets: ['STRIPE_SECRET_KEY'],
}, async (request) => {
    const orderId = (request.data?.orderId || '').trim();
    if (!orderId)
        throw new https_1.HttpsError('invalid-argument', 'orderId is required');
    const orderRef = database_1.db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Order not found');
    const order = snap.data();
    // Authority: derive the shop from the ORDER (trustworthy), not the request.
    await (0, authGuard_1.requireAdminOfShop)(order.shopId, request.auth?.uid);
    // Double-refund guard.
    if (order.status === 'refunded' || order.connect?.transferReversed === true) {
        throw new https_1.HttpsError('failed-precondition', 'Order is already refunded');
    }
    const paymentIntentId = order.payment?.paymentIntentId;
    if (!paymentIntentId)
        throw new https_1.HttpsError('failed-precondition', 'Order has no payment to refund');
    const key = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!key)
        throw new https_1.HttpsError('failed-precondition', 'Stripe is not configured');
    const stripe = new stripe_1.default(key, { apiVersion: '2023-10-16' });
    const isConnect = order.connect?.isDestinationCharge === true;
    // Pure builder (connectParams.ts, unit-tested): a destination-charge order
    // gets reverse_transfer + refund_application_fee; a legacy order is plain.
    const params = (0, connectParams_1.buildRefundParams)(order, request.data?.amount);
    const refund = await stripe.refunds.create(params);
    // Stamp the order. Setting status 'refunded' fires the affiliate-reversal
    // trigger (commissionReversal.ts) — the affiliate ledger reverses on its own.
    const patch = {
        status: 'refunded',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        'payment.refundId': refund.id,
        'payment.refundedAt': firestore_1.FieldValue.serverTimestamp(),
    };
    if (isConnect)
        patch['connect.transferReversed'] = true;
    await orderRef.update(patch);
    return { refundId: refund.id, isConnect, amount: refund.amount };
});
//# sourceMappingURL=connectRefund.js.map