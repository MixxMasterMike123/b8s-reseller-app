// Tenancy config — the single source of truth for "which shop is this?".
//
// The platform is becoming multi-tenant: every shop is a `shops/{shopId}`
// entity and all shop data is scoped by `shopId` (see
// docs/SUPERADMIN_TENANCY_PLAN.md). This file owns BOTH the default shop id
// and the path-grammar parsing, so there is exactly one place that knows how a
// URL maps to a shop — no duplicated parsing that can drift.
//
// Phase 0 (current): single shop. resolveShopId() always returns the default;
// the URL grammar is unchanged (`/{countryCode}/...`). When Phase 0b lands the
// path-prefix grammar (`/{shopId}/{countryCode}/...`), ONLY resolveShopId
// changes here and everything downstream follows.

// The internal id of the existing/first shop. This is a DATA key, never shown
// to customers — the customer-facing brand is meteorpr / per-shop config.
// Kept as 'b8shield' to match the immutable Firebase project/data identifiers
// so the seed + any future backfill align with existing internal references.
export const DEFAULT_SHOP_ID = 'b8shield';

// Country codes that occupy the FIRST path segment in the legacy grammar.
// Used by resolveShopId to tell a legacy `/{countryCode}/...` URL apart from a
// future `/{shopId}/{countryCode}/...` URL: if segment[0] is a valid country
// code, there is no shop prefix. Kept in sync with the shop's supported
// countries (see isValidCountryCode in utils/internationalCountries).
export const COUNTRY_PREFIXES = ['se', 'gb', 'us'];

/**
 * Resolve the current shopId from a URL pathname.
 *
 * Phase 0: the URL has no shop prefix, so this always returns DEFAULT_SHOP_ID.
 * The `pathname` argument is accepted now (callers can start passing it) so the
 * call sites don't change when Phase 0b makes the shopId path-derived.
 *
 * Phase 0b (future): when segment[0] is NOT a known country code it's treated
 * as the shopId; otherwise the URL is legacy and resolves to DEFAULT_SHOP_ID.
 *
 * @param {string} [pathname] - e.g. window.location.pathname
 * @returns {string} the resolved shopId
 */
export const resolveShopId = (/* pathname */) => {
  // Phase 0: always the single default shop.
  return DEFAULT_SHOP_ID;
};
