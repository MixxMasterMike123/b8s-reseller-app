// MockupPanel.jsx — generated-mockups section of the Design Studio (slice 3).
//
// "Generera mockuper" rasterizes one image per colourway (× designed slot) via
// mockupRender and shows them in a grid with:
//   • hero pick — which mockup becomes the product's main image (slice 4 reads it),
//   • a per-image "Ladda ner" link — the flat mockup file is also the input for
//     external tools (e.g. feeding an image model to make photo/3D renders),
//   • a per-image "Lägg till" action — append THAT mockup to an existing product's
//     SECONDARY gallery (never the main image), mirroring the 3D-vy's add-to-product.
//     The target product is chosen once via a panel-level <select>; DesignStudio
//     owns the upload (onAddToProduct), this stays presentational apart from the
//     picker selection + the per-action busy latch.
//
// Presentational: generation state + the mockup map live in DesignStudio.
import React, { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { slotLabel } from '../../../config/podSlots';

/**
 * Props:
 *   mockups     — array of { key, colorwayLabel, slot, objectUrl, url?, type }
 *   heroKey     — key of the hero mockup (or null)
 *   onPickHero(key)
 *   onGenerate()
 *   generating  — bool
 *   error       — string | null (e.g. upload warning; generation still shown)
 *   canGenerate — bool (a composable artwork is selected)
 *   products    — [{ id, name }] existing products for the add-to-product picker
 *   onAddToProduct(mockup, productId) → Promise<bool> (true = clear picker)
 */
const MockupPanel = ({
  mockups = [], heroKey = null, onPickHero, onGenerate, generating = false,
  error = null, canGenerate = false, products = [], onAddToProduct = null,
}) => {
  // Chosen target product for the "Lägg till" actions, and the key of the mockup
  // whose add is currently in flight (per-action busy state).
  const [targetProductId, setTargetProductId] = useState('');
  const [addingKey, setAddingKey] = useState(null);

  const addToProduct = async (mockup) => {
    if (!targetProductId || addingKey || !onAddToProduct) return;
    setAddingKey(mockup.key);
    try {
      const ok = await onAddToProduct(mockup, targetProductId);
      if (ok) setTargetProductId('');
    } finally {
      setAddingKey(null);
    }
  };

  const canAdd = products.length > 0 && Boolean(onAddToProduct);

  return (
  <div className="mt-5 border-t border-admin-border-soft pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span className="text-[12px] font-medium text-admin-text">Mockuper</span>
        <span className="ml-2 text-[11px] text-admin-text-faint">
          Genereras per färg — välj huvudbild inför publicering
        </span>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="rounded-[var(--radius-admin-el)] bg-admin-primary px-3 py-1.5 text-[12px] font-medium text-white dark:text-admin-bg hover:bg-admin-primary-hover disabled:cursor-default disabled:opacity-40"
      >
        {generating ? 'Genererar…' : mockups.length ? 'Generera om' : 'Generera mockuper'}
      </button>
    </div>

    {error && (
      <p className="mt-2 rounded-[var(--radius-admin-el)] bg-admin-caution-bg px-3 py-2 text-[12px] text-admin-caution-text">
        {error}
      </p>
    )}

    {/* Add-to-product picker — choose the target product once; each mockup then
        gets its own "Lägg till" action below. Only shown with mockups + products. */}
    {mockups.length > 0 && canAdd && (
      <div className="mt-3 flex items-center gap-2">
        <select
          value={targetProductId}
          onChange={(e) => setTargetProductId(e.target.value)}
          aria-label="Välj produkt att lägga mockupen på"
          className="min-w-0 max-w-[280px] flex-1 rounded-[10px] border border-admin-border bg-admin-surface px-2.5 py-2 text-[12px] text-admin-text focus:border-admin-info-dot focus:outline-none"
        >
          <option value="">Lägg till i produkt…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name || '(namnlös produkt)'}</option>
          ))}
        </select>
        <span className="text-[11px] text-admin-text-faint">läggs till som extra produktbild, aldrig som huvudbild</span>
      </div>
    )}

    {mockups.length === 0 ? (
      <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-admin)] border border-dashed border-admin-border bg-admin-surface-2 px-4 py-5 text-[12px] text-admin-text-muted">
        <PhotoIcon className="h-5 w-5 text-admin-text-faint" />
        {canGenerate
          ? 'Inga mockuper genererade ännu.'
          : 'Välj ett original för att kunna generera mockuper.'}
      </div>
    ) : (
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {mockups.map((m) => {
          const isHero = m.key === heroKey;
          const ext = m.type === 'image/png' ? 'png' : 'webp';
          return (
            <div
              key={m.key}
              className={`rounded-[var(--radius-admin)] border p-2 ${
                isHero ? 'border-admin-info-dot ring-1 ring-admin-info-dot/40' : 'border-admin-border'
              }`}
            >
              <img
                src={m.objectUrl}
                alt={`Mockup ${m.colorwayLabel}`}
                className="w-full rounded-[6px] bg-white"
              />
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-medium text-admin-text">
                  {m.colorwayLabel}
                  {m.slot !== 'front' ? ` · ${slotLabel(m.slot)}` : ''}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={m.objectUrl}
                    download={`mockup-${m.colorwayLabel}-${m.slot}.${ext}`.toLowerCase().replace(/\s+/g, '-')}
                    className="text-[11px] text-admin-info-text hover:underline"
                  >
                    Ladda ner
                  </a>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => addToProduct(m)}
                      disabled={!targetProductId || Boolean(addingKey)}
                      className="text-[11px] text-admin-info-text hover:underline disabled:cursor-default disabled:text-admin-text-faint disabled:no-underline"
                    >
                      {addingKey === m.key ? 'Lägger till…' : 'Lägg till'}
                    </button>
                  )}
                </div>
              </div>
              <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-[11px] text-admin-text-muted">
                <input
                  type="radio"
                  name="mockup-hero"
                  checked={isHero}
                  onChange={() => onPickHero(m.key)}
                  className="h-3 w-3 accent-admin-primary"
                />
                Huvudbild
              </label>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};

export default MockupPanel;
