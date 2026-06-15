// PlatformShops — the operator console HOME: the tenant fleet table.
// Lists every shop with status + counts, and the highest-value ops:
// Open Storefront, kill-switch (status), Open Shop Admin (stubbed until the
// audited-impersonation slice P4.3). Platform-only. (docs/PLATFORM_ARCHITECTURE.md)
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { APP_URLS } from '../../config/urls';
import PlatformLayout from '../../components/platform/PlatformLayout';
import ProvisionShopModal from '../../components/platform/ProvisionShopModal';
import ImpersonateShopModal from '../../components/platform/ImpersonateShopModal';
import AddShopUserModal from '../../components/platform/AddShopUserModal';
import toast from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const PlatformShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showProvision, setShowProvision] = useState(false);
  const [impersonateShop, setImpersonateShop] = useState(null);
  const [addUserShop, setAddUserShop] = useState(null);

  const loadShops = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'shops'));
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const withCounts = await Promise.all(
        base.map(async (shop) => {
          const counts = {};
          for (const col of ['products', 'orders', 'b2cCustomers']) {
            try {
              const agg = await getCountFromServer(
                query(collection(db, col), where('shopId', '==', shop.id))
              );
              counts[col] = agg.data().count;
            } catch {
              counts[col] = null;
            }
          }
          return { ...shop, counts };
        })
      );

      withCounts.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      setShops(withCounts);
    } catch (e) {
      console.error('Error loading shops:', e);
      toast.error('Kunde inte ladda butiker');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const toggleStatus = async (shop) => {
    const next = shop.status === 'disabled' ? 'active' : 'disabled';
    const verb = next === 'disabled' ? 'inaktivera' : 'aktivera';
    if (!window.confirm(`Vill du ${verb} "${shop.name || shop.id}"?`)) return;
    try {
      setSavingId(shop.id);
      await updateDoc(doc(db, 'shops', shop.id), { status: next });
      setShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, status: next } : s)));
      toast.success(`"${shop.name || shop.id}" ${next === 'disabled' ? 'inaktiverad' : 'aktiverad'}`);
    } catch (e) {
      console.error('Error toggling status:', e);
      toast.error('Kunde inte ändra status');
    } finally {
      setSavingId(null);
    }
  };

  const openStorefront = (shop) => {
    // Path-prefix multi-tenant grammar: each shop's storefront is /{shopId}.
    window.open(`${APP_URLS.B2C_SHOP}/${shop.id}`, '_blank', 'noopener');
  };

  return (
    <PlatformLayout>
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Butiker</h1>
            <p className="text-gray-400 mt-1">Alla butiker på plattformen.</p>
          </div>
          <button
            onClick={() => setShowProvision(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <PlusIcon className="h-4 w-4" />
            Ny butik
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Laddar…</div>
        ) : shops.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <BuildingStorefrontIcon className="h-10 w-10 mx-auto mb-3 text-gray-700" />
            Inga butiker ännu.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-gray-900">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Butik</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Produkter</th>
                  <th className="px-5 py-3 text-right">Ordrar</th>
                  <th className="px-5 py-3 text-right">Kunder</th>
                  <th className="px-5 py-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shops.map((shop) => {
                  const disabled = shop.status === 'disabled';
                  return (
                    <tr key={shop.id} className="hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="font-medium text-white">{shop.name || shop.id}</div>
                        <div className="text-xs text-gray-500">{shop.id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                            (disabled ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300')
                          }
                        >
                          {disabled ? 'Inaktiverad' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-gray-300">{shop.counts?.products ?? '–'}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-gray-300">{shop.counts?.orders ?? '–'}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-gray-300">{shop.counts?.b2cCustomers ?? '–'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStorefront(shop)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 text-gray-200 hover:bg-white/10"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            Butik
                          </button>
                          <button
                            onClick={() => setAddUserShop(shop)}
                            title="Lägg till en admin för butiken"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            Användare
                          </button>
                          <button
                            onClick={() => setImpersonateShop(shop)}
                            disabled={disabled}
                            title={
                              disabled
                                ? 'Butiken är inaktiverad — aktivera först'
                                : 'Öppna butikens admin som plattformsadmin (loggas)'
                            }
                            className={
                              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ' +
                              (disabled
                                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                : 'bg-white/5 text-gray-200 hover:bg-amber-500/15 hover:text-amber-300')
                            }
                          >
                            Admin
                          </button>
                          <button
                            onClick={() => toggleStatus(shop)}
                            disabled={savingId === shop.id}
                            className={
                              'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ' +
                              (disabled
                                ? 'bg-green-600 text-white hover:bg-green-500'
                                : 'bg-white/5 text-gray-300 hover:bg-red-500/15 hover:text-red-300')
                            }
                          >
                            {savingId === shop.id ? '…' : disabled ? 'Aktivera' : 'Inaktivera'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-600">
          Nästa steg: säker "Öppna Shop Admin" (impersonering), tillägg/add-ons, fakturering.
        </p>
      </div>

      {showProvision && (
        <ProvisionShopModal
          onClose={() => setShowProvision(false)}
          onCreated={loadShops}
        />
      )}

      {impersonateShop && (
        <ImpersonateShopModal
          shop={impersonateShop}
          onClose={() => setImpersonateShop(null)}
        />
      )}

      {addUserShop && (
        <AddShopUserModal
          shop={addUserShop}
          onClose={() => setAddUserShop(null)}
        />
      )}
    </PlatformLayout>
  );
};

export default PlatformShops;
