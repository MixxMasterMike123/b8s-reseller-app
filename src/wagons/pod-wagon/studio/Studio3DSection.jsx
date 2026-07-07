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
// physical print area, AND at least one render-ready colourway. The platform
// console can hold half-configured models — this guard keeps them out of the
// picker (and away from pixi) entirely.
const renderReady = (models = []) =>
  (Array.isArray(models) ? models : []).filter((m) => {
    const v = m?.views?.front;
    const pa = m?.printAreaMm?.front;
    return v?.w && v?.h && pa?.w > 0 && pa?.h > 0 && readyColorwayIds(m).length > 0;
  });

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

// Shared slider row (label · range · value).
const Slider = ({ label, min, max, step, value, onChange, fmt = (v) => v }) => (
  <label className="flex items-center gap-2 text-[12px] text-admin-text-muted">
    <span className="w-28 shrink-0">{label}</span>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1"
    />
    <span className="w-14 text-right tabular-nums text-admin-text">{fmt(value)}</span>
  </label>
);

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
            <>
              <Suspense fallback={<div className="grid aspect-[4/5] max-w-[420px] place-items-center text-[12px] text-admin-text-muted">Laddar 3D-motorn…</div>}>
                <DisplacementPreview
                  ref={previewRef}
                  garment={garment}
                  viewId="front"
                  colorwayId={effColorwayId}
                  artworkUrl={artwork.previewUrl}
                  placement={effectivePlacement}
                  tuning={tuning}
                  className="max-w-[420px]"
                />
              </Suspense>
              {/* Model + colourway picker — the render-ready library models. The
                  model <select> only appears with >1 model (a single model shows
                  its label as static text); the colourway <select> only with >1
                  render-ready colourway. Styled with the admin design tokens, to
                  match the blend <select> below. */}
              <div className="mt-3 flex max-w-[420px] flex-wrap items-center gap-3">
                <img
                  src={garment.views.front.colorways[effColorwayId]?.photoUrl}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
                <label className="flex items-center gap-2 text-[12px] text-admin-text-muted">
                  <span className="shrink-0">Modell</span>
                  {garments.length > 1 ? (
                    <select
                      value={garment.id}
                      onChange={(e) => setModelId(e.target.value)}
                      className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] text-admin-text focus:border-admin-info-dot focus:outline-none"
                    >
                      {garments.map((g) => (
                        <option key={g.id} value={g.id}>{g.label || g.id}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-admin-text">{garment.label || garment.id}</span>
                  )}
                </label>
                {colorwayIds.length > 1 && (
                  <label className="flex items-center gap-2 text-[12px] text-admin-text-muted">
                    <span className="shrink-0">Färgväg</span>
                    <select
                      value={effColorwayId}
                      onChange={(e) => setColorwayId(e.target.value)}
                      className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] text-admin-text focus:border-admin-info-dot focus:outline-none"
                    >
                      {colorwayIds.map((cwId) => (
                        <option key={cwId} value={cwId}>
                          {garment.views.front.colorways[cwId]?.label || cwId}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {/* Placement sliders — the 3D view's OWN composition (product image
                  only, never a print instruction). Then the tuning knobs. */}
              <div className="mt-3 flex max-w-[420px] flex-col gap-2">
                <Slider label="Bredd (cm)" min={5} max={30} step={0.5}
                  value={effectivePlacement.wMm / 10}
                  onChange={(v) => patchP3d({ wMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Vänster (cm)" min={0} max={30} step={0.5}
                  value={effectivePlacement.xMm / 10}
                  onChange={(v) => patchP3d({ xMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Uppifrån (cm)" min={0} max={40} step={0.5}
                  value={effectivePlacement.yMm / 10}
                  onChange={(v) => patchP3d({ yMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Rotation" min={-30} max={30} step={0.5}
                  value={effectivePlacement.rotationDeg || 0}
                  onChange={(v) => patchP3d({ rotationDeg: v })}
                  fmt={(v) => `${v}°`} />
                <div className="my-1 border-t border-admin-border-soft" />
                <Slider label="Displacement" min={0} max={100} step={1}
                  value={tuning.displacementScale}
                  onChange={(v) => setTuning((t) => ({ ...t, displacementScale: v }))} />
                <Slider label="Opacitet" min={0} max={1} step={0.05}
                  value={tuning.alpha}
                  onChange={(v) => setTuning((t) => ({ ...t, alpha: v }))}
                  fmt={(v) => v.toFixed(2)} />
                <label className="flex items-center gap-2 text-[12px] text-admin-text-muted">
                  <span className="w-28 shrink-0">Blend</span>
                  <select
                    value={tuning.blend}
                    onChange={(e) => setTuning((t) => ({ ...t, blend: e.target.value }))}
                    className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] text-admin-text focus:border-admin-info-dot focus:outline-none"
                  >
                    <option value="multiply">multiply</option>
                    <option value="screen">screen</option>
                    <option value="overlay">overlay</option>
                    <option value="normal">normal</option>
                    <option value="add">add</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={downloadPNG}
                  disabled={busy}
                  className="rounded-[var(--radius-admin-el)] border border-admin-border px-2.5 py-1 text-[12px] text-admin-text hover:bg-admin-surface-2 disabled:opacity-40"
                >
                  {busy ? 'Skapar…' : 'Ladda ner 3D-bild (PNG)'}
                </button>
                <span className="text-[11px] text-admin-text-faint">
                  Position/storlek/rotation styrs i placerings-vyn ovanför.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Studio3DSection;
