// mockupUpload.js — upload a rendered mockup blob to the shop's private
// pod-artwork Storage partition (draft stage; the slice-4/5 publish step copies
// finals into the public product-image flow).
//
// DETERMINISTIC path per (template, slot, colourway) — regenerating REPLACES the
// previous draft instead of accumulating orphans, so a shop holds at most one
// draft mockup set per garment template. Covered by the existing storage.rules
// block `pod-artwork/{shopId}/** → isAdminOfShop`, no rules change.
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase/config';

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
