import React, { createContext, useContext, useMemo } from 'react';
import { resolveShopId, DEFAULT_SHOP_ID } from '../config/tenancy';

/**
 * ShopContext — provides the current tenant's shopId to the whole app.
 *
 * This is the runtime entry point for multi-tenancy: every shop-scoped read,
 * the storefront config seam, and (later) the security-rule scoping key off the
 * shopId this resolves. The grammar that maps a URL to a shop lives in ONE
 * place — config/tenancy.js resolveShopId — so this provider never parses paths
 * itself; it just exposes the resolved value.
 *
 * Phase 0: resolveShopId always returns DEFAULT_SHOP_ID (single shop, no URL
 * prefix yet). When Phase 0b introduces the `/{shopId}/{countryCode}/...`
 * grammar, only resolveShopId changes and this provider re-resolves on
 * navigation. Resolution is synchronous (from the path), so there is no loading
 * state and no render flash.
 */
const ShopContext = createContext(DEFAULT_SHOP_ID);

export function useShopId() {
  return useContext(ShopContext);
}

export function ShopProvider({ children }) {
  // Resolve from the current path. Phase 0 this is constant (the default shop);
  // Phase 0b will make it path-derived, at which point this should re-run on
  // route changes (a useLocation dependency added then). Kept dependency-free
  // now because the value cannot change without a full reload today.
  const shopId = useMemo(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    return resolveShopId(pathname);
  }, []);

  return (
    <ShopContext.Provider value={shopId}>
      {children}
    </ShopContext.Provider>
  );
}
