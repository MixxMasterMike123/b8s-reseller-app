import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveShopId, DEFAULT_SHOP_ID } from '../config/tenancy';
import { getImpersonationShopId } from '../config/impersonation';
import { getActiveShopId, subscribeActiveShopId } from '../config/activeShop';

/**
 * ShopContext — provides the current tenant's shopId to the whole app.
 *
 * This is the runtime entry point for multi-tenancy: every shop-scoped read,
 * the storefront config seam, and (later) the security-rule scoping key off the
 * shopId this resolves. The grammar that maps a URL to a shop lives in ONE
 * place — config/tenancy.js resolveShopId — so this provider never parses paths
 * itself; it just exposes the resolved value.
 *
 * Phase 0b: path-prefix grammar — segment[0] of the URL is the shopId
 * (resolveShopId in config/tenancy.js). This provider re-resolves on every
 * navigation (useLocation), so client-side route changes between shops update
 * the tenant. Resolution is synchronous (from the path) — no loading flash.
 * Must be rendered INSIDE the Router.
 *
 * ADMIN surface resolution order (impersonationEnabled, /admin/* has no shop
 * prefix so path resolution there is always the default shop):
 *   1. P4.3 impersonation session — a platform operator viewing a tenant
 *      (config/impersonation.js). Overrides everything.
 *   2. P4.6 active shop-admin shopId — the logged-in (non-platform) shop admin's
 *      OWN users/{uid}.shopId, published by AuthContext via config/activeShop.js
 *      (ShopProvider can't read auth context — it sits outside AuthProvider).
 *   3. Path resolution (default shop) — platform operators land here; their
 *      reads bypass scoping via the rules, so the default is correct for them.
 * All three are UI resolution only — the DB rules remain the hard access gate
 * (a shop admin can read only their own shopId's data no matter what this says).
 * Honored ONLY in admin mode — never storefront/platform.
 */
const ShopContext = createContext(DEFAULT_SHOP_ID);

export function useShopId() {
  return useContext(ShopContext);
}

export function ShopProvider({ children, impersonationEnabled = false }) {
  const location = useLocation();
  // Subscribe to the published shop-admin shopId so a real shop admin's surface
  // re-resolves the moment their user doc loads (admin mode only, below).
  const activeShopId = useSyncExternalStore(subscribeActiveShopId, getActiveShopId);
  const shopId = useMemo(
    () => {
      // Admin surface precedence: impersonation > shop-admin's own shop > path.
      if (impersonationEnabled) {
        const impersonated = getImpersonationShopId();
        if (impersonated) return impersonated;
        if (activeShopId) return activeShopId;
      }
      return resolveShopId(location.pathname);
    },
    // location.search is included so stripping the ?impersonate= param after
    // intake (a same-document nav) re-evaluates the resolved shop.
    [location.pathname, location.search, impersonationEnabled, activeShopId]
  );

  return (
    <ShopContext.Provider value={shopId}>
      {children}
    </ShopContext.Provider>
  );
}
