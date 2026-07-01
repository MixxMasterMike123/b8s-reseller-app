/**
 * Platform operator identity — the legal entity that runs the WHOLE platform
 * (the "technical provider" / personuppgiftsbiträde named in the per-shop legal
 * pages), as opposed to per-shop seller identity (that lives in storeIdentity,
 * see src/config/store.js + shopConfig.js).
 *
 * Build-time constant, intentionally NOT a Firestore doc: this is ONE global
 * value that rarely changes, and the public storefront legal pages render for
 * anonymous visitors with no async load / no Firestore rule dependency (same
 * rationale as STORE in store.js). Override per deployment via Vite env vars
 * (VITE_PLATFORM_LEGAL_NAME / VITE_PLATFORM_ORG_NUMBER) without a code change.
 *
 * Consumed by the legal-page renderer (legalPageRenderer.js) to fill
 * {{platform_legal_name}} / {{platform_org_suffix}} (the suffix renders
 * " (org.nr …)" only when orgNumber is set — no broken parenthesis before
 * the company is registered).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const PLATFORM = {
  // Legal name of the platform operator (the company behind the platform).
  legalName: env.VITE_PLATFORM_LEGAL_NAME || 'Meteor PR AB',
  // Org number of the platform operator.
  orgNumber: env.VITE_PLATFORM_ORG_NUMBER || '',
};
