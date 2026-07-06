// podMappings.js — the SKU → artwork mapping (the order↔artwork bridge).
//
// Collection: podMappings/{id}, keyed logically by (shopId, sku). Products are a
// SEPARATE entity — this never reads/writes products/{id}. The print-shop callable
// joins order.items[].sku → this mapping (scoped to the order's shop) → podArtwork
// to find the right original. firestore.rules podMappings block (Slice 3) enforces
// shop isolation at the rules layer.
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { withShopId } from '../config/withShopId';
import { DEFAULT_SHOP_ID } from '../config/tenancy';

const COL = 'podMappings';

/** List a shop's mappings. */
export const listMappings = async (shopId) => {
  const q = query(collection(db, COL), where('shopId', '==', shopId || DEFAULT_SHOP_ID));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Get the mapping for a (shopId, sku), or null. */
export const getMappingBySku = async (shopId, sku) => {
  const q = query(
    collection(db, COL),
    where('shopId', '==', shopId || DEFAULT_SHOP_ID),
    where('sku', '==', sku)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

/**
 * Upsert a mapping for (shopId, sku). One mapping per SKU per shop: if one exists we
 * update it, else create. Returns the doc id.
 */
export const setMapping = async ({ shopId, sku, artworkId, profileId, placement }) => {
  const cleanSku = String(sku || '').trim();
  if (!cleanSku) throw new Error('SKU krävs.');
  const existing = await getMappingBySku(shopId, cleanSku);
  const payload = {
    sku: cleanSku,
    artworkId: artworkId || null,
    profileId: profileId || null,
    placement: String(placement || '').trim(),
    updatedAt: serverTimestamp(),
  };
  if (existing) {
    await updateDoc(doc(db, COL, existing.id), payload);
    return existing.id;
  }
  const ref = await addDoc(collection(db, COL), withShopId({ ...payload, createdAt: serverTimestamp() }, shopId));
  return ref.id;
};

/** Delete a mapping by id. */
export const deleteMapping = async (id) => {
  await deleteDoc(doc(db, COL, id));
};

/**
 * Read-only product lookup (by shop) for the mapping UI's SKU picker + orphan check.
 * NEVER writes products — POD owns mappings, products stay untouched (locked arch).
 *
 * Returns:
 *   • skus     — Set of every mappable SKU (parent + variant), for orphan-flagging.
 *   • rows     — flat [{ sku, name, label }] (kept for existing callers).
 *   • products — [{ sku, name, image, hasSku }] one row per PRODUCT (parent SKU),
 *                for the picker. A parent mapping covers all variants (print
 *                projection resolves variant lines to the parent SKU), so the
 *                picker lists products by their huvud-SKU; variant-specific SKUs
 *                are the manual-entry escape hatch. Products lacking a SKU are
 *                still listed (hasSku:false) so the seller sees them, disabled.
 */
export const listShopProductSkus = async (shopId) => {
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId || DEFAULT_SHOP_ID)));
  const skus = new Set();
  const rows = [];
  const products = [];
  snap.docs.forEach((d) => {
    const p = d.data();
    const image = p.imageUrl || p.b2cImageUrl || null;
    products.push({ id: d.id, sku: p.sku || '', name: p.name || '', image, hasSku: !!p.sku });
    if (p.sku) { skus.add(p.sku); rows.push({ sku: p.sku, name: p.name, label: null }); }
    // include variant SKUs too (a mapping can target a variant)
    if (Array.isArray(p.variants)) {
      p.variants.forEach((v) => {
        if (v.sku) { skus.add(v.sku); rows.push({ sku: v.sku, name: p.name, label: v.label || '' }); }
      });
    }
  });
  // Stable, human-friendly order: named products first, alphabetical.
  products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sv'));
  return { skus, rows, products };
};
