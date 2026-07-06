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
//
// 'admin' is reserved here (architecture: reserve admin/platform/api/www from
// tenant registration). It matters for resolution: the shop-admin surface lives
// at /admin/* (no shop prefix), so without this, resolveShopId('/admin/products')
// would return the literal 'admin' as the shopId and every admin query would
// scope to a non-existent shop. Reserving it makes the admin surface resolve to
// DEFAULT_SHOP_ID — the shop it manages — which is also the baseline an operator
// reverts to when ending impersonation (P4.3). 'platform' is reserved for the
// same reason (its surface is a separate host, but defensive).
export const NON_SHOP_FIRST_SEGMENTS = new Set([
  ...COUNTRY_PREFIXES,
  'login', 'register', 'forgot-password', 'reset-password',
  'affiliate-login', '__', 'account', 'admin', 'platform',
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

/**
 * True when the path has NO real shop in it — the bare root or a non-shop first
 * segment (credential routes, legacy country codes, admin/platform). On such a
 * path resolveShopId() FALLS BACK to DEFAULT_SHOP_ID; callers that build links
 * (getCountryAwareUrl) use this to avoid manufacturing a /{DEFAULT_SHOP_ID}
 * store URL out of thin air — a shopless context has no storefront to link to,
 * so links resolve to the platform Landing Page instead. (Decided 2026-06-25:
 * a shopless context must never default into the b8shield store.)
 *
 * @param {string} [pathname]
 * @returns {boolean}
 */
export const isShoplessPath = (pathname) => {
  const path = typeof pathname === 'string'
    ? pathname
    : (typeof window !== 'undefined' ? window.location.pathname : '/');
  const first = (path.split('/').filter(Boolean)[0] || '').toLowerCase();
  return !first || NON_SHOP_FIRST_SEGMENTS.has(first);
};
