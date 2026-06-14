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
  PlusIcon,
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
  'storyTitle',
  'story',
  'gallery',
  'blocks',
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
  const [galleryUploading, setGalleryUploading] = useState(-1);
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

  // ----- Block visibility toggles -----
  const blocks = form.blocks || {};
  const toggleBlock = (key) =>
    setForm((prev) => ({
      ...prev,
      blocks: { ...(prev.blocks || {}), [key]: (prev.blocks?.[key] ?? true) === false ? true : false },
    }));
  const blockOn = (key) => (blocks[key] ?? true) !== false;

  // ----- Story steps (array of { title, text }, max 3) -----
  const story = Array.isArray(form.story) ? form.story : [];
  const setStoryStep = (i, field, value) =>
    setForm((prev) => {
      const next = [...(Array.isArray(prev.story) ? prev.story : [])];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, story: next };
    });
  const addStoryStep = () =>
    setForm((prev) => {
      const cur = Array.isArray(prev.story) ? prev.story : [];
      if (cur.length >= 3) return prev;
      return { ...prev, story: [...cur, { title: '', text: '' }] };
    });
  const removeStoryStep = (i) =>
    setForm((prev) => ({ ...prev, story: (prev.story || []).filter((_, idx) => idx !== i) }));

  // ----- Gallery items (array of { imageUrl, label, linkSku }, max 4) -----
  const gallery = Array.isArray(form.gallery) ? form.gallery : [];
  const setGalleryItem = (i, field, value) =>
    setForm((prev) => {
      const next = [...(Array.isArray(prev.gallery) ? prev.gallery : [])];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, gallery: next };
    });
  const addGalleryItem = () =>
    setForm((prev) => {
      const cur = Array.isArray(prev.gallery) ? prev.gallery : [];
      if (cur.length >= 4) return prev;
      return { ...prev, gallery: [...cur, { imageUrl: '', label: '', linkSku: '' }] };
    });
  const removeGalleryItem = (i) =>
    setForm((prev) => ({ ...prev, gallery: (prev.gallery || []).filter((_, idx) => idx !== i) }));
  const handleGalleryUpload = async (i, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Välj en bildfil.');
      return;
    }
    try {
      setGalleryUploading(i);
      const url = await uploadStoreImage(file, 'hero');
      setGalleryItem(i, 'imageUrl', url);
      toast.success('Bild uppladdad. Glöm inte att spara.');
    } catch (error) {
      console.error('Error uploading gallery image:', error);
      toast.error('Uppladdning misslyckades.');
    } finally {
      setGalleryUploading(-1);
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

          {/* Tile: Homepage blocks */}
          <section className="bg-white rounded-tile shadow-tile p-6 sm:p-7">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Startsidans block</h2>
            <p className="text-ink-muted text-sm mb-5">Slå av block du inte vill visa på startsidan.</p>
            <div className="divide-y divide-ink/10">
              {[
                { key: 'gallery', label: 'Galleri', desc: 'Bildrad under hero-sektionen' },
                { key: 'story', label: 'Berättelse', desc: 'Tre steg som berättar om din butik' },
                { key: 'bestseller', label: 'Bästsäljare', desc: 'Utvald produkt i hero-rutnätet' },
                { key: 'trust', label: 'Trygghet', desc: 'Omdöme + betalsätt i hero-rutnätet' },
              ].map((b) => (
                <div key={b.key} className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="font-semibold text-ink">{b.label}</div>
                    <div className="text-sm text-ink-muted">{b.desc}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={blockOn(b.key)}
                    onClick={() => toggleBlock(b.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      blockOn(b.key) ? 'bg-accent' : 'bg-ink/15'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        blockOn(b.key) ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Tile: Story */}
          <section className="bg-white rounded-tile shadow-tile p-6 sm:p-7">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Berättelse</h2>
            <p className="text-ink-muted text-sm mb-5">Upp till tre steg. Lämna tomt för att använda standardtexten.</p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-ink mb-2">Rubrik</label>
              <input
                type="text"
                value={form.storyTitle ?? ''}
                placeholder="t.ex. Från kusten till ditt bord"
                onChange={(e) => setField('storyTitle', e.target.value)}
                className="w-full px-4 py-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
              />
            </div>
            <div className="space-y-4">
              {story.map((step, i) => (
                <div key={i} className="rounded-el bg-canvas p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStoryStep(i)}
                      className="text-sm text-ink-muted hover:text-red-600 transition-colors"
                    >
                      Ta bort
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step?.title ?? ''}
                    placeholder="Steg-rubrik"
                    onChange={(e) => setStoryStep(i, 'title', e.target.value)}
                    className="w-full px-3 py-2.5 mb-2 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                  <textarea
                    rows={2}
                    value={step?.text ?? ''}
                    placeholder="Steg-text"
                    onChange={(e) => setStoryStep(i, 'text', e.target.value)}
                    className="w-full px-3 py-2.5 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                </div>
              ))}
            </div>
            {story.length < 3 && (
              <button
                type="button"
                onClick={addStoryStep}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:opacity-80 transition-opacity"
              >
                <PlusIcon className="h-4 w-4" /> Lägg till steg
              </button>
            )}
          </section>

          {/* Tile: Gallery */}
          <section className="bg-white rounded-tile shadow-tile p-6 sm:p-7">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Galleri</h2>
            <p className="text-ink-muted text-sm mb-5">Upp till fyra bilder. Lämna tomt för att använda standardgalleriet.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {gallery.map((item, i) => (
                <div key={i} className="rounded-el bg-canvas p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 rounded-el bg-white flex items-center justify-center overflow-hidden">
                      {item?.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PhotoIcon className="h-5 w-5 text-ink-faint" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center gap-2 bg-ink text-white text-xs font-semibold px-3 py-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity">
                        <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                        {galleryUploading === i ? 'Laddar…' : 'Ladda upp'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={galleryUploading === i}
                          onChange={(e) => handleGalleryUpload(i, e.target.files?.[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(i)}
                        className="ml-3 text-sm text-ink-muted hover:text-red-600 transition-colors"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={item?.label ?? ''}
                    placeholder="Etikett (valfri)"
                    onChange={(e) => setGalleryItem(i, 'label', e.target.value)}
                    className="w-full px-3 py-2.5 mt-3 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                  <input
                    type="text"
                    value={item?.linkSku ?? ''}
                    placeholder="Länka till produkt-SKU (valfri)"
                    onChange={(e) => setGalleryItem(i, 'linkSku', e.target.value)}
                    className="w-full px-3 py-2.5 mt-2 border border-ink/15 bg-white rounded-el text-base focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  />
                </div>
              ))}
            </div>
            {gallery.length < 4 && (
              <button
                type="button"
                onClick={addGalleryItem}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:opacity-80 transition-opacity"
              >
                <PlusIcon className="h-4 w-4" /> Lägg till bild
              </button>
            )}
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
