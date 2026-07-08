// collectionResolver — turn a collection doc + the shop's loaded product set into
// the ordered list of products that belong to it.
//
//  • MANUAL (type === 'manual'): the hand-picked productIds, IN PICK ORDER.
//    Missing products (deleted since) are dropped gracefully.
//  • SMART (type === 'smart'): every product whose tags[] includes rule.tag.
//    Ordered by the storefront display order (sortProductsForDisplay) — the
//    admin's drag order, then name — same as category pages.
//
// The caller passes products already filtered to active + b2c-available (the
// standard storefront query), so membership never leaks drafts/hidden products.
import { sortProductsForDisplay } from './productSorting';

/**
 * @param {object} collection  the collection doc ({ type, productIds, rule })
 * @param {Array}  allProducts the shop's active/b2c product docs
 * @param {(p:object)=>string} nameOf  product-name accessor (for smart ordering)
 * @param {string} lang        current language (for name-based sort tiebreak)
 * @returns {Array} the ordered member products
 */
export const resolveCollectionProducts = (collection, allProducts, nameOf, lang = 'sv') => {
  if (!collection || !Array.isArray(allProducts)) return [];

  if (collection.type === 'smart') {
    const tag = collection.rule?.tag;
    if (!tag) return [];
    const members = allProducts.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
    return sortProductsForDisplay(members, nameOf, lang);
  }

  // Manual: map productIds → products, preserving the admin's pick order, drop
  // any id that no longer resolves (product deleted / deactivated).
  const ids = Array.isArray(collection.productIds) ? collection.productIds : [];
  if (ids.length === 0) return [];
  const byId = new Map(allProducts.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};
