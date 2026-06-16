// AddonGate — route guard for add-on routes (admin wagon routes + storefront
// affiliate routes). Renders children only when the active shop has the add-on's
// feature enabled; otherwise redirects. Defense-in-depth: even if a menu/nav
// link is hidden, a deep-linked route is still blocked when the shop isn't
// entitled. Default-ON (via useShopFeatures), so nothing is blocked for shops
// missing the field. While features load, we render children (optimistic,
// default-ON) to avoid a flash-redirect on first paint.
//
// redirectTo: where to send a blocked visitor. Defaults to '/admin' (the
// original admin-wagon behavior). Storefront routes pass 'shop-home' to bounce
// the customer to the shop landing page (/:shopId) instead of the admin.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useShopFeatures } from '../../contexts/ShopFeaturesContext';
import { useShopId } from '../../contexts/ShopContext';

export default function AddonGate({ feature, children, redirectTo = '/admin' }) {
  const { isEnabled, loading } = useShopFeatures();
  const shopId = useShopId();
  // Optimistic while loading (default-ON); block only once we know it's off.
  if (!loading && !isEnabled(feature)) {
    const target = redirectTo === 'shop-home' ? `/${shopId}` : redirectTo;
    return <Navigate to={target} replace />;
  }
  return children;
}
