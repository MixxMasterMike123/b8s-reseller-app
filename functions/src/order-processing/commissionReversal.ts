/**
 * Reverses affiliate commission when an order is cancelled or refunded.
 * Without this, affiliates keep (and can be paid out) commission on orders
 * that never shipped.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/database';

const REVERSAL_STATUSES = ['cancelled', 'refunded'];

export const reverseAffiliateCommissionOnCancel = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    database: 'b8s-reseller-db',
    region: 'us-central1',
    memory: '256MiB'
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const becameReversed =
      !REVERSAL_STATUSES.includes(before.status) &&
      REVERSAL_STATUSES.includes(after.status);

    if (!becameReversed) return;
    if (!after.affiliateId || !after.affiliateCommission || after.commissionReversed) return;

    const orderId = event.params.orderId;
    const commission = after.affiliateCommission;

    console.log(`Reversing affiliate commission ${commission} for ${after.status} order ${orderId} (affiliate ${after.affiliateId})`);

    try {
      await db.runTransaction(async (tx) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists || orderSnap.data()?.commissionReversed) return;

        const affiliateRef = db.collection('affiliates').doc(after.affiliateId);
        const affiliateSnap = await tx.get(affiliateRef);
        if (affiliateSnap.exists) {
          tx.update(affiliateRef, {
            'stats.balance': FieldValue.increment(-commission),
            'stats.totalEarnings': FieldValue.increment(-commission),
            'stats.conversions': FieldValue.increment(-1)
          });
        }

        tx.update(orderRef, {
          commissionReversed: true,
          commissionReversedAt: FieldValue.serverTimestamp()
        });
      });
      console.log(`✅ Commission reversed for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to reverse commission for order ${orderId}:`, error);
      throw error; // let the trigger retry
    }
  }
);
