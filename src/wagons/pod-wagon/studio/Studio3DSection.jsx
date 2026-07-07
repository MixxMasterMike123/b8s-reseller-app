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
import React, { Suspense, useMemo, useRef, useState } from 'react';
import { DEV_3D_GARMENTS } from './pixi/displacement3dConfig';

const DisplacementPreview = React.lazy(() => import('./pixi/DisplacementPreview'));

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
 *   artwork            — the artwork doc to composite (front slot's resolved artwork)
 *   placement          — the FRONT slot's placement {xMm,yMm,wMm,rotationDeg} or null
 *   onPlacementChange  — (placement) => void; the placement sliders here edit the
 *                        SAME front placement the flat canvas uses (two-way sync —
 *                        the cm readout/print instruction always matches the 3D view)
 */
const Studio3DSection = ({ artwork = null, placement = null, onPlacementChange = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);
  const webgl = useMemo(hasWebGL, []);
  const garment = DEV_3D_GARMENTS[0] || null;
  // Beta TUNING knobs (live overrides of the garment config) — here to find the
  // production defaults; once settled they move into the garment config/settings
  // doc and these controls become a platform-console concern.
  const [tuning, setTuning] = useState(() => ({
    displacementScale: garment?.displacementScale ?? 30,
    alpha: garment?.alpha ?? 0.8,
    blend: garment?.blend ?? 'multiply',
  }));

  if (!garment) return null;

  // No studio placement yet (untouched slot) → the same centred default the flat
  // canvas shows, built against the 3D garment's mm space (identical 300×400).
  const mm = garment.printAreaMm?.front;
  const effectivePlacement = placement || (mm ? {
    xMm: (mm.w - mm.w * 0.7) / 2, yMm: mm.h * 0.1, wMm: mm.w * 0.7, rotationDeg: 0,
  } : null);

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
                  colorwayId="white"
                  artworkUrl={artwork.previewUrl}
                  placement={effectivePlacement}
                  tuning={tuning}
                  className="max-w-[420px]"
                />
              </Suspense>
              {/* Placement sliders — SHARED state with the flat canvas (front slot).
                  Then the beta tuning knobs: displacement/opacity/blend, live. */}
              <div className="mt-3 flex max-w-[420px] flex-col gap-2">
                <Slider label="Bredd (cm)" min={5} max={30} step={0.5}
                  value={effectivePlacement.wMm / 10}
                  onChange={(v) => onPlacementChange({ ...effectivePlacement, wMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Vänster (cm)" min={0} max={30} step={0.5}
                  value={effectivePlacement.xMm / 10}
                  onChange={(v) => onPlacementChange({ ...effectivePlacement, xMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Uppifrån (cm)" min={0} max={40} step={0.5}
                  value={effectivePlacement.yMm / 10}
                  onChange={(v) => onPlacementChange({ ...effectivePlacement, yMm: v * 10 })}
                  fmt={(v) => `${v} cm`} />
                <Slider label="Rotation" min={-30} max={30} step={0.5}
                  value={effectivePlacement.rotationDeg || 0}
                  onChange={(v) => onPlacementChange({ ...effectivePlacement, rotationDeg: v })}
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
