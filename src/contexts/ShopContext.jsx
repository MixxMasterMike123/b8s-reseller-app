import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveShopId, DEFAULT_SHOP_ID } from '../config/tenancy';
import { getImpersonationShopId } from '../config/impersonation';

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
 * P4.3 impersonation: on the ADMIN surface only (impersonationEnabled), an
 * active operator impersonation session (config/impersonation.js) OVERRIDES the
 * path-resolved shopId, so a platform operator's shop admin renders the target
 * shop. This is honored only in admin mode — never storefront/platform — and is
 * purely a UI override; the DB rules remain the hard access gate. Admin paths
 * are /admin/* (no shop prefix), so path resolution there is always the default
 * shop; the override is what points shop admin at another tenant.
 */
const ShopContext = createContext(DEFAULT_SHOP_ID);

export function useShopId() {
  return useContext(ShopContext);
}

export function ShopProvider({ children, impersonationEnabled = false }) {
  const location = useLocation();
  const shopId = useMemo(
    () => {
      // Admin surface: an active, non-expired impersonation session wins.
      if (impersonationEnabled) {
        const impersonated = getImpersonationShopId();
        if (impersonated) return impersonated;
      }
      return resolveShopId(location.pathname);
    },
    // location.search is included so stripping the ?impersonate= param after
    // intake (a same-document nav) re-evaluates the resolved shop.
    [location.pathname, location.search, impersonationEnabled]
  );

  return (
    <ShopContext.Provider value={shopId}>
      {children}
    </ShopContext.Provider>
  );
}
