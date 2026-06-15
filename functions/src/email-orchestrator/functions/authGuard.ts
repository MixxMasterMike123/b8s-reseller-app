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
