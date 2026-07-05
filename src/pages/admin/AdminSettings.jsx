// AdminSettings.jsx — store/application settings. Add-ons are controlled per
// shop from the PLATFORM console (/addons); the old per-user wagon toggle was
// removed (add-ons S4, docs/ADDONS_PLATFORM_CONTROL_PLAN.md).
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { STORE } from '../../config/store';
import { loadShopConfig, saveShopConfig, loadCartRecovery, saveCartRecovery } from '../../config/shopConfig';
import { useShopId } from '../../contexts/ShopContext';
import { useShopFeatures } from '../../contexts/ShopFeaturesContext';
import { getLegalReadiness } from '../../utils/legalPageReadiness';
import PickupLocationsEditor from '../../components/admin/PickupLocationsEditor';
import {
  Page,
  Card,
  CardSection,
  Button,
} from '../../components/admin/ui';

// Icons
import {
  CheckIcon,
} from '@heroicons/react/24/outline';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeForm, setStoreForm] = useState(STORE);
  // The shop this admin manages (impersonation > shop-admin's own shop > path).
  // Config MUST read/write THIS shop, not the default — else a non-default shop
  // (e.g. 'sillmans') would save to 'b8shield' and the storefront, which reads
  // its own shopId, would never see the change (pickup locations, branding…).
  const shopId = useShopId();
  const { isEnabled } = useShopFeatures();
  const abandonedCheckoutEnabled = isEnabled('abandonedCheckout');

  // Cart-recovery ("Övergiven kassa") reminder delay (hours). Loaded/saved via
  // the dedicated cartRecovery seam. Default 1h, clamped 1–24.
  const [cartRecoveryDelay, setCartRecoveryDelay] = useState(1);
  const [savingRecovery, setSavingRecovery] = useState(false);

  // Seed the store-identity form from the shopConfig SEAM for THIS shop.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = {};
      try {
        saved = (await loadShopConfig(shopId)) || {};
      } catch (e) {
        console.warn('AdminSettings: could not load shop config, using defaults:', e?.message);
      }
      if (cancelled) return;
      setStoreForm({ ...STORE, ...Object.fromEntries(
        Object.entries(saved).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ) });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  // Load the cart-recovery reminder delay for THIS shop (default 1h).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cr = (await loadCartRecovery(shopId)) || {};
        const n = Number(cr.delayHours);
        if (!cancelled) {
          setCartRecoveryDelay(Number.isFinite(n) ? Math.min(24, Math.max(1, Math.round(n))) : 1);
        }
      } catch (e) {
        console.warn('AdminSettings: could not load cart recovery config:', e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  const saveCartRecoverySettings = useCallback(async () => {
    try {
      setSavingRecovery(true);
      const clamped = Math.min(24, Math.max(1, Math.round(Number(cartRecoveryDelay) || 1)));
      await saveCartRecovery({ delayHours: clamped }, shopId);
      setCartRecoveryDelay(clamped);
      toast.success('Inställningar för övergiven kassa sparade.');
    } catch (error) {
      console.error('Error saving cart recovery settings:', error);
      toast.error('Fel vid sparande av inställningar för övergiven kassa');
    } finally {
      setSavingRecovery(false);
    }
  }, [cartRecoveryDelay, shopId]);

  // Save store identity via the shopConfig seam for THIS shop.
  const saveStoreIdentity = useCallback(async () => {
    try {
      setSaving(true);
      await saveShopConfig(storeForm, shopId);
      toast.success('Butiksinställningar sparade. Ladda om butiken för att se ändringarna.');
    } catch (error) {
      console.error('Error saving store identity:', error);
      toast.error('Fel vid sparande av butiksinställningar');
    } finally {
      setSaving(false);
    }
  }, [storeForm, shopId]);



  // Live legal-page readiness, recomputed from the in-progress form so the
  // banner updates as the seller fills in the return address / VAT status.
  const legalReadiness = getLegalReadiness(storeForm);

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  if (loading) {
    return (
      <AppLayout>
        <Page title="Inställningar">
          <Card className="flex items-center justify-center py-16">
            <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-admin-text" />
            <span className="ml-3 text-[13px] text-admin-text-muted">Laddar inställningar...</span>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title="Inställningar"
        subtitle="Hantera applikationsinställningar"
      >
        <div className="space-y-4">
          {/* Add-ons are controlled per shop from the PLATFORM console (/addons),
              not here — the old per-user wagon toggle was removed (add-ons S4).
              This page now holds only store/application settings. */}
              <CardSection title="Butiksidentitet">
                <p className="text-[13px] text-admin-text-muted">
                  Ställ in butikens namn, logotyp och kontaktuppgifter. Dessa värden visas i butiken
                  (navigering, sidfot, kassa). Ladda om butiken efter sparande för att se ändringarna.
                </p>
              </CardSection>

              <CardSection title="Allmänt" bodyClassName="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { key: 'shopName', label: 'Butiksnamn', type: 'text', placeholder: STORE.shopName },
                    { key: 'legalName', label: 'Juridiskt företagsnamn', type: 'text', placeholder: STORE.legalName },
                    { key: 'tagline', label: 'Slogan', type: 'text', placeholder: STORE.tagline },
                    { key: 'supportEmail', label: 'Support-e-post', type: 'email', placeholder: STORE.supportEmail },
                    { key: 'phone', label: 'Telefon (visas i köpvillkor & integritetspolicy)', type: 'tel', placeholder: 'T.ex. 070-123 45 67' },
                    { key: 'logoUrl', label: 'Logotyp-URL', type: 'text', placeholder: STORE.logoUrl },
                    { key: 'currency', label: 'Valuta', type: 'text', placeholder: STORE.currency },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label}</label>
                      <input
                        type={field.type}
                        value={storeForm[field.key] ?? ''}
                        placeholder={field.placeholder}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}

                  <div>
                    <label className={labelCls}>Moms (t.ex. 0.25 = 25%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={storeForm.vatRate ?? ''}
                      placeholder={String(STORE.vatRate)}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, vatRate: parseFloat(e.target.value) }))}
                      className={inputCls}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>
                      Adress (HTML tillåten, t.ex. {'<br>'} för radbrytning)
                    </label>
                    <textarea
                      rows={3}
                      value={storeForm.address ?? ''}
                      placeholder={STORE.address}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  <PickupLocationsEditor
                    value={storeForm.pickupLocations}
                    onChange={(next) => setStoreForm(prev => ({ ...prev, pickupLocations: next }))}
                  />

                  <div className="md:col-span-2">
                    <label className={labelCls}>Företagsbeskrivning (sidfot)</label>
                    <textarea
                      rows={2}
                      value={storeForm.companyDescription ?? ''}
                      placeholder={STORE.companyDescription}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, companyDescription: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Säljartyp</label>
                    <select
                      value={storeForm.sellerType ?? ''}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, sellerType: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Ej angivet</option>
                      <option value="individual">Privatperson</option>
                      <option value="company">Företag</option>
                    </select>
                    <p className="mt-1 text-[12px] text-admin-text-muted">Hämtas automatiskt från Stripe vid betalnings-onboarding; kan anges här innan dess.</p>
                  </div>

                  {[
                    { key: 'orgNumber', label: 'Organisationsnummer', placeholder: 'T.ex. 556677-8899' },
                    { key: 'businessInfo', label: 'Företagsinfo (sidfot)', placeholder: 'T.ex. Registrerad för F-skatt' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label}</label>
                      <input
                        type="text"
                        value={storeForm[field.key] ?? ''}
                        placeholder={field.placeholder}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>

                {/* Social links — empty fields hide the matching footer icon */}
                <div>
                  <h4 className="mb-3 text-[13px] font-semibold text-admin-text">
                    Sociala länkar (lämna tomt för att dölja)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['facebook', 'instagram', 'youtube', 'tiktok', 'pinterest', 'linkedin', 'website'].map((key) => (
                      <div key={key}>
                        <label className={`${labelCls} capitalize`}>{key}</label>
                        <input
                          type="url"
                          value={storeForm.social?.[key] ?? ''}
                          placeholder="https://…"
                          onChange={(e) => setStoreForm(prev => ({
                            ...prev,
                            social: { ...(prev.social || {}), [key]: e.target.value },
                          }))}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trustpilot — empty = no reviews widget. Domain + invite email. */}
                <div>
                  <h4 className="mb-3 text-[13px] font-semibold text-admin-text">
                    Trustpilot (lämna tomt för att inaktivera)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Trustpilot-domän</label>
                      <input
                        type="text"
                        value={storeForm.trustpilot?.domain ?? ''}
                        placeholder="t.ex. minbutik.se"
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          trustpilot: { ...(prev.trustpilot || {}), domain: e.target.value },
                        }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Trustpilot inbjudnings-e-post</label>
                      <input
                        type="email"
                        value={storeForm.trustpilot?.email ?? ''}
                        placeholder="t.ex. info@minbutik.se"
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          trustpilot: { ...(prev.trustpilot || {}), email: e.target.value },
                        }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Right-of-withdrawal notice (POD). Shown in the checkout gate
                    for personalized products. Leave empty to use the neutral
                    platform default. Editing bumps the stored version so the
                    proof persisted on orders references the exact text. */}
                <div>
                  <h4 className="mb-3 text-[13px] font-semibold text-admin-text">
                    Ångerrätt — text för specialtillverkade produkter
                  </h4>
                  <textarea
                    rows={4}
                    value={storeForm.legal?.noWithdrawalNotice ?? ''}
                    placeholder="Lämna tomt för plattformens standardtext (ingen ångerrätt för specialtillverkade varor)."
                    onChange={(e) => setStoreForm(prev => ({
                      ...prev,
                      legal: {
                        ...(prev.legal || {}),
                        noWithdrawalNotice: e.target.value,
                        // Stamp a version when the shop sets its own text, so the
                        // order proof can cite it. ISO date keeps it human + sortable.
                        withdrawalNoticeVersion: e.target.value.trim()
                          ? `shop-${new Date().toISOString().slice(0, 10)}`
                          : '',
                      },
                    }))}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[12px] text-admin-text-muted">
                    Visas i kassan när kunden köper en specialtillverkad produkt. Kunden måste kryssa i en ruta innan betalning.
                  </p>
                </div>

                {/* Juridik & moms — feeds the auto-genererade juridiska sidorna
                    (köpvillkor, ångerrätt & returer, integritetspolicy). Returadress
                    + momsregistrering är HÅRDA krav innan sidorna får publiceras på
                    en skarp butik (legalPageReadiness.js). */}
                <div className="border-t border-admin-border pt-5">
                  <h4 className="mb-1 text-[13px] font-semibold text-admin-text">
                    Juridik &amp; moms (för automatiska juridiska sidor)
                  </h4>
                  <p className="mb-3 text-[12px] text-admin-text-muted">
                    Dessa uppgifter fyller i butikens juridiska sidor automatiskt: köpvillkor,
                    ångerrätt &amp; returer och integritetspolicy. Returadress och momsstatus måste
                    anges innan sidorna kan publiceras på en skarp butik.
                  </p>

                  {/* Readiness banner — clear "legal pages incomplete" state. */}
                  {legalReadiness.ready ? (
                    <div className="mb-4 rounded-[var(--radius-admin-el)] border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                      ✓ Juridiska sidor är kompletta och kan publiceras.
                    </div>
                  ) : (
                    <div className="mb-4 rounded-[var(--radius-admin-el)] border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                      <p className="font-medium">⚠️ Juridiska sidor är inte kompletta — visas inte på butiken förrän följande är åtgärdat:</p>
                      <ul className="mt-1 list-disc pl-5">
                        {legalReadiness.blockers.map((b) => (
                          <li key={b.key}>{b.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Momsregistrerad?</label>
                      <select
                        value={
                          storeForm.vatRegistered === true ? 'yes'
                          : storeForm.vatRegistered === false ? 'no'
                          : ''
                        }
                        onChange={(e) => setStoreForm(prev => ({
                          ...prev,
                          vatRegistered: e.target.value === 'yes' ? true
                            : e.target.value === 'no' ? false
                            : null,
                        }))}
                        className={inputCls}
                      >
                        <option value="">Ej angivet</option>
                        <option value="yes">Ja – momsregistrerad (priser inkl. moms)</option>
                        <option value="no">Nej – ej momsregistrerad (ingen moms tillkommer)</option>
                      </select>
                      <p className={helpCls}>
                        Styr momstexten på de juridiska sidorna. Måste matcha vad kassan faktiskt tar ut.
                      </p>
                    </div>

                    {storeForm.vatRegistered === true && (
                      <div>
                        <label className={labelCls}>Momsregistreringsnummer</label>
                        <input
                          type="text"
                          value={storeForm.vatNumber ?? ''}
                          placeholder="T.ex. SE556677889901"
                          onChange={(e) => setStoreForm(prev => ({ ...prev, vatNumber: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className={labelCls}>Returadress (krävs)</label>
                      <textarea
                        rows={3}
                        value={storeForm.returnAddress ?? ''}
                        placeholder={'Mottagarens namn\nGatuadress\nPostnummer Ort'}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, returnAddress: e.target.value }))}
                        className={inputCls}
                      />
                      <p className={helpCls}>
                        Adressen dit kunder skickar returer. Visas i köpvillkoren och på sidan
                        "Ångerrätt &amp; returer".
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-admin-border pt-4">
                  <Button variant="primary" onClick={saveStoreIdentity} disabled={saving}>
                    {saving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                    {saving ? 'Sparar…' : 'Spara butiksinställningar'}
                  </Button>
                </div>
              </CardSection>

              {/* Övergiven kassa (abandoned-checkout reminder) — only when the
                  add-on is enabled for this shop (platform-controlled). */}
              {abandonedCheckoutEnabled && (
                <CardSection title="Övergiven kassa" bodyClassName="space-y-4">
                  <p className="text-[13px] text-admin-text-muted">
                    Skicka en påminnelse via e-post till kunder som påbörjade en betalning men inte
                    slutförde köpet. En påminnelse per kassa. Kunden måste ha kryssat i påminnelserutan
                    i kassan.
                  </p>
                  <div className="max-w-xs">
                    <label className={labelCls}>Fördröjning innan påminnelse (timmar)</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="1"
                      value={cartRecoveryDelay}
                      onChange={(e) => setCartRecoveryDelay(e.target.value)}
                      className={inputCls}
                    />
                    <p className={helpCls}>Mellan 1 och 24 timmar. Standard: 1 timme.</p>
                  </div>
                  <div className="flex justify-end border-t border-admin-border pt-4">
                    <Button variant="primary" onClick={saveCartRecoverySettings} disabled={savingRecovery}>
                      {savingRecovery ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )}
                      {savingRecovery ? 'Sparar…' : 'Spara'}
                    </Button>
                  </div>
                </CardSection>
              )}
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminSettings;
