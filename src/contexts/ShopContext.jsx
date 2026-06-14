import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
 * Phase 0b: path-prefix grammar — segment[0] of the URL is the shopId
 * (resolveShopId in config/tenancy.js). This provider re-resolves on every
 * navigation (useLocation), so client-side route changes between shops update
 * the tenant. Resolution is synchronous (from the path) — no loading flash.
 * Must be rendered INSIDE the Router.
 */
const ShopContext = createContext(DEFAULT_SHOP_ID);

export function useShopId() {
  return useContext(ShopContext);
}

export function ShopProvider({ children }) {
  const location = useLocation();
  const shopId = useMemo(
    () => resolveShopId(location.pathname),
    [location.pathname]
  );

  return (
    <ShopContext.Provider value={shopId}>
      {children}
    </ShopContext.Provider>
  );
}
