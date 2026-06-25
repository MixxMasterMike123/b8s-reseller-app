/**
 * Right-of-withdrawal (ångerrätt) helpers — POD / made-to-order consumer law.
 *
 * A "personalized" product (buyer supplies own image/text/measurements) is a
 * *specialtillverkad vara*: the 14-day consumer withdrawal right does NOT apply,
 * but ONLY IF the shop discloses this and captures the buyer's explicit consent
 * BEFORE payment. A standard-options product keeps the normal 14-day withdrawal.
 *
 * This module is the single source of truth for:
 *   - whether a cart needs the no-withdrawal consent gate,
 *   - the notice TEXT shown, and its VERSION (persisted with the order as proof).
 *
 * The text is versioned: the order stores the version + a hash so we can prove
 * exactly which wording the buyer accepted, even if the wording changes later.
 *
 * NOTE: this is the buyer-PERSONALIZATION-driven gate. The separate buyer-TYPE
 * branch (individual = full consumer gate vs corporate = lighter text, from the
 * parked POD-compliance plan) plugs in HERE later via an optional buyerType
 * argument — left as a documented seam, not pre-decided.
 */

// Bump when the default notice wording changes (proof references this).
export const WITHDRAWAL_NOTICE_VERSION = 'v1-2026-06';

// Neutral platform-default notice. A shop may override via its legal config
// (shops/{id}.storeIdentity.legal.noWithdrawalNotice); the version travels with it.
export const DEFAULT_NO_WITHDRAWAL_NOTICE =
  'Den här beställningen innehåller en eller flera specialtillverkade produkter ' +
  '(tillverkas efter din design, text, bild eller mått). Enligt lagen om ' +
  'distansavtal gäller ingen 14-dagars ångerrätt för specialtillverkade varor. ' +
  'Reklamationsrätten vid fel på varan gäller alltid. Genom att kryssa i rutan ' +
  'bekräftar du att du har tagit del av detta och godkänner att ångerrätten inte ' +
  'gäller för dessa produkter.';

/**
 * Does this cart require the no-withdrawal consent gate?
 * True when ANY item is personalized (specialtillverkad).
 * @param {Array} cartItems
 * @returns {boolean}
 */
export function requiresWithdrawalGate(cartItems) {
  if (!Array.isArray(cartItems)) return false;
  return cartItems.some((it) => it && it.isPersonalized === true);
}

/**
 * A short, stable fingerprint of the notice text actually shown — stored on the
 * order alongside the version so the accepted wording is provable. Not a crypto
 * hash; a deterministic checksum is enough for an audit reference.
 * @param {string} text
 * @returns {string} e.g. "h3f9a1c2"
 */
export function noticeFingerprint(text) {
  const s = String(text || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // djb2, unsigned
  }
  return 'h' + h.toString(16);
}

/**
 * Resolve the notice text for a shop: its override if set, else the neutral
 * default. Returns the text + the version + a fingerprint for proof.
 * @param {object} legal  shops/{id}.storeIdentity.legal (may be undefined)
 */
export function resolveWithdrawalNotice(legal) {
  const text = (legal && typeof legal.noWithdrawalNotice === 'string' && legal.noWithdrawalNotice.trim())
    ? legal.noWithdrawalNotice.trim()
    : DEFAULT_NO_WITHDRAWAL_NOTICE;
  const version = (legal && typeof legal.withdrawalNoticeVersion === 'string' && legal.withdrawalNoticeVersion.trim())
    ? legal.withdrawalNoticeVersion.trim()
    : WITHDRAWAL_NOTICE_VERSION;
  return { text, version, fingerprint: noticeFingerprint(text) };
}
