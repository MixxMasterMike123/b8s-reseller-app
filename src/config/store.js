/**
 * Store Identity — single source of truth for per-shop branding.
 *
 * Swap these values to rebrand the storefront. This is the de-branded
 * baseline a real per-shop deployment would overwrite.
 *
 * NOTE: This is intentionally a static, build-time config so the public
 * storefront renders instantly for anonymous visitors with no async load
 * and no Firestore rule dependency. A later step wires these defaults to a
 * publicly-readable Firestore `settings/app` doc + the AdminSettings form
 * so a shop can be rebranded without a redeploy.
 */
export const STORE = {
  // Display identity
  shopName: 'My Shop',
  legalName: 'My Company',
  tagline: 'Quality products, delivered.',

  // Logo: no neutral asset exists yet — still points at the legacy asset.
  // TODO: replace with a per-shop logo asset (e.g. /images/logo.svg).
  logoUrl: '/images/B8S_full_logo.svg',

  // Contact
  supportEmail: 'hello@example.com',
  // HTML allowed (rendered via dangerouslySetInnerHTML in the footer).
  address: 'My Company<br>123 Main Street<br>City',

  // Currency / VAT — included for completeness. NOT wired into pricing math
  // in this slice; parameterizing currency/VAT is a later step.
  currency: 'SEK',
  vatRate: 0.25,
};
