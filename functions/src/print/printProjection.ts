// printProjection.ts — builds the FIELD-MINIMISED production view of a POD order
// for the print shop. This is the data-minimisation boundary: the printer (an
// external sub-processor) gets ship-to + production fields ONLY — never customer
// email/phone, payment refs, totals, marketing flags, or internal notes.
//
// The order↔artwork join: order.items[].sku → podMappings (scoped to the order's
// shop) → podArtwork → a short-lived SIGNED download URL for the original.
import { getStorage } from 'firebase-admin/storage';
import { db } from '../config/database';

const SIGNED_URL_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Mint a short-lived signed read URL for a Storage object. Falls back to the
// stored download URL if signing isn't available (the Functions service account
// needs roles/iam.serviceAccountTokenCreator to sign — a project-config item).
async function signedUrlFor(storagePath: string, fallbackUrl: string | null): Promise<string | null> {
  if (!storagePath) return fallbackUrl;
  try {
    const [url] = await getStorage()
      .bucket()
      .file(storagePath)
      .getSignedUrl({ action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS });
    return url;
  } catch (e: any) {
    console.warn(`print: signed URL failed for ${storagePath} (need serviceAccountTokenCreator?), falling back:`, e?.message);
    return fallbackUrl;
  }
}

// Load a shop's POD-SKU set + the mapping per SKU (one read per shop, cached by caller).
export async function loadShopMappings(shopId: string): Promise<Map<string, any>> {
  const snap = await db.collection('podMappings').where('shopId', '==', shopId).get();
  const bySku = new Map<string, any>();
  snap.docs.forEach((d) => {
    const m = d.data();
    if (m.sku) bySku.set(m.sku, { id: d.id, ...m });
  });
  return bySku;
}

// Resolve a mapping for an order-line SKU. Variant SKUs are derived from the
// parent as `${parentSku}-${color}-${size}` (variant rail), so a mapping on the
// parent covers every variant. Exact match wins; otherwise the LONGEST mapping
// key that is a '-'-boundary prefix of the line SKU wins (a per-colorway mapping
// `north-01-svart` beats the parent `north-01` for `north-01-svart-l`). The
// '-' boundary prevents `north-01` matching `north-012-...`.
export function resolveMapping(sku: string, mappingsBySku: Map<string, any>): any | null {
  if (!sku) return null;
  if (mappingsBySku.has(sku)) return mappingsBySku.get(sku);
  let best: any = null;
  let bestLen = -1;
  for (const [key, mapping] of mappingsBySku) {
    if (key.length > bestLen && sku.startsWith(key + '-')) {
      best = mapping;
      bestLen = key.length;
    }
  }
  return best;
}

// Is this order a POD order for the given shop? (any line's sku is mapped)
export function orderHasPodLine(order: any, mappingsBySku: Map<string, any>): boolean {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.some((it: any) => it && it.sku && resolveMapping(it.sku, mappingsBySku));
}

// Minimal LIST row — no address, no contact, no money.
export function toQueueRow(orderId: string, order: any, shopName: string, mappingsBySku: Map<string, any>) {
  const items = Array.isArray(order.items) ? order.items : [];
  const podLineCount = items.filter((it: any) => it && it.sku && resolveMapping(it.sku, mappingsBySku)).length;
  const ship = order.shippingInfo || {};
  const isPickup = order.deliveryMethod === 'pickup';
  return {
    orderId,
    orderNumber: order.orderNumber || orderId,
    orderDate: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : (order.createdAt || null),
    shopId: order.shopId || null,
    shopName: shopName || order.shopId || '',
    status: order.status || '',
    podLineCount,
    deliveryMethod: isPickup ? 'pickup' : 'home',
    // Pickup rows show the pickup location, not a customer city.
    shipToCity: isPickup ? (order.pickupLocation?.name || '') : (ship.city || ''),
    shipToCountry: isPickup ? '' : (ship.country || ''),
  };
}

// Full per-order PRODUCTION view: ship-to + per POD line (resolved artwork +
// signed URL). Lines whose mapping/artwork can't resolve come back with
// artwork:{unresolved:true,reason} (visible problem, never a silently-missing line).
export async function toPrintJob(orderId: string, order: any, shopName: string, mappingsBySku: Map<string, any>) {
  const items = Array.isArray(order.items) ? order.items : [];
  const ship = order.shippingInfo || {};

  const lines = [];
  for (const it of items) {
    const mapping = it && it.sku ? resolveMapping(it.sku, mappingsBySku) : null;
    if (!mapping) continue; // non-POD line — skip
    const base = {
      productName: typeof it.name === 'string' ? it.name : (it.name?.['sv-SE'] || it.sku),
      sku: it.sku,
      variantLabel: it.label || null,
      quantity: it.quantity || 0,
      placement: mapping.placement || '',
      profileId: mapping.profileId || null,
    };

    if (!mapping.artworkId) {
      lines.push({ ...base, purpose: mapping.profileId || null, artwork: { unresolved: true, reason: 'Ingen artworkId i kopplingen' } });
      continue;
    }
    const artSnap = await db.collection('podArtwork').doc(mapping.artworkId).get();
    if (!artSnap.exists) {
      lines.push({ ...base, purpose: mapping.profileId || null, artwork: { unresolved: true, reason: 'Originalet är borttaget' } });
      continue;
    }
    const art: any = artSnap.data();
    const downloadUrl = await signedUrlFor(art.originalStoragePath, art.originalUrl || null);
    lines.push({
      ...base,
      purpose: art.purpose || mapping.profileId || null,
      artwork: {
        tier: art.validation?.tier || null,
        fileName: art.fileName || '',
        ext: art.ext || '',
        downloadUrl,
        previewUrl: art.previewUrl || null,
      },
    });
  }

  const deliveryMethod = order.deliveryMethod === 'pickup' ? 'pickup' : 'home';
  return {
    order: {
      orderNumber: order.orderNumber || orderId,
      orderDate: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : (order.createdAt || null),
      status: order.status || '',
      orderRef: orderId,
    },
    shopName: shopName || order.shopId || '',
    deliveryMethod,
    // Pickup orders: the printer delivers to the SHOP's pickup location and the
    // shop hands over to the customer — so no customer ship-to at all (data
    // minimisation: the printer doesn't even need the customer's name; the order
    // number identifies the parcel).
    pickup: deliveryMethod === 'pickup'
      ? {
          name: order.pickupLocation?.name || '',
          address: order.pickupLocation?.address || '',
          date: order.pickupLocation?.date || '',
        }
      : null,
    // ship-to ONLY — name + address, needed to fulfil. NO email/phone.
    shipTo: deliveryMethod === 'pickup'
      ? null
      : {
          name: order.customerInfo?.name || '',
          line1: ship.address || '',
          line2: ship.apartment || '',
          postalCode: ship.postalCode || '',
          city: ship.city || '',
          country: ship.country || '',
        },
    lines,
  };
}
