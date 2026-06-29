// PodAdminPage — the admin surface for the Print on Demand add-on.
//
// Two sections, switched by a simple tab:
//   • Original (Slice 3): the artwork library — upload + validate print files.
//   • Produktkoppling (Slice 4): map a validated artwork → product SKU + placement.
//
// Design: wraps <AppLayout> (REQUIRED — an admin page without it loses the menu)
// on the Admin-Neutral design system (Page / CardSection / Button + admin-* tokens).
//
// Gating: the route is already wrapped in <AddonGate feature="pod"> + <AdminRoute>
// (App.jsx), so reaching here implies the shop is entitled. We still read
// useShopFeatures() defensively and useShopId() to scope all data to the shop.
import React, { useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { Page, CardSection, Button } from '../../../components/admin/ui';
import { useShopId } from '../../../contexts/ShopContext';
import { useShopFeatures } from '../../../contexts/ShopFeaturesContext';
import ArtworkLibrary from './ArtworkLibrary';
import ProductMapping from './ProductMapping';

// Provisional-spec banner: the seeded print profiles are industry-typical
// PLACEHOLDERS until the real print shop delivers its specs. Surfaced here and in
// the upload modal so a seller never treats a PASS as a guarantee.
const ProvisionalBanner = () => (
  <div className="mb-4 rounded-[var(--radius-admin)] border border-admin-caution-dot/30 bg-admin-caution-bg px-4 py-3 text-[13px] text-admin-caution-text">
    <span className="font-semibold">Preliminära trycksparametrar.</span>{' '}
    Specarna nedan är branschtypiska platshållare och valideringen är{' '}
    <span className="font-semibold">vägledande</span> — verifiera alltid med tryckeriet
    innan produktion.
  </div>
);

const TABS = [
  { key: 'library', label: 'Original' },
  { key: 'mapping', label: 'Produktkoppling' },
];

const PodAdminPage = () => {
  const shopId = useShopId();
  const { isEnabled } = useShopFeatures();
  const [tab, setTab] = useState('library');

  // Defensive: the route guard already blocks a non-entitled shop, but never
  // render the tooling if the add-on is off (belt-and-suspenders).
  if (!isEnabled('pod')) {
    return (
      <AppLayout>
        <Page title="Print on demand">
          <CardSection>
            <p className="text-[13px] text-admin-text-muted">
              Print on demand-tillägget är inte aktiverat för den här butiken.
            </p>
          </CardSection>
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page title="Print on demand">
        <ProvisionalBanner />

        {/* Tab switch */}
        <div className="mb-4 flex gap-1">
          {TABS.map((tDef) => {
            const active = tab === tDef.key;
            return (
              <button
                key={tDef.key}
                type="button"
                onClick={() => setTab(tDef.key)}
                className={`rounded-[var(--radius-admin-el)] px-3 py-1.5 text-[13px] ${
                  active
                    ? 'bg-black/[0.08] font-semibold text-admin-text'
                    : 'font-medium text-admin-text-muted hover:bg-black/[0.06]'
                }`}
              >
                {tDef.label}
              </button>
            );
          })}
        </div>

        {tab === 'library' ? (
          <ArtworkLibrary shopId={shopId} />
        ) : (
          <ProductMapping shopId={shopId} />
        )}
      </Page>
    </AppLayout>
  );
};

export default PodAdminPage;
