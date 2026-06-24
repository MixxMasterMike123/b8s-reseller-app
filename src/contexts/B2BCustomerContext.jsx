// B2BCustomerContext — resolves the logged-in user's b2bCustomers profile for
// the CURRENT shop, once, for the whole /b2b portal subtree. Mirrors how the
// B2C side resolves its profile (where shopId == current && firebaseAuthUid ==
// uid), but lifted into a context so the gate + every portal page share one
// read instead of re-querying.
//
// Exposed state (via useB2BCustomer):
//   loading   — auth or profile read in flight
//   profile   — the b2bCustomers doc ({ id, ...data }) or null if none for this shop
//   isActive  — profile?.active === true (the admin-activation gate)
//   reload()  — re-fetch (after a profile edit)
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useShopId } from './ShopContext';
import { useSimpleAuth } from './SimpleAuthContext';

const B2BCustomerContext = createContext({ loading: true, profile: null, isActive: false, reload: () => {} });

export function useB2BCustomer() {
  return useContext(B2BCustomerContext);
}

export function B2BCustomerProvider({ children }) {
  const shopId = useShopId();
  const { currentUser, loading: authLoading } = useSimpleAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'b2bCustomers'),
        where('shopId', '==', shopId),
        where('firebaseAuthUid', '==', currentUser.uid)
      ));
      setProfile(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      // A read error (rules/offline) must NOT silently grant access — leave the
      // profile null so the gate treats the visitor as not-yet-a-customer.
      console.warn('B2BCustomer: profile resolve failed:', err?.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser, shopId]);

  useEffect(() => {
    if (authLoading) return; // wait for auth to settle before resolving
    resolve();
  }, [authLoading, resolve]);

  return (
    <B2BCustomerContext.Provider
      value={{ loading: authLoading || loading, profile, isActive: profile?.active === true, reload: resolve }}
    >
      {children}
    </B2BCustomerContext.Provider>
  );
}

export default B2BCustomerContext;
