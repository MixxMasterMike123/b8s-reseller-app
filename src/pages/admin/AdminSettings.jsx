// AdminSettings.jsx — store/application settings. Add-ons are controlled per
// shop from the PLATFORM console (/addons); the old per-user wagon toggle was
// removed (add-ons S4, docs/ADDONS_PLATFORM_CONTROL_PLAN.md).
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { STORE } from '../../config/store';
import { loadShopConfig, saveShopConfig } from '../../config/shopConfig';
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

  // Seed the store-identity form from the shopConfig SEAM (not the raw
  // settings/app doc) so it follows the tenant doc shops/{shopId} once the
  // seed has run, falling back to settings/app + STORE defaults otherwise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = {};
      try {
        saved = (await loadShopConfig()) || {};
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
  }, []);

  // Save store identity via the shopConfig seam (shops/{shopId}, falling back
  // to settings/app until the seed runs — see src/config/shopConfig.js).
  const saveStoreIdentity = useCallback(async () => {
    try {
      setSaving(true);
      await saveShopConfig(storeForm);
      toast.success('Butiksinställningar sparade. Ladda om butiken för att se ändringarna.');
    } catch (error) {
      console.error('Error saving store identity:', error);
      toast.error('Fel vid sparande av butiksinställningar');
    } finally {
      setSaving(false);
    }
  }, [storeForm]);



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
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminSettings;
