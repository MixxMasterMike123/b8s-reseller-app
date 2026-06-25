// cancelB2BOrder — let a B2B customer cancel their OWN Faktura order while it is
// still 'pending' (before the shop has invoiced). Server-side because the orders
// update rule is admin-only (`allow update: if isAdminOfShop`) — clients can't
// write orders directly. This keeps that rule intact and enforces ownership +
// the cancel-window in trusted code.
//
// SECURITY (Admin SDK bypasses Firestore rules — enforced here):
//  - caller authenticated;
//  - the order is source:'b2b' AND its b2bCustomerId links to a b2bCustomers doc
//    whose firebaseAuthUid == the caller (the customer owns it) — OR the caller
//    is an admin of the order's shop;
//  - the order status is exactly 'pending' (the only self-cancellable state;
//    once invoiced/paid/shipped the customer must contact the shop — an admin
//    can still cancel via the normal admin status workflow).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/database';
import { appUrls } from '../config/app-urls';
import { requireAdminOfShop } from '../email-orchestrator/functions/authGuard';

interface CancelB2BOrderRequest {
  orderId: string;
}

export const cancelB2BOrder = onCall<CancelB2BOrderRequest>(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, cors: appUrls.CORS_ORIGINS },
  async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid) throw new HttpsError('unauthenticated', 'Authentication required');

    const { orderId } = request.data || ({} as CancelB2BOrderRequest);
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');
    const order = orderSnap.data() as Record<string, any>;

    if (order.source !== 'b2b') {
      throw new HttpsError('failed-precondition', 'Not a B2B order');
    }

    // Authorize: the owning B2B customer, OR an admin of the order's shop.
    let isOwner = false;
    if (order.b2bCustomerId) {
      const custSnap = await db.collection('b2bCustomers').doc(order.b2bCustomerId).get();
      isOwner = custSnap.exists && custSnap.data()?.firebaseAuthUid === authUid;
    }
    if (!isOwner) {
      // requireAdminOfShop throws permission-denied for a non-admin or wrong-shop
      // admin; shopId is the order's OWN shopId (trustworthy).
      await requireAdminOfShop(order.shopId, authUid);
    }

    // Cancel-window: only while pending.
    if (order.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        'Order can no longer be cancelled — please contact the shop.'
      );
    }

    const now = new Date();
    await orderRef.update({
      status: 'cancelled',
      updatedAt: now,
      statusHistory: [
        ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
        { from: 'pending', to: 'cancelled', changedBy: authUid, changedAt: now, via: 'cancelB2BOrder' },
      ],
    });

    return { success: true, orderId, status: 'cancelled' };
  }
);
