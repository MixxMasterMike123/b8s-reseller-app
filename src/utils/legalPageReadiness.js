/**
 * Legal-page readiness gate.
 *
 * The auto-generated legal pages may render for PREVIEW at any time, but they
 * must NOT be treated as live/published on a real shop until two conditions hold
 * (per the implementation brief + docs/legal-template-files/README.md):
 *
 *   (a) {{return_address}} is collected — the köpvillkor §8 + ångerrätt page
 *       both require a real return address; without it the pages are wrong.
 *   (b) the seller-side VAT branch is resolvable — `vatRegistered` must be set
 *       (true/false), so the page's VAT wording matches what checkout charges.
 *       An unset flag means we can't promise the page is truthful.
 *
 * Until BOTH hold, the seller (AdminSettings) and the operator (PlatformShops)
 * see a clear "legal pages incomplete" state.
 *
 * `sellerType` is also needed to pick the company/individual identity branch; a
 * shop with no sellerType still renders (defaults to the individual branch) but
 * is flagged as incomplete so identity disclosure is correct before going live.
 */

// One readiness check. `identity` is the shop's storeIdentity object.
// Returns { ready: boolean, missing: string[], blockers: [{key,label}] }.
// `blockers` are the HARD gates (a + b). `missing` includes softer identity gaps.
export function getLegalReadiness(identity = {}) {
  const blockers = [];

  // (a) Return address — hard gate.
  if (!String(identity.returnAddress || '').trim()) {
    blockers.push({ key: 'returnAddress', label: 'Returadress saknas' });
  }

  // (b) VAT branch must be resolvable — hard gate. Must be an explicit boolean.
  if (typeof identity.vatRegistered !== 'boolean') {
    blockers.push({ key: 'vatRegistered', label: 'Momsregistrering ej angiven (krävs för att momstexten ska matcha kassan)' });
  }

  // Softer identity gaps — not hard blockers, but the pages render incomplete.
  const missing = [];
  if (!String(identity.legalName || '').trim()) missing.push('legalName');
  if (!String(identity.address || '').trim()) missing.push('address');
  if (!String(identity.supportEmail || '').trim()) missing.push('supportEmail');
  if (!String(identity.sellerType || '').trim()) missing.push('sellerType');
  // Company sellers must disclose org number.
  if (identity.sellerType === 'company' && !String(identity.orgNumber || '').trim()) {
    missing.push('orgNumber');
  }
  // VAT-registered sellers must disclose VAT number.
  if (identity.vatRegistered === true && !String(identity.vatNumber || '').trim()) {
    missing.push('vatNumber');
  }

  return {
    ready: blockers.length === 0,
    blockers,
    missing,
  };
}

// Convenience: just the boolean "can these pages go live?".
export const isLegalReady = (identity = {}) => getLegalReadiness(identity).ready;
