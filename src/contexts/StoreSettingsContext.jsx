import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { STORE } from '../config/store';

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
        const snap = await getDoc(doc(db, 'settings', 'app'));
        if (cancelled || !snap.exists()) return;

        const saved = snap.data()?.storeIdentity;
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
        console.warn('StoreSettings: using defaults (could not load settings/app):', error?.message);
      }
    };

    loadStoreSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
