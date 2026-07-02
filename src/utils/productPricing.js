// Card price for a product: cheapest variant when variants price differently.
// isFrom => render "från {price}".
export const getCardPrice = (product) => {
  const base = product?.b2cPrice || product?.basePrice || 0;
  const prices = (Array.isArray(product?.variants) ? product.variants : [])
    .map((v) => (typeof v?.price === 'number' ? v.price : parseFloat(v?.price)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return { price: base, isFrom: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { price: min, isFrom: max > min };
};
