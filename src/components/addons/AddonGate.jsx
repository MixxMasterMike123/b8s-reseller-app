// AddonGate — route guard for add-on (wagon) routes. Renders children only when
// the active shop has the add-on's feature enabled; otherwise redirects to
// /admin. This is the defense-in-depth layer: even if a menu item is hidden, a
// deep-linked add-on route is still blocked when the shop isn't entitled.
// Default-ON (via useShopFeatures), so nothing is blocked for shops missing the
// field. While features are loading, we render children (optimistic, default-ON)
// to avoid a flash-redirect on first paint.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useShopFeatures } from '../../contexts/ShopFeaturesContext';

export default function AddonGate({ feature, children }) {
  const { isEnabled, loading } = useShopFeatures();
  // Optimistic while loading (default-ON); block only once we know it's off.
  if (!loading && !isEnabled(feature)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
