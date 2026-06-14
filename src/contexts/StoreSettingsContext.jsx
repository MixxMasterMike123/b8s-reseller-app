import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORE } from '../config/store';
import { loadShopConfig } from '../config/shopConfig';

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

  useEffect(() => {
    let cancelled = false;

    const loadStoreSettings = async () => {
      try {
        // Read via the shopConfig seam (settings/app today, shops/{shopId} later).
        const saved = await loadShopConfig();
        if (cancelled) return;

        if (saved && typeof saved === 'object') {
          // Override defaults only with non-empty saved values.
          const merged = { ...STORE };
          for (const [key, value] of Object.entries(saved)) {
            if (value !== undefined && value !== null && value !== '') {
              merged[key] = value;
            }
          }
          setSettings(merged);
        }
      } catch (error) {
        // Degrade gracefully to defaults — store must always render.
        console.warn('StoreSettings: using defaults (could not load shop config):', error?.message);
      }
    };

    loadStoreSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-shop accent token (NORD design system). Tailwind utilities like
  // bg-accent read var(--color-accent); the inline value on <html> wins
  // over the static @theme default, so the accent follows shop config.
  useEffect(() => {
    if (settings.accent) {
      document.documentElement.style.setProperty('--color-accent', settings.accent);
    }
  }, [settings.accent]);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
