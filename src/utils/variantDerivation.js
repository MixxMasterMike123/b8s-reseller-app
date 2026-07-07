// Variant derivation (colorway model v2.2) — the SINGLE SOURCE OF TRUTH for
// turning the admin's `variantGroups` rail into (a) the cleaned rail persisted
// on the product and (b) the sellable `variants[]` rows.
//
// Extracted verbatim from ProductForm.jsx's save path so the Design Studio
// publish wizard derives byte-identically. This module is PURE: no React, no
// Firebase, no I/O. Image uploads (the one async step) happen in the caller,
// which passes each group's already-resolved `images` (URL strings) in here.
//
// ⚠️ MONEY-PATH INVARIANT: server repricing and the cart line key BOTH key on
// the row `sku`. The sku construction here must stay byte-identical — orders
// carry the variant sku verbatim. Do not "improve" the slug/uniquing logic.

/**
 * @typedef {Object} RawGroup   A rail entry as edited by the admin, with its
 *   images ALREADY uploaded to URL strings by the caller. `label`/`sku`/`price`
 *   are still raw (untrimmed / string) — this fn trims and coerces them exactly
 *   as the original save path did.
 * @property {string}   label   variant name (raw; trimmed here)
 * @property {string}   [sku]   explicit group sku (raw; trimmed here) — empty
 *                              auto-derives to `${productSku}-${slug(label)}`
 * @property {string|number} [price]  explicit group price (raw); empty/≤0
 *                              inherits the product price
 * @property {string[]} images  resolved image URLs (caller-uploaded), in order
 * @property {string[]} sizes   raw size labels (trimmed/upper-cased/deduped here)
 *
 * @typedef {Object} CleanGroup  The cleaned rail entry persisted on the product.
 * @property {string}   label
 * @property {string}   sku      unique group sku
 * @property {number|null} price EXPLICIT price only; null when inherited (so the
 *                              group keeps following the product price on future
 *                              saves instead of snapshotting a stale number)
 * @property {string}   image    images[0] || ''
 * @property {string[]} images
 * @property {string[]} sizes    normalized (trim → UPPER → deduped, order-kept)
 *
 * @typedef {Object} VariantRow  A sellable row. One per (group × size), or one
 *   for a sizeless group.
 * @property {string}   sku      UNIQUE within the product; money paths key on this
 * @property {string}   label    `${group}` or `${group} / ${size}`
 * @property {number}   price    concrete number (inherited price resolved here)
 * @property {string}   image
 * @property {string[]} images
 * @property {string}   group    the group label
 * @property {string|null} size  size label, or null for a sizeless group
 */

/**
 * Derive the cleaned rail + sellable rows from resolved variant groups.
 *
 * Behaviour (preserved bit-for-bit from ProductForm.jsx):
 *  • Only groups with a non-empty trimmed label are processed. Callers are
 *    expected to have already filtered nameless-with-data groups and rejected
 *    duplicate labels (those are UX errors surfaced with toasts, not this fn's
 *    job). This fn does NOT re-validate them.
 *  • Group sku: explicit (trimmed) sku, else `${productSku}-${slug(label)}`.
 *  • Every row sku is made unique within the product via a running set
 *    (case-insensitive): a collision appends `-2`, `-3`, … The sizeless base
 *    (group) sku is reserved FIRST, so per-size skus can never collide with it.
 *  • Price: an explicit price is a `parseFloat(g.price) > 0` value; otherwise
 *    the product price is inherited. The GROUP persists null when inherited;
 *    the ROWS always carry the concrete number.
 *  • Sizes: trim → toUpperCase → drop falsy → dedupe (first-seen order). No
 *    sizes → one sizeless row (size null). Sizes → one row per size.
 *
 * @param {RawGroup[]} groups   resolved, label-non-empty groups in rail order
 * @param {Object} opts
 * @param {string}   opts.productSku    resolved product sku (base for auto skus)
 * @param {number}   opts.productPrice  product price inherited by empty-price groups
 * @param {(name: string) => string} opts.skuFromName  slugifier (utils/productUrls)
 * @returns {{ cleanGroups: CleanGroup[], cleanVariants: VariantRow[] }}
 */
export function deriveVariantsFromGroups(groups, { productSku, productPrice, skuFromName }) {
  const takenRowSkus = new Set();
  const uniqueRowSku = (base) => {
    const root = base || 'variant';
    let candidate = root;
    for (let n = 2; takenRowSkus.has(candidate.toLowerCase()); n++) candidate = `${root}-${n}`;
    takenRowSkus.add(candidate.toLowerCase());
    return candidate;
  };

  const cleanGroups = [];
  const cleanVariants = [];
  for (const g of groups) {
    const label = g.label.trim();
    // `images` are the caller-resolved URLs (already uploaded), in order.
    const images = g.images;
    const image = images[0] || '';
    const groupSku = uniqueRowSku((g.sku || '').trim() || `${productSku}-${skuFromName(label)}`);
    // Inherited (empty) price persists as null on the GROUP so it keeps
    // following the product price on every future save — snapshotting it
    // made "Original" drift when the product price later changed. The
    // derived ROWS always get the concrete number (server needs it).
    const explicitPrice = parseFloat(g.price) > 0;
    const groupPrice = explicitPrice ? parseFloat(g.price) : productPrice;
    const sizes = [...new Set(g.sizes.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    cleanGroups.push({ label, sku: groupSku, price: explicitPrice ? groupPrice : null, image, images, sizes });
    if (sizes.length === 0) {
      cleanVariants.push({ sku: groupSku, label, price: groupPrice, image, images, group: label, size: null });
    } else {
      for (const size of sizes) {
        cleanVariants.push({
          // The sizeless base sku is already reserved by the group above,
          // so per-size skus can never collide with it.
          sku: uniqueRowSku(`${groupSku}-${skuFromName(size)}`),
          label: `${label} / ${size}`,
          price: groupPrice,
          image,
          images,
          group: label,
          size,
        });
      }
    }
  }
  return { cleanGroups, cleanVariants };
}
