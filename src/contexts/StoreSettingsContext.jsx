import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORE } from '../config/store';
import { loadShopConfig } from '../config/shopConfig';
import { useShopId } from './ShopContext';
import { resolveTheme, ensureTemplateFonts } from '../config/nordTokens';
import { getTemplate } from '../config/templates';

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

  // Per-shop THEME tokens for the NORD STOREFRONT only. Historically this set
  // only --color-accent; it now applies the full NORD token set (colors, fonts,
  // shape, motion, structural grid/density) so a shop can run a TEMPLATE — a
  // named partial override of the NORD defaults (see src/config/templates.js +
  // nordTokens.js).
  //
  // Layering (later wins): NORD defaults ← selected template's tokens ← the
  // shop's own inline `theme` overrides ← the shop's top-level `accent`. So a
  // shop on the Sport template still shows ITS club color, not the template's
  // default red.
  //
  // Back-compat: a shop with no templateId and only `accent` behaves EXACTLY as
  // before — the template layer is empty and every non-accent token stays at
  // its NORD default. The admin (--color-admin-*) is untouched: templating is
  // storefront-only, per the "full Shopify" admin decision.
  useEffect(() => {
    const tpl = getTemplate(settings.templateId);
    // Deep-merge template tokens under any per-shop inline `theme` overrides.
    const inline = settings.theme || {};
    const merged = {};
    for (const group of ['colors', 'fonts', 'shape', 'motion', 'layout']) {
      const t = tpl.tokens?.[group];
      const i = inline[group];
      if (t || i) merged[group] = { ...(t || {}), ...(i || {}) };
    }
    // Top-level `accent` is the shop's single-color override; it wins over the
    // template's default accent (the common case: a club sets only its color).
    if (settings.accent) {
      merged.colors = { ...(merged.colors || {}), accent: settings.accent };
    }
    const { vars } = resolveTheme(merged);
    const root = document.documentElement.style;
    for (const [cssVar, value] of Object.entries(vars)) {
      root.setProperty(cssVar, value);
    }
    // Load the template's webfonts on demand (no-op for NORD / no fonts).
    ensureTemplateFonts(tpl.fonts);
  }, [settings.accent, settings.theme, settings.templateId]);

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
      // Browsers pick a "best" icon among ALL <link rel~=icon> tags by their own
      // size/type heuristics — appending one more does NOT reliably beat the
      // static index.html .ico/.png links (Chrome often keeps the .ico). So to
      // actually take over the tab icon we REMOVE every existing icon link the
      // first time, then own one managed link and just update its href on shop
      // switch. `rel="icon"` includes shortcut/apple-touch variants via rel~=.
      let link = document.querySelector("link[rel~='icon'][data-shop-favicon]");
      if (!link) {
        document
          .querySelectorAll("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
          .forEach((el) => el.parentNode?.removeChild(el));
        link = document.createElement('link');
        link.rel = 'icon';
        link.setAttribute('data-shop-favicon', '');
        document.head.appendChild(link);
      }
      // Set type from the extension so the browser trusts an SVG favicon.
      const url = settings.faviconUrl;
      if (/\.svg(\?|$)/i.test(url)) link.type = 'image/svg+xml';
      else if (/\.png(\?|$)/i.test(url)) link.type = 'image/png';
      else link.removeAttribute('type');
      link.href = url;
    }
  }, [settings.__loaded, settings.shopName, settings.faviconUrl]);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
