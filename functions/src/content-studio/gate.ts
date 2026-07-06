// Content Studio ("Innehållsstudio") — shared auth + feature gate.
//
// Unlike most add-ons (default-ON; see config/shopFeatures.isShopFeatureEnabled),
// Content Studio is OPT-IN: the AI content generator is a paid capability, so it
// is enabled ONLY when shops/{shopId}.features.contentStudio === true (explicit
// boolean true). A missing doc, a missing key, or an unreadable doc all resolve
// to DISABLED — the opposite failure mode from the default-ON add-ons, on
// purpose. The platform operator bypasses the gate entirely.

import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/database';
import { requireAdminOfShop, AdminContext } from '../email-orchestrator/functions/authGuard';

// Assert the caller may use Content Studio for `shopId`:
//   1. requireAdminOfShop — a shop admin only on their OWN shop, platform on any
//      (Admin SDK bypasses Firestore rules, so the boundary is enforced here).
//   2. contentStudio feature must be explicitly true for the shop, UNLESS the
//      caller is the platform operator (who may use it regardless).
// Returns { shopId (trimmed), ctx, data } so callers reuse the loaded shop doc.
export async function requireContentStudio(
  rawShopId: string | undefined,
  uid?: string
): Promise<{ shopId: string; ctx: AdminContext; data: Record<string, any> }> {
  const shopId = (rawShopId || '').trim();
  if (!shopId) throw new HttpsError('invalid-argument', 'shopId krävs.');

  const ctx = await requireAdminOfShop(shopId, uid);

  const snap = await db.collection('shops').doc(shopId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', `Butiken "${shopId}" finns inte.`);
  }
  const data = snap.data() || {};

  // Opt-in gate: explicit true required. Platform bypasses.
  if (!ctx.platform && data.features?.contentStudio !== true) {
    throw new HttpsError(
      'failed-precondition',
      'Innehållsstudio är inte aktiverad för den här butiken.'
    );
  }

  return { shopId, ctx, data };
}

// The brand name to seed prompts with: prefer the storefront shop name, then a
// generic name field, else the shop id. Kept here so both callables agree.
export function shopBrandName(shopId: string, data: Record<string, any>): string {
  return (
    data.storeIdentity?.shopName ||
    data.name ||
    shopId
  );
}

// A media path belongs to this shop if it lives under the persistent library
// (content-studio/{shopId}/) or the disposable quick-upload area
// (content-studio-quick/{shopId}/ — auto-purged by a bucket lifecycle rule,
// never listed in the library). Both callables validate against this.
export function isShopMediaPath(shopId: string, p: string): boolean {
  return (
    p.startsWith(`content-studio/${shopId}/`) ||
    p.startsWith(`content-studio-quick/${shopId}/`)
  );
}
