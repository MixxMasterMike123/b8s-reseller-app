// AdminSettings.jsx - Admin Settings with per-user wagon management
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import wagonRegistry from '../../wagons/WagonRegistry.js';
import { STORE } from '../../config/store';
import { loadShopConfig, saveShopConfig } from '../../config/shopConfig';
import PickupLocationsEditor from '../../components/admin/PickupLocationsEditor';
import {
  Page,
  Card,
  CardSection,
  SegmentedTabs,
  StatusPill,
  Button,
} from '../../components/admin/ui';

// Icons
import {
  CpuChipIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const AdminSettings = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [availableWagons, setAvailableWagons] = useState([]);
  const [userWagonSettings, setUserWagonSettings] = useState({});
  const [storeForm, setStoreForm] = useState(STORE);
  const [activeTab, setActiveTab] = useState('wagons');

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

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadUsers(),
          loadWagons(), // Now async
          loadUserWagonSettings()
        ]);
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast.error('Fel vid laddning av inställningar');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load admin users only
  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.role === 'admin'); // Only show admin users
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  // Load available wagons from registry (including disabled ones)
  const loadWagons = async () => {
    try {
      await wagonRegistry.ensureWagonsDiscovered();
      const wagonsMap = wagonRegistry.getAllWagons(); // Get ALL wagons for admin management
      const wagonsArray = Array.from(wagonsMap.values()); // Convert Map to Array
      setAvailableWagons(wagonsArray);
    } catch (error) {
      console.error('Error loading wagons:', error);
      throw error;
    }
  };

  // Load user wagon settings from Firestore
  const loadUserWagonSettings = async () => {
    try {
      const settingsSnapshot = await getDocs(collection(db, 'userWagonSettings'));
      const settings = {};

      settingsSnapshot.docs.forEach(doc => {
        settings[doc.id] = doc.data();
      });

      setUserWagonSettings(settings);
    } catch (error) {
      console.error('Error loading user wagon settings:', error);
      throw error;
    }
  };


  // Toggle wagon for user
  const toggleWagonForUser = useCallback(async (userId, wagonId, enabled) => {
    try {
      setSaving(true);

      const userWagonDocRef = doc(db, 'userWagonSettings', userId);
      const currentSettings = userWagonSettings[userId] || { wagons: {} };

      const updatedSettings = {
        ...currentSettings,
        wagons: {
          ...currentSettings.wagons,
          [wagonId]: {
            enabled,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
          }
        },
        lastUpdated: new Date().toISOString()
      };

      await setDoc(userWagonDocRef, updatedSettings, { merge: true });

      // Update local state
      setUserWagonSettings(prev => ({
        ...prev,
        [userId]: updatedSettings
      }));

      const user = users.find(u => u.id === userId);
      const wagon = availableWagons.find(w => w.manifest.id === wagonId);

      toast.success(
        `${wagon?.manifest.name || wagonId} ${enabled ? 'aktiverad' : 'inaktiverad'} för ${user?.companyName || user?.email}`
      );

    } catch (error) {
      console.error('Error updating wagon setting:', error);
      toast.error('Fel vid uppdatering av wagon-inställning');
    } finally {
      setSaving(false);
    }
  }, [currentUser.uid, users, availableWagons, userWagonSettings]);

  // Check if wagon is enabled for user
  const isWagonEnabledForUser = (userId, wagonId) => {
    const user = users.find(u => u.id === userId);

    // Admins get access to all wagons by default
    if (user?.role === 'admin') {
      const userSettings = userWagonSettings[userId];
      if (!userSettings || !userSettings.wagons) return true; // Default enabled for admins

      const wagonSetting = userSettings.wagons[wagonId];
      return wagonSetting ? wagonSetting.enabled : true; // Default enabled for admins
    }

    // Non-admin users need explicit permission
    const userSettings = userWagonSettings[userId];
    if (!userSettings || !userSettings.wagons) return false; // Default disabled for non-admins

    const wagonSetting = userSettings.wagons[wagonId];
    return wagonSetting?.enabled === true; // Only enabled if explicitly set to true
  };

  // Get wagon status info
  const getWagonStatusInfo = (wagon) => {
    const manifest = wagon.manifest;
    const enabledForUsers = users.filter(user =>
      isWagonEnabledForUser(user.id, manifest.id)
    ).length;

    let status = 'available';
    let statusText = 'Tillgänglig';

    if (!manifest.enabled) {
      status = 'disabled-manifest';
      statusText = 'Inaktiverad i manifest';
    } else if (enabledForUsers === 0) {
      status = 'disabled-users';
      statusText = 'Endast admins (säker standard)';
    } else if (enabledForUsers < users.length) {
      status = 'partially-enabled';
      statusText = 'Delvis aktiverad';
    }

    return {
      manifestEnabled: manifest.enabled,
      enabledForUsers,
      totalUsers: users.length,
      status,
      statusText
    };
  };

  // Map a wagon status to a StatusPill tone (preserves the prior colour intent).
  const toneForWagonStatus = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'partially-enabled': return 'warning';
      case 'disabled-manifest': return 'danger';
      default: return 'neutral';
    }
  };

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
        subtitle="Hantera wagon-system och applikationsinställningar"
        actions={
          <SegmentedTabs
            ariaLabel="Inställningssektion"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'wagons', label: 'Wagon Management' },
              { value: 'app', label: 'Applikationsinställningar' },
            ]}
          />
        }
      >
        <div className="space-y-4">
          {activeTab === 'wagons' && (
            <>
              {/* Wagon overview */}
              <CardSection
                title="Wagon Management System (Autodetect)"
                bodyClassName="space-y-4"
              >
                <p className="text-[13px] text-admin-text-muted">
                  Aktivera eller inaktivera specifika wagons för admin-användare.{' '}
                  <strong className="text-admin-text">Endast admins visas:</strong> Wagons är strikt för
                  admin-användare endast. Systemet hittar automatiskt alla wagons (även inaktiverade).
                  Wagons som är inaktiverade i manifestet visas men kan inte aktiveras för användare.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 px-3 py-2">
                    <div className="text-[12px] text-admin-text-muted">Totalt antal wagons</div>
                    <div className="mt-0.5 text-[16px] font-semibold text-admin-text tabular-nums">
                      {availableWagons.length}
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 px-3 py-2">
                    <div className="text-[12px] text-admin-text-muted">Aktiva wagons</div>
                    <div className="mt-0.5 text-[16px] font-semibold text-admin-text tabular-nums">
                      {availableWagons.filter(w => w.manifest.enabled).length}
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 px-3 py-2">
                    <div className="text-[12px] text-admin-text-muted">Aktiva användare</div>
                    <div className="mt-0.5 text-[16px] font-semibold text-admin-text tabular-nums">
                      {users.filter(u => u.active || u.isActive).length}
                    </div>
                  </div>
                </div>
              </CardSection>

              {/* Wagons list */}
              {availableWagons.length === 0 ? (
                <Card className="py-12 text-center">
                  <CpuChipIcon className="h-10 w-10 mx-auto mb-3 text-admin-text-faint" />
                  <p className="text-[13px] text-admin-text-muted">
                    Inga wagons hittades. Kontrollera att wagons är korrekt konfigurerade.
                  </p>
                </Card>
              ) : (
                availableWagons.map((wagon) => {
                  const statusInfo = getWagonStatusInfo(wagon);
                  const manifest = wagon.manifest;

                  return (
                    <Card key={manifest.id}>
                      {/* Wagon header */}
                      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-admin-border">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[14px] font-semibold text-admin-text">{manifest.name}</h3>
                            <span className="text-[12px] text-admin-text-muted">v{manifest.version}</span>
                            {!statusInfo.manifestEnabled && (
                              <StatusPill tone="danger">Manifest inaktiverad</StatusPill>
                            )}
                          </div>
                          <p className="mt-1 text-[13px] text-admin-text-muted">{manifest.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="mb-1 text-[12px] text-admin-text-muted">
                            Aktiv för {statusInfo.enabledForUsers}/{statusInfo.totalUsers} användare
                          </div>
                          <StatusPill tone={toneForWagonStatus(statusInfo.status)}>
                            {statusInfo.statusText}
                          </StatusPill>
                        </div>
                      </div>

                      {/* User settings */}
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between gap-3 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 px-3 py-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium text-admin-text">
                                  {user.companyName || user.email}
                                </div>
                                <div className="truncate text-[12px] text-admin-text-muted">
                                  {user.contactPerson || user.email}
                                </div>
                                {(!user.active && !user.isActive) && (
                                  <div className="text-[12px] text-red-600">Inaktiv användare</div>
                                )}
                              </div>
                              <button
                                onClick={() => toggleWagonForUser(
                                  user.id,
                                  manifest.id,
                                  !isWagonEnabledForUser(user.id, manifest.id)
                                )}
                                disabled={!statusInfo.manifestEnabled || saving}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] focus-visible:ring-offset-1 ${
                                  isWagonEnabledForUser(user.id, manifest.id) && statusInfo.manifestEnabled
                                    ? 'bg-[var(--color-admin-primary)]'
                                    : 'bg-admin-border'
                                } ${
                                  !statusInfo.manifestEnabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                    isWagonEnabledForUser(user.id, manifest.id) && statusInfo.manifestEnabled
                                      ? 'translate-x-4'
                                      : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'app' && (
            <>
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
            </>
          )}
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminSettings;
