// mockupUpload.js — upload a rendered mockup blob to the shop's private
// pod-artwork Storage partition (draft stage; the slice-4/5 publish step copies
// finals into the public product-image flow).
//
// DETERMINISTIC path per (template, slot, colourway) — regenerating REPLACES the
// previous draft instead of accumulating orphans, so a shop holds at most one
// draft mockup set per garment template. Covered by the existing storage.rules
// block `pod-artwork/{shopId}/** → isAdminOfShop`, no rules change.
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { storage, db } from '../../../firebase/config';

// appendImageToProductGallery — append a rendered image (3D-vy render, flat
// mockup) to an EXISTING product's SECONDARY gallery. Uploads the bytes to the
// public product-image path, then arrayUnion's the download URL into
// b2cImageGallery. arrayUnion appends atomically (no read-modify-write race with
// a concurrent gallery edit) and touches ONLY b2cImageGallery — the main image
// (imageUrl/b2cImageUrl) is never referenced, so it can never be replaced. The
// studio is admin-only, so firestore.rules' isAdminOfShop update grant covers
// this client write; no callable needed.
export const appendImageToProductGallery = async ({ shopId, productId, blob, prefix, contentType }) => {
  if (!shopId || !productId) throw new Error('shopId/productId saknas.');
  const path = `products/${shopId}/${productId}/${prefix}_${Date.now()}`;
  const snap = await uploadBytes(ref(storage, path), blob, { contentType });
  const url = await getDownloadURL(snap.ref);
  await updateDoc(doc(db, 'products', productId), { b2cImageGallery: arrayUnion(url) });
  return url;
};

export const uploadMockup = async ({ blob, type, shopId, templateId, slot, colorwayId }) => {
  if (!shopId) throw new Error('shopId saknas för mockup-uppladdning.');
  // EXTENSION-LESS object name on purpose: the format varies by browser (Safari's
  // canvas falls back to PNG where Chrome gives WebP), and a format-suffixed name
  // would leave a stale sibling behind when the same draft is regenerated in a
  // different browser. The contentType metadata carries the real format.
  const storagePath = `pod-artwork/${shopId}/mockups/${templateId}/${slot}-${colorwayId}`;
  const snap = await uploadBytes(ref(storage, storagePath), blob, { contentType: type });
  const url = await getDownloadURL(snap.ref);
  return { storagePath, url };
};
