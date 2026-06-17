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
import { DEFAULT_SHOP_ID } from './tenancy';

// Multi-tenant config lives at shops/{shopId}. During the migration the seed
// (settings/app.storeIdentity → shops/{shopId}) may not have run yet, so this
// seam transparently FALLS BACK to the legacy settings/app doc: reads prefer
// shops/{shopId} but use settings/app if the shop doc doesn't exist yet, and
// writes target shops/{shopId} only once it exists, else settings/app. This
// keeps the live site identical before AND after the seed — no flag day.
const tenantRef = (shopId) => doc(db, 'shops', shopId || DEFAULT_SHOP_ID);
const legacyRef = () => doc(db, 'settings', 'app');

// Per-shopId probe cache. Stores the EXISTING tenant snapshot (truthy) or
// `false` when the seed hasn't run — NOT a boolean. Caching the same value we
// return keeps the type consistent across the first and subsequent calls, so
// loadShopConfig can safely treat the result as a snapshot when truthy.
const tenantProbe = new Map();
const probeTenantDoc = async (shopId) => {
  const key = shopId || DEFAULT_SHOP_ID;
  if (tenantProbe.has(key)) return tenantProbe.get(key);
  const snap = await getDoc(tenantRef(key));
  // The snapshot doubles as both "exists" (truthy) and the data source, so
  // loadShopConfig avoids a second read. `false` means seed-not-run.
  const result = snap.exists() ? snap : false;
  tenantProbe.set(key, result);
  return result;
};

// Read the saved storeIdentity object (or {} if missing). Prefers the tenant
// doc; falls back to settings/app while the seed hasn't run. Never throws on a
// missing doc; a genuine error (rules/offline) still rejects so callers degrade.
export const loadShopConfig = async (shopId) => {
  const probed = await probeTenantDoc(shopId);
  if (probed) {
    // probed is the existing tenant snapshot — reuse it, no second read.
    return probed.data()?.storeIdentity || {};
  }
  // Seed not run yet → read the legacy doc.
  const legacy = await getDoc(legacyRef());
  if (!legacy.exists()) return {};
  return legacy.data()?.storeIdentity || {};
};

// Read the per-shop add-on entitlement map (`shops/{shopId}.features`), or {}
// if missing. Reuses the same tenant probe cache as loadShopConfig — no extra
// read on the common path. The legacy settings/app doc has no `features` field,
// so when the seed hasn't run this returns {} → every feature reads default-ON
// (see useShopFeatures). `features` is the entitlement layer, distinct from the
// platform kill-switch `status`. Written only from the platform console.
export const loadShopFeatures = async (shopId) => {
  const probed = await probeTenantDoc(shopId);
  if (probed) {
    const f = probed.data()?.features;
    return f && typeof f === 'object' ? f : {};
  }
  // Seed not run yet → no per-shop features doc; default-ON everywhere.
  return {};
};

// Merge-write a partial storeIdentity patch.
//  • DEFAULT shop: targets shops/{default} once it exists, else the legacy
//    settings/app doc — preserving the pre-tenancy single-shop behavior exactly.
//  • NON-DEFAULT shop (e.g. 'sillmans'): ALWAYS targets shops/{shopId},
//    CREATING it via merge if it doesn't exist yet. It must NEVER fall back to
//    the shared settings/app doc — that would clobber the default shop's config
//    with another tenant's data (cross-tenant data loss). The storefront reads
//    the same shops/{shopId} for non-default shops, so the round-trip matches.
export const saveShopConfig = async (patch, shopId) => {
  const id = shopId || DEFAULT_SHOP_ID;
  let ref;
  if (id === DEFAULT_SHOP_ID) {
    const exists = await probeTenantDoc(id);
    ref = exists ? tenantRef(id) : legacyRef();
  } else {
    // Non-default tenant: own doc only (create-on-merge); no legacy fallback.
    ref = tenantRef(id);
  }
  await setDoc(
    ref,
    { storeIdentity: patch, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  // The doc now exists — invalidate the probe cache so a subsequent
  // loadShopConfig in this session reads the tenant doc, not the legacy fallback.
  tenantProbe.delete(id);
};
