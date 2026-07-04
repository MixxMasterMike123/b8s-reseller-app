import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORE } from '../config/store';
import { loadShopConfig } from '../config/shopConfig';
import { useShopId } from './ShopContext';

/**
 * StoreSettingsContext — provides per-shop store identity to the app.
 *
 * Strategy: the static STORE config (src/config/store.js) is the synchronous
 * default, so the storefront renders instantly for anonymous visitors with no
 * flash. At boot we read the `settings/app` Firestore doc once and override the
 * defaults with any saved `storeIdentity` fields (set via AdminSettings). On any
 * error (rules not yet deployed, offline, missing doc) we keep the defaults —
 * the provider never blocks render and never crashes the shop.
 */
const StoreSettingsContext = createContext(STORE);

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}

export function StoreSettingsProvider({ children }) {
  // Seed with the static defaults so first paint is correct.
  const [settings, setSettings] = useState(STORE);
  // Current tenant — drives which shop's config we load.
  const shopId = useShopId();

  useEffect(() => {
    let cancelled = false;

    const loadStoreSettings = async () => {
      try {
        // Read via the shopConfig seam for THIS shop (shops/{shopId}, falling
        // back to settings/app until the seed runs — see config/shopConfig.js).
        const saved = await loadShopConfig(shopId);
        if (cancelled) return;

        // Override defaults only with non-empty saved values. `__loaded` marks
        // that the async shop config has resolved, so consumers can distinguish
        // "config loaded, genuinely no pickup locations" from "still on static
        // defaults" (avoids a false 'cannot fulfill' flash for pickup-only carts
        // before the real pickupLocations arrive — see Checkout).
        const merged = { ...STORE, __loaded: true };
        if (saved && typeof saved === 'object') {
          for (const [key, value] of Object.entries(saved)) {
            if (value !== undefined && value !== null && value !== '') {
              merged[key] = value;
            }
          }
        }
        setSettings(merged);
      } catch (error) {
        // Degrade gracefully to defaults — store must always render. Still mark
        // loaded: we finished trying, so consumers shouldn't wait forever.
        console.warn('StoreSettings: using defaults (could not load shop config):', error?.message);
        if (!cancelled) setSettings((prev) => ({ ...prev, __loaded: true }));
      }
    };

    loadStoreSettings();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // Per-shop accent token for the NORD STOREFRONT only (--color-accent). The
  // admin (--color-admin-primary) does NOT use the shop accent — per the
  // "full Shopify" admin decision it stays Polaris near-black for every shop.
  useEffect(() => {
    if (settings.accent) {
      document.documentElement.style.setProperty('--color-accent', settings.accent);
    }
  }, [settings.accent]);

  // Per-shop browser-tab identity — runs on BOTH the storefront and the admin
  // (both mount this provider, keyed on the active/managed shopId), so each tab
  // shows the right shop's name + favicon instead of the static index.html
  // 'My Shop' / neutral icon. Page-level <Helmet> titles (product/legal pages)
  // still win where they set one; this is the shop-wide default + the favicon,
  // which Helmet never touches. Waits for __loaded so we don't flash the static
  // STORE default over a real shop name.
  useEffect(() => {
    if (!settings.__loaded) return;
    if (settings.shopName) document.title = settings.shopName;
    if (settings.faviconUrl) {
      // Reuse one managed <link> so repeated shop switches don't stack tags.
      let link = document.querySelector("link[rel='icon'][data-shop-favicon]");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.setAttribute('data-shop-favicon', '');
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.__loaded, settings.shopName, settings.faviconUrl]);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
