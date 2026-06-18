// Shared auth guards for email callables. These functions can send branded
// email to arbitrary recipients, so every privileged one must verify the
// caller — otherwise the system is an open phishing mailer.

import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../../config/database';

export async function requireAdmin(authUid?: string): Promise<void> {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const userDoc = await db.collection('users').doc(authUid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
}

export function requireAuth(authUid?: string): void {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
}

// Platform super-admin only (manages ALL shops). Stricter than requireAdmin:
// the caller's users/{uid} doc must have platform === true. Used by operator-
// only callables (e.g. provisioning a shop admin for any tenant).
export async function requirePlatform(authUid?: string): Promise<void> {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const userDoc = await db.collection('users').doc(authUid).get();
  const data = userDoc.data();
  if (!userDoc.exists || data?.role !== 'admin' || data?.platform !== true) {
    throw new HttpsError('permission-denied', 'Platform access required');
  }
}

// The caller's resolved admin identity (read from their users/{uid} DOC, not the
// token claim — so a demotion/shop-move takes effect immediately, matching the
// firestore.rules convention of reading userDoc()).
export interface AdminContext {
  uid: string;
  role: string;
  platform: boolean;
  shopId: string | null;
}

// Resolve + assert the caller is an admin, returning their tenant context.
// Throws like requireAdmin if not an admin.
export async function getAdminContext(authUid?: string): Promise<AdminContext> {
  if (!authUid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const snap = await db.collection('users').doc(authUid).get();
  const data = snap.data();
  if (!snap.exists || data?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return {
    uid: authUid,
    role: data!.role,
    platform: data?.platform === true,
    shopId: data?.shopId ?? null,
  };
}

// TENANT ISOLATION (the core multi-tenant guard for Admin-SDK functions, which
// BYPASS Firestore security rules — so the shop boundary MUST be enforced here
// in code). Asserts the caller is an admin who may administer `targetShopId`:
// a platform super-admin may act on ANY shop; a shop admin only on their OWN.
// Mirrors isAdminOfShop(shopId) in firestore.rules. Returns the caller context.
//
// IMPORTANT: `targetShopId` must be derived from a TRUSTWORTHY source — the
// resource being mutated (e.g. the target customer/order/affiliate doc's
// shopId), NEVER from a caller-supplied request payload field. Passing the
// request's own shopId here would defeat the check.
export async function requireAdminOfShop(
  targetShopId: string | null | undefined,
  authUid?: string
): Promise<AdminContext> {
  const ctx = await getAdminContext(authUid);
  if (ctx.platform) return ctx; // platform bypasses shop-scoping
  if (!targetShopId || ctx.shopId !== targetShopId) {
    throw new HttpsError(
      'permission-denied',
      'Tenant isolation: not an admin of this shop'
    );
  }
  return ctx;
}
