// Tenancy config — the single source of truth for "which shop is this?".
//
// The platform is becoming multi-tenant: every shop is a `shops/{shopId}`
// entity and all shop data is scoped by `shopId` (see
// docs/SUPERADMIN_TENANCY_PLAN.md). This file owns BOTH the default shop id
// and the path-grammar parsing, so there is exactly one place that knows how a
// URL maps to a shop — no duplicated parsing that can drift.
//
// Phase 0b (current): PATH-PREFIX grammar. Every storefront URL carries the
// shopId as the first path segment: `/{shopId}`, `/{shopId}/product/:slug`,
// `/{shopId}/cart`, etc. The bare `/` redirects to `/{DEFAULT_SHOP_ID}`.
// resolveShopId derives the shop from segment[0]. This file is the SINGLE
// source of truth for the path grammar — no duplicated parsing elsewhere.

// The internal id of the existing/first shop. This is a DATA key, never shown
// to customers — the customer-facing brand is meteorpr / per-shop config.
// Kept as 'b8shield' to match the immutable Firebase project/data identifiers
// so the seed + any future backfill align with existing internal references.
export const DEFAULT_SHOP_ID = 'b8shield';

// Legacy 2-letter country codes that USED to be segment[0] (pre-/se-removal).
// A stale link may still land here mid-redirect; treat such a first segment as
// "no shop" → default. LegacyCountryRedirect handles the actual redirect.
export const COUNTRY_PREFIXES = ['se', 'gb', 'us'];

// First-segment values that are NOT shopIds — app surfaces / credential routes
// that can appear at the root before a shop prefix is applied. Treated as "no
// shop → default" so they never get mistaken for a tenant id.
const NON_SHOP_FIRST_SEGMENTS = new Set([
  ...COUNTRY_PREFIXES,
  'login', 'register', 'forgot-password', 'reset-password',
  'affiliate-login', '__', 'account',
]);

/**
 * Resolve the current shopId from a URL pathname.
 *
 * Path-prefix grammar: segment[0] is the shopId (e.g. /sillmans/cart →
 * 'sillmans'). Falls back to DEFAULT_SHOP_ID for the bare root and for known
 * non-shop first segments (legacy country codes, credential routes).
 *
 * NOTE: this does NOT validate that the shopId exists — that's done at render
 * (ShopContext/StoreSettings) so an unknown/disabled shop can show an
 * "unavailable" state rather than silently falling back to the default.
 *
 * @param {string} [pathname] - e.g. window.location.pathname
 * @returns {string} the resolved shopId
 */
export const resolveShopId = (pathname) => {
  const path = typeof pathname === 'string'
    ? pathname
    : (typeof window !== 'undefined' ? window.location.pathname : '/');
  const first = (path.split('/').filter(Boolean)[0] || '').toLowerCase();
  if (!first || NON_SHOP_FIRST_SEGMENTS.has(first)) return DEFAULT_SHOP_ID;
  return first;
};
