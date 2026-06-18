// Image upload + compression for Firebase Storage.
//
// Extracted verbatim from AdminProducts.jsx so product uploads are
// byte-for-byte unchanged, then shared with the storefront branding UI
// (logo/hero) per the Shopify-lite admin plan (docs/ADMIN_STOREFRONT_PLAN.md).
//
// NOTE: this intentionally keeps its own preset table rather than reusing
// imageOptimization.compressImage() — that helper's named sizes (large=800@0.9,
// original=1200@0.95) do NOT match the product presets (b2c=1000@0.9,
// default=800@0.85), so routing products through it would silently change
// output quality. The two coexist: imageOptimization for display-time helpers,
// this for the upload pipeline.

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

// Compression presets keyed by imageType. The first five are the EXACT values
// previously inline in AdminProducts (do not change — product output depends on
// them). 'logo' and 'hero' are new, for storefront branding.
const COMPRESSION_SETTINGS = {
  b2b: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
  b2c: { maxWidth: 1000, maxHeight: 1000, quality: 0.9 },
  ean_png: { maxWidth: 400, maxHeight: 400, quality: 0.95 },
  ean_svg: { maxWidth: 400, maxHeight: 400, quality: 0.95 },
  default: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
  // Branding:
  logo: { maxWidth: 600, maxHeight: 600, quality: 0.92 },
  hero: { maxWidth: 1600, maxHeight: 1200, quality: 0.85 },
};

// Compress an image file to WebP at the preset for imageType.
// Mirrors the prior AdminProducts compressImageForUpload exactly for the
// shared product imageTypes.
export const compressImageForUpload = (file, imageType) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const settings = COMPRESSION_SETTINGS[imageType] || COMPRESSION_SETTINGS.default;

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > settings.maxWidth || height > settings.maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = settings.maxWidth;
          height = width / aspectRatio;
        } else {
          height = settings.maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // High-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP for better compression (50% smaller than JPEG)
      canvas.toBlob(resolve, 'image/webp', settings.quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

// Upload an image to Firebase Storage at the given path prefix, compressing
// first. Returns the download URL. `pathPrefix` replaces the old hardcoded
// `products/{productId}` so branding can target `branding/`.
export const uploadImageToStorage = async (file, pathPrefix, imageType) => {
  try {
    const timestamp = Date.now();
    const compressedFile = await compressImageForUpload(file, imageType);

    const fileName = `${imageType}_${timestamp}_${compressedFile.name || file.name}`;
    const storageRef = ref(storage, `${pathPrefix}/${fileName}`);

    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading ${imageType}:`, error);
    throw error;
  }
};

// Convenience wrapper for storefront branding images (logo/hero).
// kind is 'logo' | 'hero'. Stored under branding/{shopId}/ (Phase B tenant
// isolation — the path is shopId-partitioned so the storage rule
// isAdminOfShop(shopId) can scope writes to the owning shop). Callers MUST
// pass the active shopId (from useShopId()).
export const uploadStoreImage = (file, kind, shopId) =>
  uploadImageToStorage(file, `branding/${shopId}`, kind);
