// The product-level "ordinarie pris" (was-price) for a REA/sale, or null when the
// product isn't on sale. Sale = a compareAtPrice set AND strictly higher than the
// price the shopper actually pays. ⚠️ The seller is responsible for making this a
// truthful reference price (SE/EU Omnibus: the lowest price of the last 30 days).
export const getCompareAtPrice = (product, displayPrice) => {
  const cmp = Number(product?.compareAtPrice);
  return Number.isFinite(cmp) && cmp > 0 && cmp > (displayPrice || 0) ? cmp : null;
};

// Card price for a product: cheapest variant when variants price differently.
// isFrom => render "från {price}". compareAt => the struck-through was-price (or
// null); on sale => convenience boolean.
export const getCardPrice = (product) => {
  const base = product?.b2cPrice || product?.basePrice || 0;
  const prices = (Array.isArray(product?.variants) ? product.variants : [])
    .map((v) => (typeof v?.price === 'number' ? v.price : parseFloat(v?.price)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const price = prices.length === 0 ? base : Math.min(...prices);
  const isFrom = prices.length > 0 && Math.max(...prices) > price;
  const compareAt = getCompareAtPrice(product, price);
  return { price, isFrom, compareAt, onSale: compareAt != null };
};
