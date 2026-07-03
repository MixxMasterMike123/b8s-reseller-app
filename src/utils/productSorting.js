// Product display order + featured derivation — the SINGLE definition shared by
// the storefront (frontpage grid, featured grid, category pages) and the admin
// (product list star column, drag-sort mode). Keep these together so every
// surface agrees on what "featured" and "storefront order" mean.

// A product is featured when its `featured` boolean says so. Legacy fallback:
// products saved before the boolean existed used the reserved tag `featured`;
// that tag only counts while the boolean is still UNSET — an explicit
// featured:false always wins (so un-starring works even if the old tag remains).
export const isProductFeatured = (p) => {
  if (p.featured === true) return true;
  if (p.featured === false) return false;
  return Array.isArray(p.tags) && p.tags.some((t) => String(t).toLowerCase() === 'featured');
};

const orderOf = (p) =>
  typeof p.sortOrder === 'number' && Number.isFinite(p.sortOrder) ? p.sortOrder : null;

// Storefront display order: explicit sortOrder first (ascending — the admin's
// drag order), then products without one, alphabetically by display name. Ties
// inside each half also break alphabetically, so the order is stable before a
// shop has ever used drag-sort (pure alphabetical, the previous behavior).
export const compareProductsForDisplay = (a, b, nameOf, locale) => {
  const ao = orderOf(a);
  const bo = orderOf(b);
  if (ao !== null && bo !== null && ao !== bo) return ao - bo;
  if (ao !== null && bo === null) return -1;
  if (ao === null && bo !== null) return 1;
  const nameA = nameOf(a);
  const nameB = nameOf(b);
  return String(nameA || '').localeCompare(String(nameB || ''), locale || 'sv');
};

export const sortProductsForDisplay = (products, nameOf, locale) =>
  [...products].sort((a, b) => compareProductsForDisplay(a, b, nameOf, locale));
