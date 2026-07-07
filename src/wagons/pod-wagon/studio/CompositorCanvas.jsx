// CompositorCanvas.jsx — MOUNT POINT for the Design Studio canvas compositor.
//
// ⛔ THIS IS A SLICE-1 STUB. The real canvas compositor (slice 2) replaces the body
// of this component. It renders the garment flat, overlays the artwork inside the
// print area with drag/scale, computes effective DPI per placement, and returns a
// generated mockup via onResult. Slice 1 only draws the garment + a dashed
// print-area outline + a "coming next" placeholder, so the studio shell is
// eyeball-testable now.
//
// The props below are the CONTRACT the real compositor will receive — do not rename
// them without updating DesignStudio.jsx:
//   • template  — the selected mockup template (from podMockupTemplates); carries
//                 garment, colorways, printAreas (px, viewBox coords) + printAreaMm.
//   • colorway  — the selected colourway object { id, label, hex }.
//   • slot      — the active placement slot id ('front' | 'back' | …); indexes
//                 template.printAreas / template.printAreaMm.
//   • artwork   — the selected artwork doc (podArtwork) to place, or null.
//   • onResult  — (result) => void; the compositor calls this when it produces a
//                 mockup (e.g. { blob, dataUrl, placement }). Unused in the stub.
import React from 'react';
import { GARMENT_FLATS, GARMENT_VIEWBOX } from './garments';

// The px→% helper: convert a viewBox-pixel print-area rect into CSS percentages so
// the dashed overlay scales with the responsive SVG. Shared shape with the real
// compositor's placement math.
const rectToPercent = (rect, viewBox) => ({
  left: `${(rect.x / viewBox.w) * 100}%`,
  top: `${(rect.y / viewBox.h) * 100}%`,
  width: `${(rect.w / viewBox.w) * 100}%`,
  height: `${(rect.h / viewBox.h) * 100}%`,
});

const CompositorCanvas = ({ template, colorway, slot = 'front', artwork = null, onResult }) => {
  // Resolve the garment flat React component + its viewBox by the template's garment.
  const Flat = template ? GARMENT_FLATS[template.garment] : null;
  const viewBox = template ? GARMENT_VIEWBOX[template.garment] : null;
  const rect = template?.printAreas?.[slot] || null;

  if (!template || !Flat || !viewBox) {
    return (
      <div className="grid aspect-[8/9] w-full max-w-[520px] place-items-center rounded-[var(--radius-admin)] border border-dashed border-admin-border bg-admin-surface-2 text-[13px] text-admin-text-muted">
        Välj en mall för att förhandsgranska.
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Garment flat at full size. */}
      <Flat color={colorway?.hex || '#ffffff'} className="block h-auto w-full" />

      {/* Dashed print-area overlay + the compositor placeholder. Positioned over
          the exact print-area rect (percent of the responsive SVG). */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-[4px] border-2 border-dashed border-admin-info-dot/80"
          style={rectToPercent(rect, viewBox)}
        >
          <div className="flex h-full w-full items-center justify-center p-2 text-center">
            <span className="rounded-[6px] bg-admin-surface/85 px-2 py-1 text-[11px] font-medium text-admin-text-muted shadow-[var(--shadow-admin)]">
              Kompositor kommer i nästa steg
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompositorCanvas;
