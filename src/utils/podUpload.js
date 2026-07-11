// podUpload.js — POD artwork upload + measurement.
//
// CRITICAL: print originals must NEVER go through imageUpload.js
// (compressImageForUpload WebP-compresses + resizes — that destroys a print file).
// uploadPodOriginal uploads the file BYTE-FOR-BYTE via uploadBytes (mirrors
// fileUpload.uploadFile / affiliatePayouts.uploadInvoicePDF). A SEPARATE low-res
// web preview is generated for the UI only; the original is untouched.
//
// Storage layout (shopId-partitioned, matches storage.rules pod-artwork block):
//   pod-artwork/{shopId}/originals/{ts}_{safeName}   ← the print-ready original
//   pod-artwork/{shopId}/previews/{ts}.webp          ← ~800px web preview (UI only)
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const PREVIEW_MAX_EDGE = 800; // longest-edge cap for the web preview
const ALPHA_OPAQUE_THRESHOLD = 250; // alpha < this counts as a transparent pixel

// File extension (lowercase, no dot) from a filename.
export const extOf = (name) => {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};

const safeName = (name) => String(name || 'artwork').replace(/[^a-zA-Z0-9.-]/g, '_');

// Formats the browser's Image() can decode to read pixel dimensions + alpha.
// PDF/SVG/TIFF generally cannot be decoded this way — we degrade gracefully.
const RASTER_DECODABLE = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);

/**
 * toDecodableFile(file) → Promise<File>
 * Browsers can't decode TIFF, so readImageDimensions/generatePodPreview go blind on
 * a .tif/.tiff pick (null dims, no preview → Design Studio disables the artwork).
 * For TIFF we decode the FIRST page client-side into a PNG File the browser CAN read.
 *
 * INVARIANT: the returned PNG is ONLY for measurement + preview. The ORIGINAL TIFF is
 * still what uploadPodOriginal ships to the printer — callers must keep passing the
 * original file there. Any decode failure returns the ORIGINAL unchanged, so we simply
 * fall back to today's dims-unknown WARN instead of crashing.
 *
 * utif2 is lazy-imported so the decoder never lands in the main bundle.
 */
export const toDecodableFile = async (file) => {
  if (extOf(file.name) !== 'tif' && extOf(file.name) !== 'tiff') return file;
  try {
    const mod = await import('utif2');
    const UTIF = mod.default || mod;
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) throw new Error('no IFDs');
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]); // Uint8Array, RGBA
    const w = ifds[0].width;
    const h = ifds[0].height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer), w, h), 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('toBlob returned null');
    return new File([blob], file.name.replace(/\.tiff?$/i, '.png'), { type: 'image/png' });
  } catch (err) {
    // Graceful fallback: measure/preview go blind (dims-unknown WARN), original still prints.
    console.warn('toDecodableFile: TIFF decode failed, using original for measurement:', err);
    return file;
  }
};

/**
 * readImageDimensions(file) → Promise<{ width, height }>
 * Natural pixel dims via the Image() DOM API. Returns { width:null, height:null }
 * for formats the browser can't decode (PDF/SVG/TIFF) or on decode error — the
 * validation engine treats null dims as "dimensions_unknown" (WARN, not crash).
 */
export const readImageDimensions = (file) =>
  new Promise((resolve) => {
    if (!RASTER_DECODABLE.has(extOf(file.name))) {
      resolve({ width: null, height: null });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const out = { width: img.naturalWidth || null, height: img.naturalHeight || null };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    img.src = url;
  });

/**
 * generatePodPreview(file, shopId) → Promise<{ previewUrl, previewStoragePath, hasAlphaChannel, transparentPixelRatio }>
 *
 * Draws the source to an ~800px canvas, samples the alpha channel ON THE DRAW
 * CANVAS (not the re-encoded WebP — WebP perturbs alpha), then uploads a webp
 * preview. The original file is NOT touched. For non-decodable formats
 * (PDF/SVG/TIFF) returns previewUrl:null and undefined alpha info (the UI shows a
 * file-type placeholder; validation skips the transparency rule).
 *
 * Alpha story returned:
 *   hasAlphaChannel       — false when no alpha channel exists at all (e.g. JPEG);
 *                           true when the canvas has any sub-opaque pixel; for a
 *                           fully-opaque image with a channel it is also true but
 *                           transparentPixelRatio ≈ 0 (the validator WARNs on that).
 *   transparentPixelRatio — fraction of sampled pixels with alpha < 250.
 */
export const generatePodPreview = (file, shopId) =>
  new Promise((resolve, reject) => {
    const ext = extOf(file.name);
    if (!RASTER_DECODABLE.has(ext)) {
      // Non-raster: no in-browser preview/alpha. Original still uploads separately.
      resolve({ previewUrl: null, previewStoragePath: null, hasAlphaChannel: undefined, transparentPixelRatio: undefined });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cw, ch);

        // --- alpha sampling on the DRAW canvas (before WebP encode) ---
        // JPEG never has an alpha channel; getImageData always yields 255 for it,
        // so we key "no channel" off the source format, and the transparent-pixel
        // RATIO off the actual pixels (catches solid-background PNGs).
        let hasAlphaChannel;
        let transparentPixelRatio;
        const formatCanHaveAlpha = ext === 'png' || ext === 'webp' || ext === 'gif';
        if (!formatCanHaveAlpha) {
          hasAlphaChannel = false;
          transparentPixelRatio = 0;
        } else {
          try {
            const data = ctx.getImageData(0, 0, cw, ch).data; // RGBA
            let transparent = 0;
            const totalPx = cw * ch;
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] < ALPHA_OPAQUE_THRESHOLD) transparent++;
            }
            transparentPixelRatio = totalPx > 0 ? transparent / totalPx : 0;
            hasAlphaChannel = true; // channel present (format supports it + decoded)
          } catch (e) {
            // Tainted canvas / read failure — leave alpha undefined (validator skips it)
            hasAlphaChannel = undefined;
            transparentPixelRatio = undefined;
          }
        }

        const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.7));
        URL.revokeObjectURL(url);
        if (!blob) {
          resolve({ previewUrl: null, previewStoragePath: null, hasAlphaChannel, transparentPixelRatio });
          return;
        }

        const previewStoragePath = `pod-artwork/${shopId}/previews/${Date.now()}.webp`;
        const snap = await uploadBytes(ref(storage, previewStoragePath), blob);
        const previewUrl = await getDownloadURL(snap.ref);
        resolve({ previewUrl, previewStoragePath, hasAlphaChannel, transparentPixelRatio });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Decode failed though extension looked raster — treat as no preview/alpha.
      resolve({ previewUrl: null, previewStoragePath: null, hasAlphaChannel: undefined, transparentPixelRatio: undefined });
    };
    img.src = url;
  });

/**
 * uploadPodOriginal(file, shopId, profile) → Promise<{ originalUrl, originalStoragePath, fileName, fileSizeBytes, mimeType, ext }>
 * Uploads the ORIGINAL file untouched. Hard-rejects (throws) only on a too-large
 * file vs the profile cap (a server-side guardrail before the bytes leave the
 * browser); format/quality WARN/FAIL is the validation engine's job (advisory).
 */
export const uploadPodOriginal = async (file, shopId, profile) => {
  if (!shopId) throw new Error('shopId krävs för uppladdning.');
  const ext = extOf(file.name);
  const maxBytes = (profile?.max_file_mb || 0) * 1024 * 1024;
  if (maxBytes && file.size > maxBytes) {
    throw new Error(`Filen är för stor (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${profile.max_file_mb} MB).`);
  }

  const fileName = `${Date.now()}_${safeName(file.name)}`;
  const originalStoragePath = `pod-artwork/${shopId}/originals/${fileName}`;
  const snap = await uploadBytes(ref(storage, originalStoragePath), file); // NO compression
  const originalUrl = await getDownloadURL(snap.ref);

  return {
    originalUrl,
    originalStoragePath,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || '',
    ext,
  };
};
