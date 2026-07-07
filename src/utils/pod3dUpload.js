// pod3dUpload.js — platform-side upload of 3D model-library asset sets (garment
// photo + displacement map + optional mask) for the 2.5D displacement studio.
// Browser-only (no React); used by the platform CRUD UI (slice 2).
//
// INVARIANTS this module enforces / relies on:
//  • REGISTRATION: within one (view, colorway) the photo, displacement map and
//    (optional) mask MUST have IDENTICAL pixel dimensions — they are derived from
//    the same frame; a mismatch means they are not registered and the warp would
//    smear artwork off the garment. validateModelAssetSet is the gate.
//  • ORIGINALS ARE RAW: originals upload BYTE-FOR-BYTE (uploadBytes, no canvas) so
//    the platform keeps a pristine master. NEVER route them through imageUpload.js.
//  • DERIVATIVES ARE WHAT THE STUDIO RENDERS: the pixi compositor loads the web
//    derivatives (photo-1600 / map-1600 / mask-1600), so the model doc's coordinate
//    space (view.w/h, printArea px) is DERIVATIVE px, not original px. Because the
//    originals share dims and the downscale math is deterministic, the derivatives
//    also share dims (asserted below).
//  • ORIGINAL-DIMS ARE THE VALIDATION SPACE: colorways added later to the same view
//    are validated against the view's stored originalDims (expectedOriginalDims) so
//    every colorway of a view stays registered to the same frame.
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { readImageDimensions, extOf } from './podUpload';

const DERIVATIVE_MAX_EDGE = 1600; // longest-edge cap for the web derivatives

// Displacement-map contrast floor. A map whose folds sit too close to mid-gray
// barely warps the artwork (DisplacementFilter shifts by (luminance−0.5)×scale),
// so edges render dead straight and the 3D-vy looks flat. MEASURED EVIDENCE: a
// weak operator map read sd≈18 over its print area, a good one sd≈52 — 25 sits
// safely between them. Below this we WARN the operator (and store the number).
export const LOW_CONTRAST_SD_THRESHOLD = 25;

/**
 * measureMapContrastSd(canvas) → number
 * Grayscale std-dev of the luminance over the CENTER 60% of the canvas (the print
 * area isn't calibrated at upload time, so we sample the middle where the print
 * usually lands). Standard Rec.601 luminance (0.299/0.587/0.114); every 4th pixel
 * for speed. Higher = more fold detail = warps better.
 */
export const measureMapContrastSd = (canvas) => {
  const cw = canvas.width;
  const ch = canvas.height;
  if (!cw || !ch) return 0;
  const x0 = Math.floor(cw * 0.2);
  const y0 = Math.floor(ch * 0.2);
  const rw = Math.max(1, Math.floor(cw * 0.6));
  const rh = Math.max(1, Math.floor(ch * 0.6));
  const { data } = canvas.getContext('2d').getImageData(x0, y0, rw, rh);
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  // step 16 bytes = every 4th pixel (4 bytes/pixel).
  for (let i = 0; i < data.length; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
    n += 1;
  }
  if (!n) return 0;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  return Math.sqrt(variance);
};

// Sanitize a filename for a Storage object segment (matches podUpload's safeName).
const safeName = (name) => String(name || 'asset').replace(/[^a-zA-Z0-9.-]/g, '_');

/**
 * readDimsOrThrow(file, roleSv) → Promise<{ w, h }>
 * Reads a raster file's pixel dims; throws (Swedish) for formats the browser can't
 * decode (PDF/SVG/TIFF…) — model assets must be raster.
 */
const readDimsOrThrow = async (file) => {
  const { width, height } = await readImageDimensions(file);
  if (!width || !height) {
    throw new Error('Filen måste vara en rasterbild (JPEG/PNG/WebP).');
  }
  return { w: width, h: height };
};

/**
 * validateModelAssetSet({ photoFile, displacementFile, maskFile? }, expectedViewDims?)
 *   → Promise<{ w, h }>  (ORIGINAL pixel dims of the set)
 * Confirms the photo, map and (optional) mask are registered — identical ORIGINAL
 * pixel dims — and, when expectedViewDims ({w,h}) is given, that they match the
 * view's existing original dims. Throws a Swedish Error on any mismatch; never
 * returns without a validated {w,h}.
 */
export const validateModelAssetSet = async ({ photoFile, displacementFile, maskFile } = {}, expectedViewDims) => {
  if (!photoFile) throw new Error('Fotofil saknas.');
  if (!displacementFile) throw new Error('Displacement-karta saknas.');

  const photo = await readDimsOrThrow(photoFile);
  const map = await readDimsOrThrow(displacementFile);

  if (photo.w !== map.w || photo.h !== map.h) {
    throw new Error(
      `Fotot och displacement-kartan måste ha exakt samma pixelmått ` +
      `(foto: ${photo.w}×${photo.h}, karta: ${map.w}×${map.h}). ` +
      `De måste vara registrerade mot samma bild.`
    );
  }

  if (maskFile) {
    const mask = await readDimsOrThrow(maskFile);
    if (photo.w !== mask.w || photo.h !== mask.h) {
      throw new Error(
        `Fotot och masken måste ha exakt samma pixelmått ` +
        `(foto: ${photo.w}×${photo.h}, mask: ${mask.w}×${mask.h}). ` +
        `De måste vara registrerade mot samma bild.`
      );
    }
  }

  if (expectedViewDims && expectedViewDims.w && expectedViewDims.h) {
    if (photo.w !== expectedViewDims.w || photo.h !== expectedViewDims.h) {
      throw new Error(
        `Alla färgvägar i samma vy måste ha samma pixelmått. ` +
        `Vyn är ${expectedViewDims.w}×${expectedViewDims.h}, ` +
        `den nya filen är ${photo.w}×${photo.h}.`
      );
    }
  }

  return { w: photo.w, h: photo.h };
};

/**
 * makeWebDerivative(file, maxEdge = 1600) → Promise<{ blob, type, w, h, canvas }>
 * Canvas-downscales the longest edge to maxEdge (never upscales) and re-encodes to
 * WebP q0.9 — a UNIFORM pipeline: even an already-small jpeg/png/webp is re-encoded
 * so the studio always gets a predictable contentType. Falls back to PNG when the
 * browser can't produce WebP (keeps mask alpha). Reports the ACTUAL blob type.
 */
export const makeWebDerivative = (file, maxEdge = DERIVATIVE_MAX_EDGE) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cw, ch);

        let blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.9));
        // Browser couldn't make WebP (or gave a different type) → PNG keeps alpha.
        if (!blob || blob.type !== 'image/webp') {
          blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        }
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error('Kunde inte skapa webb-derivat av bilden.'));
          return;
        }
        // Return the canvas too so callers can measure map quality without a
        // re-decode (displacement-contrast check reuses THIS canvas).
        resolve({ blob, type: blob.type, w: cw, h: ch, canvas });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Filen måste vara en rasterbild (JPEG/PNG/WebP).'));
    };
    img.src = url;
  });

/**
 * uploadModelColorwayAssets({ modelId, viewId, colorwayId, photoFile,
 *   displacementFile, maskFile?, expectedOriginalDims? })
 *   → Promise<{ photoUrl, displacementUrl, maskUrl?, originalPaths, derivative, original, mapContrastSd }>
 *
 * Validates registration, uploads the raw originals, then uploads deterministic
 * EXTENSION-LESS web derivatives (true replace on re-upload — the contentType
 * metadata carries the real format, mirroring mockupUpload.js) and returns their
 * download URLs (token URLs; the pixi compositor loads them cross-origin with its
 * own corsbust handling — nothing to do here).
 */
export const uploadModelColorwayAssets = async ({
  modelId,
  viewId,
  colorwayId,
  photoFile,
  displacementFile,
  maskFile,
  expectedOriginalDims,
} = {}) => {
  if (!modelId) throw new Error('Modell-id saknas.');
  if (!viewId) throw new Error('Vy-id saknas.');
  if (!colorwayId) throw new Error('Färgväg-id saknas.');
  if (!photoFile) throw new Error('Fotofil saknas.');
  if (!displacementFile) throw new Error('Displacement-karta saknas.');

  // 1) Registration gate (also vs the view's existing original dims when given).
  const original = await validateModelAssetSet(
    { photoFile, displacementFile, maskFile },
    expectedOriginalDims
  );

  const base = `pod-3d-models/${modelId}/${viewId}/${colorwayId}`;

  // 2) Upload ORIGINALS raw byte-for-byte (no canvas).
  const originalPaths = {};
  const photoOrigPath = `${base}/originals/photo_${safeName(photoFile.name)}`;
  const mapOrigPath = `${base}/originals/map_${safeName(displacementFile.name)}`;
  await uploadBytes(ref(storage, photoOrigPath), photoFile);
  await uploadBytes(ref(storage, mapOrigPath), displacementFile);
  originalPaths.photo = photoOrigPath;
  originalPaths.displacement = mapOrigPath;
  if (maskFile) {
    const maskOrigPath = `${base}/originals/mask_${safeName(maskFile.name)}`;
    await uploadBytes(ref(storage, maskOrigPath), maskFile);
    originalPaths.mask = maskOrigPath;
  }

  // 3) Build + upload derivatives to EXTENSION-LESS names (true replace on re-upload).
  const photoDeriv = await makeWebDerivative(photoFile);
  const mapDeriv = await makeWebDerivative(displacementFile);

  // Originals shared dims + deterministic downscale ⇒ derivatives share dims. Assert.
  if (photoDeriv.w !== mapDeriv.w || photoDeriv.h !== mapDeriv.h) {
    throw new Error(
      `Internt fel: foto- och kart-derivaten fick olika pixelmått ` +
      `(${photoDeriv.w}×${photoDeriv.h} vs ${mapDeriv.w}×${mapDeriv.h}).`
    );
  }

  // Measure displacement-map contrast on its derivative canvas (the exact pixels
  // the studio will warp with). A low sd → warn the operator (result field below).
  const mapContrastSd = mapDeriv.canvas ? measureMapContrastSd(mapDeriv.canvas) : null;

  const photoDerivPath = `${base}/photo-1600`;
  const mapDerivPath = `${base}/map-1600`;
  const photoSnap = await uploadBytes(ref(storage, photoDerivPath), photoDeriv.blob, { contentType: photoDeriv.type });
  const mapSnap = await uploadBytes(ref(storage, mapDerivPath), mapDeriv.blob, { contentType: mapDeriv.type });
  const photoUrl = await getDownloadURL(photoSnap.ref);
  const displacementUrl = await getDownloadURL(mapSnap.ref);

  const out = {
    photoUrl,
    displacementUrl,
    originalPaths,
    derivative: { w: photoDeriv.w, h: photoDeriv.h },
    original,
    mapContrastSd, // grayscale sd of the map's print-ish center; low = weak folds
  };

  if (maskFile) {
    const maskDeriv = await makeWebDerivative(maskFile);
    const maskDerivPath = `${base}/mask-1600`;
    const maskSnap = await uploadBytes(ref(storage, maskDerivPath), maskDeriv.blob, { contentType: maskDeriv.type });
    out.maskUrl = await getDownloadURL(maskSnap.ref);
  }

  return out;
};

/**
 * deleteColorwayAssets(modelId, viewId, colorwayId) → Promise<void>
 * Best-effort recursive delete of one colorway's Storage prefix. Never throws —
 * console.warn on any failure (a doc-only delete must not leave the UI stuck).
 */
export const deleteColorwayAssets = async (modelId, viewId, colorwayId) => {
  if (!modelId) throw new Error('Modell-id saknas.');
  if (!viewId) throw new Error('Vy-id saknas.');
  if (!colorwayId) throw new Error('Färgväg-id saknas.');
  await deletePrefix(`pod-3d-models/${modelId}/${viewId}/${colorwayId}`);
};

/**
 * deleteModelAssets(modelId) → Promise<void>
 * Best-effort recursive delete of a whole model's Storage prefix. Never throws.
 */
export const deleteModelAssets = async (modelId) => {
  if (!modelId) throw new Error('Modell-id saknas.');
  await deletePrefix(`pod-3d-models/${modelId}`);
};

// Recursively delete every object under a Storage prefix (best-effort). listAll
// returns direct items + prefixes; recurse into prefixes. Promise.allSettled so one
// failure never aborts the sweep; warn and move on — never throw.
const deletePrefix = async (prefix) => {
  try {
    const res = await listAll(ref(storage, prefix));
    const results = await Promise.allSettled([
      ...res.items.map((item) => deleteObject(item)),
      ...res.prefixes.map((p) => deletePrefix(p.fullPath)),
    ]);
    results
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.warn(`pod3dUpload: kunde inte radera under ${prefix}:`, r.reason?.message));
  } catch (err) {
    console.warn(`pod3dUpload: listAll misslyckades för ${prefix}:`, err?.message);
  }
};
