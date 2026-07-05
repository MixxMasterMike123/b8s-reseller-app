// AdminShopIdIntake — deep-link shop switching for the ADMIN host.
//
// Admin emails link to /admin/orders/{orderId}?shopId={shopId}. Without this,
// the admin opens whatever shop the operator last managed (or the path default),
// so a link to another shop's order lands in the WRONG shop and the order 404s.
//
// This component (mounted once in admin appMode, inside Router) consumes the
// ?shopId= param on cold load and stashes it as the deep-link managed-shop
// override (config/activeShop.js). ShopProvider reads that override at a
// precedence just below impersonation and above the auth-published shop, so the
// requested shop is resolved BEFORE the route's shop-scoped reads run. We then
// strip ONLY the shopId param and stay on the requested route.
//
// Security: this is UI convenience + which-shop routing, NOT authorization. It
// rides the same resolution seam as the manual shop-switch (impersonation /
// activeShop); the Firestore rules + function guards remain the hard gate. A
// shopId the caller can't administer just yields permission-denied reads — the
// same failure mode as reaching that shop any other way. No new permission
// check is invented here. (For the shop OWNER clicking their own link the param
// matches their own shop, so the override is a harmless no-op.)
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setDeepLinkShopId } from '../../config/activeShop';

const AdminShopIdIntake = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Guard so intake runs once per param arrival (StrictMode double-mount + the
  // post-strip re-render must not re-process).
  const handledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shopId = params.get('shopId');
    if (!shopId) return; // nothing to intake
    if (handledRef.current) return;
    handledRef.current = true;

    // Set the managed shop BEFORE the route's shop-scoped reads fire. This is a
    // synchronous store write; ShopProvider re-resolves useShopId() immediately.
    setDeepLinkShopId(shopId);

    // Strip ONLY our param; preserve any others + the current path (the order
    // route the email pointed at).
    params.delete('shopId');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [location.search, location.pathname, navigate]);

  return null;
};

export default AdminShopIdIntake;
