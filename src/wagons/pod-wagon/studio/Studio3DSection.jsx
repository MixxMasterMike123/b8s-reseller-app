// Studio3DSection.jsx — the "3D-vy (beta)" of the Design Studio: the 2.5D
// photo-displacement mockup rendered with the seller's REAL library artwork and
// the studio's live front placement (position/scale/rotation in mm — the same
// object the flat canvas edits).
//
// GATES:
//   • WebGL — the displacement warp needs it; without WebGL Pixi silently falls
//     back to Canvas2D and SKIPS the filter, which would show an unwarped fake.
//     No WebGL → honest hint instead of the toggle.
//   • A 3D garment config must exist (displacement3dConfig; photo+map registered).
//
// pixi.js loads lazily: DisplacementPreview is React.lazy'd, so its chunk is
// fetched only when the seller opens the 3D view.
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useShopId } from '../../../contexts/ShopContext';
import { listShopProductSkus } from '../../../utils/podMappings';
import { appendImageToProductGallery } from './mockupUpload';
import { DEV_3D_GARMENTS } from './pixi/displacement3dConfig';

const DisplacementPreview = React.lazy(() => import('./pixi/DisplacementPreview'));

// A colourway is render-ready only if it carries BOTH a photo and a displacement
// map — a half-configured colourway (either missing) would break the compositor.
const colorwayReady = (cw) => Boolean(cw && cw.photoUrl && cw.displacementUrl);

// Render-ready colourway keys of a garment's front view, sorted by Swedish label
// (falling back to the key). Never assumes 'white'.
const readyColorwayIds = (garment) => {
  const cws = garment?.views?.front?.colorways || {};
  return Object.keys(cws)
    .filter((k) => colorwayReady(cws[k]))
    .sort((a, b) =>
      String(cws[a]?.label || a).localeCompare(String(cws[b]?.label || b), 'sv'));
};

// A model reaches the compositor only when its front view has real dimensions, a
// physical print area, a CALIBRATED px print area (a zero rect renders the motif
// into nothing — photo shows, artwork invisible), AND at least one render-ready
// colourway. The platform console can hold half-configured models — this guard
// keeps them out of the picker (and away from pixi) entirely.
const renderReady = (models = []) =>
  (Array.isArray(models) ? models : []).filter((m) => {
    const v = m?.views?.front;
    const pa = m?.printAreaMm?.front;
    return v?.w && v?.h && v?.printArea?.w > 0 && v?.printArea?.h > 0 &&
      pa?.w > 0 && pa?.h > 0 && readyColorwayIds(m).length > 0;
  });

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

// Shared slider row — label + mono value on top, full-width styled track below
// (matches the "Modernizing slider UI design" reference). PRESENTATION ONLY: the
// control is still a native <input type="range"> with the SAME value/onChange;
// `--s3d-fill` is derived from the existing value/min/max purely to paint the
// filled portion of the track and adds no behaviour.
const Slider = ({ label, min, max, step, value, onChange, fmt = (v) => v }) => {
  const fillPct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-admin-text">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-admin-text-muted">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="s3d-range"
        style={{ '--s3d-fill': `${fillPct}%` }}
      />
    </div>
  );
};

/**
 * Props:
 *   artwork    — the artwork doc to composite (front slot's resolved artwork)
 *   placement  — the FRONT slot's print placement, used ONLY as the initial seed
 *
 * DELIBERATELY DECOUPLED from the canvas placement: the flat canvas placement is
 * the PRINT INSTRUCTION (it reaches the printer via the mapping readout); the 3D
 * view is PRODUCT-IMAGE composition only — where the motif looks right on the
 * posed model photo, which can legitimately differ from the physical print
 * placement. Its sliders therefore edit their own local state and never touch
 * the print placement (and never reset the colourway review gate).
 */
const Studio3DSection = ({ artwork = null, placement = null, models = [] }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);
  const webgl = useMemo(hasWebGL, []);

  // "Lägg till i produkt" — append the rendered 3D image to an existing product's
  // SECONDARY gallery (b2cImageGallery), never the main image. Reuses the same
  // pieces the publish flow uses: listShopProductSkus (products carry doc `id`),
  // the public products/{shopId}/{productId} Storage path, and a client updateDoc
  // (firestore.rules: products update allowed for isAdminOfShop — the studio is
  // admin-only, so no callable needed).
  const shopId = useShopId();
  const [products, setProducts] = useState([]);
  const [targetProductId, setTargetProductId] = useState('');
  const [adding, setAdding] = useState(false);

  // GARMENT SOURCE: the platform-managed library models that are render-ready.
  // In DEV builds, fall back to the hardcoded dev garment so the harness/local
  // studio still renders before any model is seeded; in PROD an empty library
  // hides the whole section (return null below).
  const garments = useMemo(() => {
    const usable = renderReady(models);
    return usable.length ? usable : (import.meta.env.DEV ? DEV_3D_GARMENTS : []);
  }, [models]);

  // Selected model — reconciled with a fallback so a disappearing id (library
  // load / edit) never leaves us pointing at nothing.
  const [modelId, setModelId] = useState(() => garments[0]?.id || null);
  const garment = garments.find((g) => g.id === modelId) || garments[0] || null;

  // Render-ready colourways of the SELECTED model (never hardcode 'white').
  const colorwayIds = useMemo(() => (garment ? readyColorwayIds(garment) : []), [garment]);
  const [colorwayId, setColorwayId] = useState(() => colorwayIds[0] || null);

  // Beta TUNING knobs (live overrides of the garment/colourway config). Re-seeded
  // on model/colourway switch (below); sliders still override live afterwards.
  const [tuning, setTuning] = useState(() => ({
    displacementScale: garment?.displacementScale ?? 30,
    displacementContrast: garment?.displacementContrast ?? 1,
    alpha: garment?.alpha ?? 0.8,
    blend: garment?.blend ?? 'multiply',
  }));

  // The 3D view's OWN placement (product-image composition). Seeded once from
  // the print placement (or a centred default), then fully independent.
  const [p3d, setP3d] = useState(null);

  // Reconcile the selected model when the library loads/changes (id vanished →
  // snap to the first available garment).
  useEffect(() => {
    if (garments.length && !garments.some((g) => g.id === modelId)) {
      setModelId(garments[0].id);
    }
  }, [garments, modelId]);

  // Reconcile the selected colourway on model switch: if the current colourway
  // isn't render-ready in the (new) model, snap to its first.
  useEffect(() => {
    if (colorwayIds.length && !colorwayIds.includes(colorwayId)) {
      setColorwayId(colorwayIds[0]);
    }
  }, [colorwayIds, colorwayId]);

  // Effective colourway: always valid for the CURRENT garment, even during the
  // one render where the reconcile effect above hasn't snapped colorwayId yet
  // (prevents a compositorConfigFor-null error flash on model switch).
  const effColorwayId = colorwayIds.includes(colorwayId) ? colorwayId : (colorwayIds[0] || null);

  // Re-seed tuning on model OR colourway switch: garment defaults with the
  // platform-configured per-colourway overrides merged over them, so the console's
  // per-colourway blend/alpha actually take effect (sliders still override live).
  useEffect(() => {
    const per = garment?.perColorway?.[effColorwayId] || {};
    setTuning({
      displacementScale: per.displacementScale ?? garment?.displacementScale ?? 30,
      displacementContrast: per.displacementContrast ?? garment?.displacementContrast ?? 1,
      alpha: per.alpha ?? garment?.alpha ?? 0.8,
      blend: per.blend ?? garment?.blend ?? 'multiply',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garment?.id, effColorwayId]);

  // Reset the 3D placement on MODEL switch only — a colour change must never
  // move the motif (placement is per-model; re-seeds from the print placement).
  useEffect(() => {
    setP3d(null);
  }, [garment?.id]);

  // Load this shop's products once the 3D view is opened (for the "Lägg till i
  // produkt" picker). Best-effort — a failure just leaves the picker empty.
  useEffect(() => {
    if (!open || !shopId) return;
    let alive = true;
    setTargetProductId(''); // drop any stale selection when the shop/open changes
    listShopProductSkus(shopId)
      .then((res) => { if (alive) setProducts(res?.products || []); })
      .catch((e) => console.warn('Studio3DSection: product list failed', e?.message));
    return () => { alive = false; };
  }, [open, shopId]);

  if (garments.length === 0 || !garment) return null;

  const mm = garment.printAreaMm?.front;
  const effectivePlacement = p3d || placement || (mm ? {
    xMm: (mm.w - mm.w * 0.7) / 2, yMm: mm.h * 0.1, wMm: mm.w * 0.7, rotationDeg: 0,
  } : null);
  const patchP3d = (patch) => setP3d({ ...effectivePlacement, ...patch });

  const downloadPNG = async () => {
    setBusy(true);
    try {
      const blob = await previewRef.current.extractPNG();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `3d-mockup.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      console.warn('Studio3DSection: extract failed', e?.message);
    } finally {
      setBusy(false);
    }
  };

  // Append the rendered 3D image to the chosen product's SECONDARY gallery via the
  // shared helper (prefix '3d'). NEVER touches imageUrl / b2cImageUrl (the main
  // image) — the helper appends to b2cImageGallery only.
  const addToProduct = async () => {
    if (!targetProductId || !shopId) return;
    setAdding(true);
    try {
      const blob = await previewRef.current.extractPNG();
      await appendImageToProductGallery({
        shopId, productId: targetProductId, blob, prefix: '3d', contentType: 'image/png',
      });
      const name = products.find((p) => p.id === targetProductId)?.name || 'produkten';
      toast.success(`3D-bilden lades till som extra bild på ${name}.`);
      setTargetProductId(''); // ready for the next add
    } catch (e) {
      console.warn('Studio3DSection: addToProduct failed', e?.message);
      toast.error('Kunde inte lägga till bilden på produkten.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-4 border-t border-admin-border-soft pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[12px] font-medium text-admin-text">3D-vy</span>
          <span className="ml-1.5 rounded-full bg-admin-info-bg px-1.5 py-0.5 text-[10px] font-medium text-admin-info-text">beta</span>
          <span className="ml-2 text-[11px] text-admin-text-faint">
            Motivet följer tygets veck på ett riktigt plaggfoto
          </span>
        </div>
        {webgl ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-[var(--radius-admin-el)] border border-admin-border px-2.5 py-1 text-[12px] text-admin-text hover:bg-admin-surface-2"
          >
            {open ? 'Dölj 3D-vy' : 'Visa 3D-vy'}
          </button>
        ) : (
          <span className="text-[11px] text-admin-text-faint">
            Din webbläsare saknar WebGL — 3D-vyn kan inte visas här.
          </span>
        )}
      </div>

      {open && webgl && (
        <div className="mt-3">
          {!artwork?.previewUrl ? (
            <p className="text-[12px] text-admin-text-muted">Välj ett original för att se 3D-vyn.</p>
          ) : (
            /* Two-column layout: 2/3 canvas · 1/3 controls rail (desktop). The
               larger canvas makes motif changes easier to read as you drag. On
               narrow widths it stacks. */
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Canvas — 2/3 */}
              <div className="lg:col-span-2">
                <Suspense fallback={<div className="grid aspect-[4/5] w-full place-items-center rounded-xl bg-admin-surface-2 text-[12px] text-admin-text-muted">Laddar 3D-motorn…</div>}>
                  <DisplacementPreview
                    ref={previewRef}
                    garment={garment}
                    viewId="front"
                    colorwayId={effColorwayId}
                    artworkUrl={artwork.previewUrl}
                    placement={effectivePlacement}
                    tuning={tuning}
                    className="w-full"
                  />
                </Suspense>
              </div>

              {/* Controls rail — 1/3 */}
              <div className="flex flex-col gap-5 rounded-xl border border-admin-border-soft bg-admin-surface p-4 lg:col-span-1">
                {/* Model + colourway picker — the render-ready library models. The
                    model <select> only appears with >1 model (a single model shows
                    its label as static text); the colourway <select> only with >1
                    render-ready colourway. */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-admin-text-muted">Modell</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={garment.views.front.colorways[effColorwayId]?.photoUrl}
                      alt=""
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                    {garments.length > 1 ? (
                      <select
                        value={garment.id}
                        onChange={(e) => setModelId(e.target.value)}
                        aria-label="Modell"
                        className="rounded-[10px] border border-admin-border bg-admin-surface px-2.5 py-1.5 text-[13px] font-medium text-admin-text focus:border-admin-info-dot focus:outline-none"
                      >
                        {garments.map((g) => (
                          <option key={g.id} value={g.id}>{g.label || g.id}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[13px] font-medium text-admin-text">{garment.label || garment.id}</span>
                    )}
                  </div>
                </div>
                {colorwayIds.length > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-admin-text-muted">Färgväg</span>
                    <select
                      value={effColorwayId}
                      onChange={(e) => setColorwayId(e.target.value)}
                      aria-label="Färgväg"
                      className="rounded-[10px] border border-admin-border bg-admin-surface px-2.5 py-1.5 text-[13px] font-medium text-admin-text focus:border-admin-info-dot focus:outline-none"
                    >
                      {colorwayIds.map((cwId) => (
                        <option key={cwId} value={cwId}>
                          {garment.views.front.colorways[cwId]?.label || cwId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PLACERING section */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-admin-text-faint">Placering</span>
                  <span className="h-px flex-1 bg-admin-border-soft" />
                </div>
                {/* Placement sliders — the 3D view's OWN composition (product image
                    only, never a print instruction). */}
                <div className="flex flex-col gap-4">
                  <Slider label="Bredd" min={5} max={30} step={0.5}
                    value={effectivePlacement.wMm / 10}
                    onChange={(v) => patchP3d({ wMm: v * 10 })}
                    fmt={(v) => `${v} cm`} />
                  <Slider label="Vänster" min={0} max={30} step={0.5}
                    value={effectivePlacement.xMm / 10}
                    onChange={(v) => patchP3d({ xMm: v * 10 })}
                    fmt={(v) => `${v} cm`} />
                  <Slider label="Uppifrån" min={0} max={40} step={0.5}
                    value={effectivePlacement.yMm / 10}
                    onChange={(v) => patchP3d({ yMm: v * 10 })}
                    fmt={(v) => `${v} cm`} />
                  <Slider label="Rotation" min={-30} max={30} step={0.5}
                    value={effectivePlacement.rotationDeg || 0}
                    onChange={(v) => patchP3d({ rotationDeg: v })}
                    fmt={(v) => `${v}°`} />
                </div>

                {/* UTSEENDE section */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-admin-text-faint">Utseende</span>
                  <span className="h-px flex-1 bg-admin-border-soft" />
                </div>
                <div className="flex flex-col gap-4">
                  <Slider label="Displacement" min={0} max={100} step={1}
                    value={tuning.displacementScale}
                    onChange={(v) => setTuning((t) => ({ ...t, displacementScale: v }))} />
                  <Slider label="Kontrast (karta)" min={0.5} max={4} step={0.1}
                    value={tuning.displacementContrast}
                    onChange={(v) => setTuning((t) => ({ ...t, displacementContrast: v }))}
                    fmt={(v) => v.toFixed(1)} />
                  <Slider label="Opacitet" min={0} max={1} step={0.05}
                    value={tuning.alpha}
                    onChange={(v) => setTuning((t) => ({ ...t, alpha: v }))}
                    fmt={(v) => v.toFixed(2)} />
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <span className="text-[13px] text-admin-text">Blend</span>
                    <select
                      value={tuning.blend}
                      onChange={(e) => setTuning((t) => ({ ...t, blend: e.target.value }))}
                      aria-label="Blend"
                      className="min-w-[120px] rounded-[10px] border border-admin-border bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-text focus:border-admin-info-dot focus:outline-none"
                    >
                      <option value="multiply">multiply</option>
                      <option value="screen">screen</option>
                      <option value="overlay">overlay</option>
                      <option value="normal">normal</option>
                      <option value="add">add</option>
                    </select>
                  </div>
                </div>

                {/* Download — full-width dark button, per reference */}
                <div className="mt-1 border-t border-admin-border-soft pt-4">
                  <button
                    type="button"
                    onClick={downloadPNG}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-admin-text px-4 py-3 text-[14px] font-medium text-admin-surface transition-shadow hover:shadow-lg disabled:opacity-40"
                  >
                    {busy ? 'Skapar…' : 'Ladda ner 3D-bild (PNG)'}
                  </button>

                  {/* Add to an existing product as a SECONDARY gallery image. Only
                      shown when the shop has products. Never sets the main image. */}
                  {products.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={targetProductId}
                        onChange={(e) => setTargetProductId(e.target.value)}
                        aria-label="Välj produkt att lägga bilden på"
                        className="min-w-0 flex-1 rounded-[10px] border border-admin-border bg-admin-surface px-2.5 py-2 text-[13px] text-admin-text focus:border-admin-info-dot focus:outline-none"
                      >
                        <option value="">Lägg till i produkt…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name || '(namnlös produkt)'}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addToProduct}
                        disabled={!targetProductId || adding}
                        className="shrink-0 rounded-[10px] border border-admin-border px-3 py-2 text-[13px] font-medium text-admin-text hover:bg-admin-surface-2 disabled:opacity-40"
                      >
                        {adding ? 'Lägger till…' : 'Lägg till'}
                      </button>
                    </div>
                  )}

                  <p className="mt-3 text-[12px] leading-relaxed text-admin-text-faint">
                    Position, storlek och rotation styrs med reglagen ovan (påverkar bara produktbilden, inte trycket).
                    {products.length > 0 && ' Bilden läggs till som extra produktbild, aldrig som huvudbild.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Studio3DSection;
