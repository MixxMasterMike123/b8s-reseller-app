// mockupRender.js — rasterize a Design Studio mockup: garment SVG flat + placed
// artwork → <canvas> → WebP (or PNG) blob.
//
// Browser-only, NO Firebase imports — the storage upload lives in mockupUpload.js
// so this renderer stays usable from the dev harness and any future export path
// (e.g. downloading a mockup to feed an image model). The math is the SAME
// placementMath the interactive canvas uses, so what the seller saw is what gets
// rasterized — the "inga tryck-överraskningar" contract extends to the export.
//
// The SVG flat is a React component; renderToStaticMarkup turns it into markup
// (hooks like useMemo run fine in static rendering), which draws onto the canvas
// via an <img> with an SVG data URL. Explicit width/height attributes are set on
// the root <svg> — Safari rasterizes dimensionless SVG images at 0×0 otherwise.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GARMENT_FLATS, GARMENT_VIEWBOX } from './garments';
import {
  pxPerMm, isComposable, placementHeightMm, clampPlacement, defaultPlacement,
} from './placementMath';

// Export resolution: viewBox (800×900) × 2 = 1600×1800 px. Product-image class,
// not print class — the print file is the artwork ORIGINAL, decoupled by design.
export const MOCKUP_SCALE = 2;

// Load an image for canvas drawing. crossOrigin=anonymous so Firebase Storage
// download URLs (CORS: *) don't taint the canvas; harmless for data/object URLs.
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Kunde inte läsa bilden för mockupen.'));
  img.src = src;
});

const flatToDataUrl = (garment, hex, widthPx, heightPx) => {
  const Flat = GARMENT_FLATS[garment];
  if (!Flat) throw new Error(`Okänt plagg: ${garment}`);
  const markup = renderToStaticMarkup(
    React.createElement(Flat, { color: hex, width: widthPx, height: heightPx })
  );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
};

// canvas.toBlob with graceful format fallback: Safari ignores image/webp and
// returns PNG — we report the ACTUAL type back so filenames/paths stay truthful.
const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Kunde inte skapa mockup-bilden.'));
  }, type, quality);
});

/**
 * renderMockup({ template, colorway, slot, artwork, placement, … }) →
 *   Promise<{ blob, type: 'image/webp'|'image/png', width, height }>
 *
 * One mockup = one garment view: the flat in the colourway's hex with the
 * artwork drawn at its placement (mm → viewBox px → export px). placement may be
 * null → the slot's defaultPlacement (same fallback the canvas shows). artwork
 * may be null / non-composable → garment-only mockup (still valid, e.g. a
 * colourway with no print).
 */
export const renderMockup = async ({
  template, colorway, slot = 'front', artwork = null, placement = null,
  scale = MOCKUP_SCALE, type = 'image/webp', quality = 0.92, background = '#ffffff',
}) => {
  const viewBox = GARMENT_VIEWBOX[template.garment];
  if (!viewBox) throw new Error(`Okänt plagg: ${template.garment}`);
  const W = Math.round(viewBox.w * scale);
  const H = Math.round(viewBox.h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Solid background — product images shouldn't ship with alpha (marketplaces
  // and the storefront cards expect a filled frame).
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const flatImg = await loadImage(flatToDataUrl(template.garment, colorway?.hex || '#ffffff', W, H));
  ctx.drawImage(flatImg, 0, 0, W, H);

  const areaRect = template.printAreas?.[slot];
  const ppm = pxPerMm(template, slot);
  if (artwork && isComposable(artwork) && areaRect && ppm) {
    const p = clampPlacement(
      placement || defaultPlacement(template, slot, artwork),
      template, slot, artwork
    );
    if (p) {
      const artImg = await loadImage(artwork.previewUrl);
      ctx.drawImage(
        artImg,
        (areaRect.x + p.xMm * ppm.x) * scale,
        (areaRect.y + p.yMm * ppm.y) * scale,
        p.wMm * ppm.x * scale,
        placementHeightMm(p, artwork) * ppm.y * scale
      );
    }
  }

  const blob = await canvasToBlob(canvas, type, quality);
  return { blob, type: blob.type, width: W, height: H };
};
