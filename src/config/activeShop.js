// Active shop-admin tenant — the bridge that lets the ADMIN surface resolve a
// real (non-platform) shop admin to THEIR OWN shop, without ShopProvider needing
// auth context.
//
// Why this exists: ShopProvider sits OUTSIDE AuthProvider in the tree (it wraps
// StoreSettingsProvider, which needs shopId, which in turn wraps AuthProvider),
// so ShopProvider cannot call useAuth(). But a real shop admin logging into the
// admin host at /admin/* needs useShopId() to return their users/{uid}.shopId —
// the admin URL has no shop prefix, so path resolution alone yields the default
// shop. AuthContext knows the shopId the moment it loads the user doc; it
// publishes it here, and ShopProvider reads it.
//
// Precedence in ShopProvider (admin surface): impersonation session (P4.3, an
// operator viewing a tenant) > THIS (the logged-in shop admin's own shop) >
// path resolution (default). Platform operators have shopId null/'b8shield' and
// their reads bypass scoping via the rules, so leaving them on the path-default
// is fine.
//
// This is auth state, not a security boundary — the Firestore/Storage rules
// remain the hard gate (a shop admin can only read their own shopId's data
// regardless of what this returns).

let activeShopId = null;
const listeners = new Set();

/** The logged-in shop admin's shopId, or null (logged out / platform / not yet loaded). */
export function getActiveShopId() {
  return activeShopId;
}

/**
 * Publish the logged-in admin's shopId (AuthContext calls this when the user doc
 * loads / on logout with null). Notifies subscribers so ShopProvider re-renders.
 */
export function setActiveShopId(shopId) {
  const next = shopId || null;
  if (next === activeShopId) return;
  activeShopId = next;
  listeners.forEach((fn) => {
    try { fn(next); } catch { /* ignore subscriber errors */ }
  });
}

/** Subscribe to changes; returns an unsubscribe fn. */
export function subscribeActiveShopId(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
