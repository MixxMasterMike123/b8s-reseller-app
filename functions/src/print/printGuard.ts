// printGuard.ts — auth + scope for the print-shop CALLABLES.
//
// The print_shop role gets ZERO direct Firestore/Storage access (document-level
// rules can't field-scope an order's customer PII). All access flows through the
// callables in this folder, which enforce scope HERE by reading the caller's LIVE
// users/{uid} doc — so deactivating or re-roling a printer takes effect immediately
// (no token-TTL window, matching the firestore.rules "authority from the doc" rule).
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/database';

export interface PrintShopContext {
  uid: string;
  printShopShops: string[]; // the shops this printer is allowed to fulfil
}

/**
 * Assert the caller is an ACTIVE print_shop user; return their allowed shop list.
 * Throws (unauthenticated / permission-denied) otherwise. Reads the live doc.
 */
export async function getPrintShopContext(authUid?: string): Promise<PrintShopContext> {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const snap = await db.collection('users').doc(authUid).get();
  const data = snap.exists ? snap.data() : null;
  if (!data || data.role !== 'print_shop' || data.active !== true) {
    throw new HttpsError('permission-denied', 'Print shop access required');
  }
  const shops = Array.isArray(data.printShopShops) ? data.printShopShops.filter((s: any) => typeof s === 'string') : [];
  if (shops.length === 0) {
    // A printer with no assigned shops can see nothing — explicit, not a silent empty.
    throw new HttpsError('permission-denied', 'No shops assigned to this print account');
  }
  return { uid: authUid, printShopShops: shops };
}

/** Assert an order's shop is one the caller may fulfil (per-resource scope check). */
export function assertShopAllowed(ctx: PrintShopContext, shopId: string): void {
  if (!shopId || !ctx.printShopShops.includes(shopId)) {
    throw new HttpsError('permission-denied', 'This order is not in your assigned shops');
  }
}
