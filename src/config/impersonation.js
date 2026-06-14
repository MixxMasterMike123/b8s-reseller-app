// Operator impersonation session — the client side of P4.3 "Open Shop Admin".
//
// A platform operator (Mikael) can view a tenant's SHOP ADMIN as that shop. The
// hard data boundary is already the Phase 3 Firestore/Storage rules: isPlatform()
// bypasses shop-scoping, so the operator already has the authority to read/write
// any shop. This module does NOT grant access — it only carries WHICH shop the
// shop-admin UI should render, plus an accountability trail (audit doc id).
//
// Storage = sessionStorage on the ADMIN host only. sessionStorage is scoped to
// the origin (no cookie Domain attribute), so it never leaks to the platform or
// storefront surface — the per-surface silo the architecture requires. It is
// also per-tab and cleared on tab close, which bounds exposure.
//
// Security note: a forged session here buys nothing. ShopProvider only honors it
// in admin appMode, intake only writes it after verifying the caller isPlatform
// + the audit doc (App-side), and the DB rules block cross-shop reads for any
// non-platform user regardless of what this says. This is convenience + audit,
// not authorization.

// Per-tab session key. Distinct, surface-specific name (architecture: distinct
// cookie/session name per surface).
const IMPERSONATION_KEY = '__op_impersonation';

// Auto-expiry: an operator must re-launch after this long. The banner shows the
// countdown; expiry just clears the UI override (never touches data). 45 min
// matches the WorkOS/Shopify default — long enough for real admin work, short
// enough that a forgotten tab self-clears.
export const IMPERSONATION_TTL_MS = 45 * 60 * 1000;

/**
 * Read the active impersonation session, or null if absent/malformed/expired.
 * Expired sessions are cleared as a side effect so a stale entry can't linger.
 * @returns {{shopId:string, shopName:string, reason:string, actorUid:string, auditId:string, startedAt:number, expiresAt:number}|null}
 */
export function getImpersonation() {
  if (typeof window === 'undefined') return null;
  let raw;
  try {
    raw = window.sessionStorage.getItem(IMPERSONATION_KEY);
  } catch {
    return null; // sessionStorage unavailable (private mode edge) → treat as none
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearImpersonation();
    return null;
  }

  // Validate shape + expiry. Anything off → clear + none (fail closed).
  if (
    !parsed ||
    typeof parsed.shopId !== 'string' ||
    !parsed.shopId ||
    typeof parsed.expiresAt !== 'number'
  ) {
    clearImpersonation();
    return null;
  }
  if (Date.now() >= parsed.expiresAt) {
    clearImpersonation();
    return null;
  }
  return parsed;
}

/**
 * The shopId of the active impersonation, or null. Convenience for ShopProvider.
 * @returns {string|null}
 */
export function getImpersonationShopId() {
  const s = getImpersonation();
  return s ? s.shopId : null;
}

/**
 * Start an impersonation session in this tab. Stamps startedAt/expiresAt.
 * Caller is responsible for the platform-gate + audit write (App intake).
 * @returns {{shopId:string, reason:string, actorUid:string, auditId:string, startedAt:number, expiresAt:number}}
 */
export function setImpersonation({ shopId, shopName, reason, actorUid, auditId }) {
  const startedAt = Date.now();
  const session = {
    shopId,
    shopName: shopName || shopId,
    reason: reason || '',
    actorUid: actorUid || '',
    auditId: auditId || '',
    startedAt,
    expiresAt: startedAt + IMPERSONATION_TTL_MS,
  };
  try {
    window.sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(session));
  } catch {
    // If we can't persist, the session simply won't apply — fail closed.
  }
  return session;
}

/** Clear the impersonation session (end / expiry / logout). */
export function clearImpersonation() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(IMPERSONATION_KEY);
  } catch {
    /* ignore */
  }
}
