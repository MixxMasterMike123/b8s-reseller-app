// AdminStorefront — shop-owner controls for the NORD storefront's visual
// identity (DESIGN.md). First NORD-styled admin page. Slice 1: Brand + Hero.
// Story / Gallery / block toggles arrive in the next slice.
//
// Reads/writes via the shopConfig seam (settings/app today, shops/{shopId}
// later). Images go through the shared uploader (utils/imageUpload).

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { STORE } from '../../config/store';
import { loadShopConfig, saveShopConfig } from '../../config/shopConfig';
import { uploadStoreImage } from '../../utils/imageUpload';
import { evaluateAccentContrast } from '../../utils/colorContrast';
import {
  PaintBrushIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// Only the keys this page owns. We load the full config but save a merge of
// just these, so we never clobber identity/social fields owned by Settings.
const BRANDING_KEYS = [
  'accent',
  'logoUrl',
  'heroImageUrl',
  'heroHeadline',
  'heroSubtitle',
  'heroCtaLabel',
  'heroSecondaryLabel',
];

const pickBranding = (cfg) =>
  BRANDING_KEYS.reduce((acc, k) => {
    if (cfg[k] !== undefined) acc[k] = cfg[k];
    return acc;
  }, {});

const AdminStorefront = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, hero: false });
  const [form, setForm] = useState(pickBranding(STORE));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadShopConfig();
        if (cancelled) return;
        // STORE defaults under saved values (only branding keys).
        setForm({ ...pickBranding(STORE), ...pickBranding(saved) });
      } catch (error) {
        console.warn('AdminStorefront: using defaults:', error?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await saveShopConfig(pickBranding(form));
      toast.success('Butikens utseende sparat. Ladda om butiken för att se ändringarna.');
    } catch (error) {
      console.error('Error saving storefront branding:', error);
      toast.error('Kunde inte spara. Försök igen.');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleImageUpload = async (kind, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Välj en bildfil.');
      return;
    }
    try {
      setUploading((u) => ({ ...u, [kind]: true }));
      const url = await uploadStoreImage(file, kind);
      setField(kind === 'logo' ? 'logoUrl' : 'heroImageUrl', url);
      toast.success(`${kind === 'logo' ? 'Logotyp' : 'Hero-bild'} uppladdad. Glöm inte att spara.`);
    } catch (error) {
      console.error(`Error uploading ${kind}:`, error);
      toast.error('Uppladdning misslyckades.');
    } finally {
      setUploading((u) => ({ ...u, [kind]: false }));
    }
  };

  const accentHex = form.accent || STORE.accent;
  const contrast = evaluateAccentContrast(accentHex);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-full bg-canvas font-body text-ink -m-4 sm:-m-6 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Butik</h1>
              <p className="text-ink-muted mt-1">Utseende och innehåll för din webbutik.</p>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              Förhandsgranska butik
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>

          {/* Tile: Brand */}
          <section className="bg-white rounded-tile shadow-tile p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <PaintBrushIcon className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl font-bold text-ink">Varumärke</h2>
            </div>

            {/* Accent */}
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Accentfärg</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(accentHex) ? accentHex : '#000000'}
                    onChange={(e) => setField('accent', e.target.value)}
                    className="h-11 w-14 rounded-el border border-ink/15 bg-white cursor-pointer p-1"
                    aria-label="Välj accentfärg"
                  />
                  <input
                    type="text"
                    value={form.accent ?? ''}
                    placeholder={STORE.accent}
                    onChange={(e) => setField('accent', e.target.value)}
                    className="w-32 px-3 py-2.5 border border-ink/15 bg-white rounded-el text-base font-mono focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Live sample + AA check */}
              <div className="rounded-el bg-canvas p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="inline-flex items-center text-white text-sm font-bold px-5 py-2.5 rounded-full"
                    style={{ backgroundColor: contrast.valid ? accentHex : '#999' }}
                  >
                    Knappexempel
                  </span>
                  {contrast.valid ? (
                    contrast.passAA ? (
                      <span className="text-sm font-semibold text-green-700">✓ Tillräcklig kontrast (AA)</span>
                    ) : contrast.passAALarge ? (
                      <span className="text-sm font-semibold text-amber-600">
                        ⚠ Endast OK för stora knappar — välj gärna mörkare
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-red-600">
                        ⚠ För ljus — vit text blir svårläst
                      </span>
                    )
                  ) : (
                    <span className="text-sm font-semibold text-red-600">Ogiltig färgkod</span>
                  )}
                </div>
                <p className="text-xs text-ink-faint mt-2">
                  Accentfärgen används bara på knappar och aktiva element i butiken.
                </p>
              </div>
            </div>

            {/* Logo */}
            <div className="mt-6 pt-6 border-t border-ink/10">
              <label className="block text-sm font-semibold text-ink mb-2">Logotyp</label>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="h-14 w-32 rounded-el bg-canvas flex items-center justify-center overflow-hidden">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logotyp" className="max-h-12 max-w-28 object-contain" />
                  ) : (
                    <PhotoIcon className="h-6 w-6 text-ink-faint" />
                  )}
                </div>
                <label className="inline-flex items-center gap-2 bg-ink text-white text-sm font-semibold px-4 py-2.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {uploading.logo ? 'Laddar upp…' : 'Ladda upp logotyp'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading.logo}
                    onChange={(e) => handleImageUpload('logo', e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            {/* Hero image */}
            <div className="mt-6 pt-6 border-t border-ink/10">
              <label className="block text-sm font-semibold text-ink mb-2">Hero-bild (startsidans toppbild)</label>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="h-20 w-32 rounded-el bg-canvas flex items-center justify-center overflow-hidden">
                  {form.heroImageUrl ? (
                    <img src={form.heroImageUrl} alt="Hero" className="h-full w-full object-cover" />
                  ) : (
                    <PhotoIcon className="h-6 w-6 text-ink-faint" />
                  )}
                </div>
                <label className="inline-flex items-center gap-2 bg-ink text-white text-sm font-semibold px-4 py-2.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {uploading.hero ? 'Laddar upp…' : 'Ladda upp hero-bild'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading.hero}
                    onChange={(e) => handleImageUpload('hero', e.target.files?.[0])}
                  />
                </label>
              </div>
              <p className="text-xs text-ink-faint mt-2">
                Lämna tom för att visa en stilren accentfärgad bakgrund istället.
              </p>
            </div>
          </section>

          {/* Tile: Hero copy */}
          <section className="bg-white rounded-tile shadow-tile p-6 sm:p-7">
            <h2 className="font-display text-xl font-bold text-ink mb-5">Hero-text</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Rubrik</label>
                <input
                  type="text"
                  value={form.heroHeadline ?? ''}
                  placeholder="Lämna tom för standardrubrik"
                  onChange={(e) => setField('heroHeadline', e.target.value)}
                  className="w-full px-4 py-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Underrubrik</label>
                <textarea
                  rows={2}
                  value={form.heroSubtitle ?? ''}
                  placeholder="Lämna tom för standardtext"
                  onChange={(e) => setField('heroSubtitle', e.target.value)}
                  className="w-full px-4 py-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Knapptext</label>
                  <input
                    type="text"
                    value={form.heroCtaLabel ?? ''}
                    placeholder="t.ex. Handla nu"
                    onChange={(e) => setField('heroCtaLabel', e.target.value)}
                    className="w-full px-4 py-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">Sekundär länktext</label>
                  <input
                    type="text"
                    value={form.heroSecondaryLabel ?? ''}
                    placeholder="t.ex. Se sortimentet ↓"
                    onChange={(e) => setField('heroSecondaryLabel', e.target.value)}
                    className="w-full px-4 py-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Save bar */}
          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-accent text-white font-bold px-6 py-3.5 rounded-full shadow-lift disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <CheckIcon className="h-5 w-5" />
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminStorefront;
