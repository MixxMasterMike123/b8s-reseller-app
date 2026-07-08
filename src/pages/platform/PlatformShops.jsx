// PlatformShops — the operator console HOME: the tenant fleet table.
// Lists every shop with status + counts, and the highest-value ops:
// Open Storefront, kill-switch (status), Open Shop Admin (stubbed until the
// audited-impersonation slice P4.3). Platform-only. (docs/PLATFORM_ARCHITECTURE.md)
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { APP_URLS } from '../../config/urls';
import PlatformLayout from '../../components/platform/PlatformLayout';
import ProvisionShopModal from '../../components/platform/ProvisionShopModal';
import ImpersonateShopModal from '../../components/platform/ImpersonateShopModal';
import AddShopUserModal from '../../components/platform/AddShopUserModal';
import MigrateShopifyModal from '../../components/platform/MigrateShopifyModal';
import { getLegalReadiness } from '../../utils/legalPageReadiness';
import toast from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const PlatformShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showProvision, setShowProvision] = useState(false);
  const [impersonateShop, setImpersonateShop] = useState(null);
  const [addUserShop, setAddUserShop] = useState(null);
  const [migrateShop, setMigrateShop] = useState(null);

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

  // Operator opt-in for Stripe Connect. This only flips the gate that lets the
  // shop START onboarding (payments.connectEnabled); the shop still has to
  // complete Stripe onboarding before it can take payments (chargesEnabled).
  const toggleConnectEnabled = async (shop) => {
    const next = !(shop.payments?.connectEnabled === true);
    try {
      setSavingId(shop.id);
      await updateDoc(doc(db, 'shops', shop.id), { 'payments.connectEnabled': next });
      setShops((prev) => prev.map((s) =>
        s.id === shop.id ? { ...s, payments: { ...(s.payments || {}), connectEnabled: next } } : s));
      toast.success(`Betalningar ${next ? 'aktiverade' : 'inaktiverade'} för "${shop.name || shop.id}"`);
    } catch (e) {
      console.error('Error toggling connectEnabled:', e);
      toast.error('Kunde inte ändra betalningsinställning');
    } finally {
      setSavingId(null);
    }
  };

  const connectLabel = (shop) => {
    const p = shop.payments || {};
    if (p.chargesEnabled) return { text: 'Aktivt', cls: 'bg-green-500/15 text-green-300' };
    if (p.stripeAccountId) return { text: 'Onboarding', cls: 'bg-amber-500/15 text-amber-300' };
    if (p.connectEnabled) return { text: 'Inbjuden', cls: 'bg-sky-500/15 text-sky-300' };
    return { text: 'Av', cls: 'bg-white/5 text-gray-500' };
  };

  return (
    <PlatformLayout>
      <div className="px-6 lg:px-10 py-8 max-w-[1600px]">
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
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Butik</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Betalningar</th>
                  <th className="px-4 py-3">Avgift</th>
                  <th className="px-4 py-3">Juridik</th>
                  <th className="px-3 py-3 text-right">Produkter</th>
                  <th className="px-3 py-3 text-right">Ordrar</th>
                  <th className="px-3 py-3 text-right">Kunder</th>
                  <th className="px-4 py-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shops.map((shop) => {
                  const disabled = shop.status === 'disabled';
                  return (
                    <tr key={shop.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{shop.name || shop.id}</div>
                        <div className="text-xs text-gray-500">{shop.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                            (disabled ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300')
                          }
                        >
                          {disabled ? 'Inaktiverad' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => { const c = connectLabel(shop); return (
                          <div className="flex items-center gap-2">
                            <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ' + c.cls}>{c.text}</span>
                            {!shop.payments?.chargesEnabled && (
                              <button
                                onClick={() => toggleConnectEnabled(shop)}
                                disabled={savingId === shop.id}
                                title={shop.payments?.connectEnabled ? 'Dra tillbaka inbjudan' : 'Bjud in butiken att aktivera betalningar'}
                                className="rounded-lg px-2 py-1 text-xs font-medium bg-white/5 text-gray-300 hover:bg-sky-500/15 hover:text-sky-300 disabled:opacity-50"
                              >
                                {savingId === shop.id ? '…' : (shop.payments?.connectEnabled ? 'Återkalla' : 'Bjud in')}
                              </button>
                            )}
                          </div>
                        ); })()}
                      </td>
                      <td className="px-4 py-3">
                        <CommissionCell shop={shop} onSaved={(bps) => setShops((prev) => prev.map((s) =>
                          s.id === shop.id ? { ...s, payments: { ...(s.payments || {}), commissionBps: bps } } : s))} />
                      </td>
                      <td className="px-4 py-3">
                        <LegalCell shop={shop} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-300">{shop.counts?.products ?? '–'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-300">{shop.counts?.orders ?? '–'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-300">{shop.counts?.b2cCustomers ?? '–'}</td>
                      <td className="px-4 py-3">
                        {/* Table-action buttons follow the platform design-system
                            compact scale (rounded-lg px-3 py-1 text-xs, per
                            PlatformDac7): icon-only with tooltips so all four fit
                            without clipping the row. */}
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openStorefront(shop)}
                            title="Öppna butikens storefront"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium bg-white/5 text-gray-200 hover:bg-white/10"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            <span className="hidden xl:inline">Butik</span>
                          </button>
                          <button
                            onClick={() => setAddUserShop(shop)}
                            title="Lägg till en admin för butiken"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium bg-white/5 text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            <span className="hidden xl:inline">Användare</span>
                          </button>
                          <button
                            onClick={() => setMigrateShop(shop)}
                            title="Importera produkter från en Shopify-butik (demo)"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium bg-white/5 text-gray-200 hover:bg-emerald-500/15 hover:text-emerald-300"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span className="hidden xl:inline">Migrera</span>
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
                              'inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ' +
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
                              'inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ' +
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
          Nästa steg: fakturering.
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

      {migrateShop && (
        <MigrateShopifyModal
          shop={migrateShop}
          onClose={() => setMigrateShop(null)}
        />
      )}
    </PlatformLayout>
  );
};

// Legal-pages readiness for the operator. Reads the same gate the seller's
// AdminSettings + the storefront use (legalPageReadiness.js) against the shop's
// stored storeIdentity, so the operator sees at a glance whether a shop's
// auto-generated legal pages are publishable (return address + VAT status set).
// No extra fetch: storeIdentity already rides on the shop doc loaded above.
// DARK platform design: emerald = ready, amber = incomplete (mirrors connectLabel).
const LegalCell = ({ shop }) => {
  const { ready, blockers } = getLegalReadiness(shop.storeIdentity || {});
  if (ready) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-300">
        Klar
      </span>
    );
  }
  return (
    <span
      title={blockers.map((b) => b.label).join('\n')}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-300"
    >
      Ofullständig ({blockers.length})
    </span>
  );
};

// Per-shop platform commission — PLATFORM-ONLY (negotiate a lower fee for a big
// seller). Shows the effective fee or "Standard" (platform default applies when
// unset), with an inline editor. Percentage in/out; stored as integer basis
// points via setShopCommission (requirePlatform server-side; firestore.rules
// also blocks a direct payments-map write). The shop owner never sees this.
const CommissionCell = ({ shop, onSaved }) => {
  const currentBps = Number.isInteger(shop.payments?.commissionBps) ? shop.payments.commissionBps : null;
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(currentBps != null ? (currentBps / 100).toString() : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = parseFloat((pct || '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error('Ange 0–100 %.'); return; }
    const bps = Math.round(n * 100);
    try {
      setSaving(true);
      await httpsCallable(functions, 'setShopCommission')({ shopId: shop.id, commissionBps: bps });
      toast.success(`Avgift sparad: ${(bps / 100).toFixed(2)} %`);
      onSaved?.(bps);
      setEditing(false);
    } catch (e) {
      toast.error(e.message || 'Kunde inte spara avgift.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setPct(currentBps != null ? (currentBps / 100).toString() : ''); setEditing(true); }}
        title="Sätt plattformsavgift för denna butik"
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300"
      >
        {currentBps != null ? `${(currentBps / 100).toFixed(2)} %` : <span className="text-gray-500">Standard</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min="0" max="100" step="0.01" value={pct} autoFocus
        onChange={(e) => setPct(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        placeholder="5"
        className="w-16 rounded-lg border border-white/10 bg-gray-950 px-2 py-1 text-xs text-gray-100 focus:border-indigo-500 focus:outline-none"
      />
      <span className="text-xs text-gray-500">%</span>
      <button disabled={saving} onClick={save} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
        {saving ? '…' : 'Spara'}
      </button>
      <button onClick={() => setEditing(false)} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-400 hover:bg-white/10">✕</button>
    </div>
  );
};

export default PlatformShops;
