import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DEFAULT_SHOP_ID, COUNTRY_PREFIXES } from '../../config/tenancy';
import LandingPage from '../../pages/LandingPage';

/**
 * ShopGate — single entry guard for every per-shop storefront route
 * (/{shopId}/...). It consolidates all "which shop, is it valid" logic so the
 * router doesn't need fragile precedence between legacy redirects, shopIds and
 * CMS slugs:
 *
 *  1. Legacy country code as the shop segment (/se/..., old links) → strip it
 *     and redirect to the default shop's equivalent path.
 *  2. Unknown shopId (no shops/{id} doc) → redirect to the default shop.
 *  3. Disabled shop (status === 'disabled') → render the kill-switch
 *     "unavailable" state instead of the storefront.
 *  3b. Not-live shop (published === false) → render a "coming soon" holding
 *     page + a noindex robots meta, instead of the catalog. Only an EXPLICIT
 *     false blocks; missing/true = live (existing shops predate the field).
 *  4. Valid active shop → render children (the storefront page). ShopContext
 *     already resolved shopId from the path for data scoping.
 */
const ShopGate = ({ children }) => {
  const { shopId } = useParams();
  const location = useLocation();
  const [state, setState] = useState({ status: 'checking', shop: null });

  const isLegacyCountry = COUNTRY_PREFIXES.includes((shopId || '').toLowerCase());

  useEffect(() => {
    let cancelled = false;
    if (isLegacyCountry) {
      setState({ status: 'legacy', shop: null });
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'shops', shopId));
        if (cancelled) return;
        if (!snap.exists()) {
          // The default shop is ALWAYS valid — never redirect it to itself
          // (would infinite-loop if the seed doc were ever missing). Render it.
          if (shopId === DEFAULT_SHOP_ID) {
            setState({ status: 'ok', shop: null });
          } else {
            setState({ status: 'unknown', shop: null });
          }
        } else {
          setState({ status: 'ok', shop: { id: snap.id, ...snap.data() } });
        }
      } catch (e) {
        // On a read error, fail open to render (rules allow public shop read);
        // don't hard-block the storefront on a transient hiccup.
        console.warn('ShopGate: shop lookup failed, rendering anyway:', e?.message);
        if (!cancelled) setState({ status: 'ok', shop: null });
      }
    })();
    return () => { cancelled = true; };
  }, [shopId, isLegacyCountry]);

  // 1. Legacy country code (/se/...) → the platform Landing Page. Storefronts
  //    live ONLY at an explicit /{shopId}; a legacy country prefix is NOT a shop,
  //    so it must not resolve to the default (b8shield) storefront. (Strict rule,
  //    decided 2026-06-25: any non-/{shopId} path shows the LP, not a store.)
  if (isLegacyCountry) {
    return <LandingPage />;
  }

  if (state.status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 2. Unknown shop (no shops/{id} doc) → the platform Landing Page, NOT the
  //    default (b8shield) storefront. A typo'd/nonexistent shop must never leak
  //    into b8shield's store.
  if (state.status === 'unknown') {
    return <LandingPage />;
  }

  // 3. Disabled shop → kill-switch "unavailable" page.
  if (state.shop && state.shop.status === 'disabled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F1EC] px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#1A1C1E] mb-2">Butiken är inte tillgänglig</h1>
          <p className="text-[#71757C]">
            Den här butiken är för närvarande stängd. Försök igen senare.
          </p>
        </div>
      </div>
    );
  }

  // 3b. Not-live shop (published === false, EXPLICIT) → "coming soon" holding page
  //     + noindex. undefined/true = live (existing shops have no published field,
  //     so they must NOT go dark). state.shop === null (the default shop with no
  //     doc, path 2 above) never matches this — the default shop is never blocked.
  //     Storefront-neutral palette (not platform-dark): this renders on the shop.
  if (state.shop && state.shop.published === false) {
    return (
      <>
        <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
        <div className="min-h-screen flex items-center justify-center bg-[#F3F1EC] px-6">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-[#1A1C1E] mb-2">Kommer snart</h1>
            <p className="text-[#71757C]">Den här butiken öppnar snart.</p>
          </div>
        </div>
      </>
    );
  }

  // 4. Valid active shop.
  return children;
};

export default ShopGate;
