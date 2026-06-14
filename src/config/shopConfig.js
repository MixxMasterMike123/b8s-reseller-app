// Shop config read/write seam — the single place that knows WHERE a shop's
// storefront config lives. Today that's the global Firestore `settings/app`
// doc (`storeIdentity` field). Under the planned multi-tenant model it becomes
// `shops/{shopId}` — and ONLY this file changes, not every caller.
// See docs/ADMIN_STOREFRONT_PLAN.md and memory admin-platform-direction.
//
// All storefront config access (StoreSettingsContext, AdminSettings, the
// upcoming AdminStorefront) goes through loadShopConfig / saveShopConfig so
// the tenancy migration is a one-file change.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Resolve the Firestore doc ref holding this shop's identity/config.
// Single-tenant today → always settings/app. The shopId argument is accepted
// now (callers can start passing it) but currently ignored; when multi-tenant
// lands, this returns doc(db, 'shops', shopId) and nothing else moves.
const shopConfigRef = (/* shopId */) => doc(db, 'settings', 'app');

// Read the saved storeIdentity object (or {} if missing). Never throws on a
// missing doc; callers decide how to merge with their static defaults. A
// genuine error (rules/offline) still rejects so callers can degrade.
export const loadShopConfig = async (shopId) => {
  const snap = await getDoc(shopConfigRef(shopId));
  if (!snap.exists()) return {};
  return snap.data()?.storeIdentity || {};
};

// Merge-write a partial storeIdentity patch. Mirrors the prior AdminSettings
// write exactly: setDoc(..., { storeIdentity, updatedAt }, { merge: true }).
export const saveShopConfig = async (patch, shopId) => {
  await setDoc(
    shopConfigRef(shopId),
    { storeIdentity: patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
};
