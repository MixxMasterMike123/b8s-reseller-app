// Tenancy config — the single source of truth for "which shop is this?".
//
// The platform is becoming multi-tenant: every shop is a `shops/{shopId}`
// entity and all shop data is scoped by `shopId` (see
// docs/SUPERADMIN_TENANCY_PLAN.md). This file owns BOTH the default shop id
// and the path-grammar parsing, so there is exactly one place that knows how a
// URL maps to a shop — no duplicated parsing that can drift.
//
// Phase 0b: PATH-PREFIX grammar. Every storefront URL carries the shopId as the
// first path segment: `/{shopId}`, `/{shopId}/product/:slug`, `/{shopId}/cart`,
// etc. resolveShopId derives the shop from segment[0]. This file is the SINGLE
// source of truth for the path grammar — no duplicated parsing elsewhere.
//
// Slice A (CUSTOM DOMAINS): a shop can also live at its own bare domain
// (e.g. shop.melodiemc.com), fronted by a Cloudflare Worker that proxies to
// Firebase Hosting and injects `window.__SHOP_ID__` into index.html at the
// edge (KV-backed, keyed by hostname). On such a domain the shop lives at the
// ROOT — there is NO /{shopId}/ path prefix — so the edge shopId wins over path
// parsing and links must NOT manufacture a prefix. The SPA still sees the
// customer hostname in location.hostname; the ONLY signal is __SHOP_ID__.

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

// A valid shopId slug: lowercase alphanumeric + hyphen (matches how shops are
// registered). Used to sanitise the edge-injected __SHOP_ID__ so a malformed KV
// value can never poison resolution.
const SHOP_ID_SLUG = /^[a-z0-9-]+$/;

/**
 * The shopId injected by the custom-domain edge Worker (window.__SHOP_ID__), or
 * null. Validated as a lowercase alphanumeric-hyphen slug — a malformed value is
 * ignored (treated as absent) rather than trusted, so a bad KV entry degrades to
 * the path-prefix grammar instead of resolving to a garbage tenant.
 *
 * @returns {string|null}
 */
export const getEdgeShopId = () => {
  if (typeof window === 'undefined') return null;
  const injected = window.__SHOP_ID__;
  if (typeof injected !== 'string') return null;
  const slug = injected.toLowerCase();
  return SHOP_ID_SLUG.test(slug) ? slug : null;
};

/**
 * True on a custom-domain context — the shop is served at its own bare domain
 * with the shopId injected at the edge (window.__SHOP_ID__), NOT carried in the
 * path. Link-building keys off this: on a custom domain the shop lives at the
 * root, so storefront links must OMIT the /{shopId}/ prefix.
 *
 * @returns {boolean}
 */
export const isCustomDomainContext = () => getEdgeShopId() !== null;

/**
 * Resolve the current shopId.
 *
 * Resolution order:
 *   1. window.__SHOP_ID__ (custom-domain edge injection) — validated slug wins;
 *      on a custom domain the shop is the domain, path prefix is irrelevant.
 *   2. Path-prefix grammar: segment[0] is the shopId (e.g. /sillmans/cart →
 *      'sillmans'), skipping known non-shop first segments (legacy country
 *      codes, credential routes, admin/platform).
 *   3. DEFAULT_SHOP_ID — the bare root and non-shop first segments.
 *
 * NOTE: this does NOT validate that the shopId exists — that's done at render
 * (ShopContext/StoreSettings) so an unknown/disabled shop can show an
 * "unavailable" state rather than silently falling back to the default.
 *
 * @param {string} [pathname] - e.g. window.location.pathname
 * @returns {string} the resolved shopId
 */
export const resolveShopId = (pathname) => {
  const edge = getEdgeShopId();
  if (edge) return edge;
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
 * CUSTOM-DOMAIN EXCEPTION: a custom domain (window.__SHOP_ID__ set) has a real
 * shop even at a bare path (the shop lives at the root), so it is NEVER shopless
 * — resolveShopId returns the edge shop, not a fallback.
 *
 * @param {string} [pathname]
 * @returns {boolean}
 */
export const isShoplessPath = (pathname) => {
  if (isCustomDomainContext()) return false;
  const path = typeof pathname === 'string'
    ? pathname
    : (typeof window !== 'undefined' ? window.location.pathname : '/');
  const first = (path.split('/').filter(Boolean)[0] || '').toLowerCase();
  return !first || NON_SHOP_FIRST_SEGMENTS.has(first);
};
