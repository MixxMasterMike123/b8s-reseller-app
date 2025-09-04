/**
 * Order utility functions for B8Shield
 * Handles color/size extraction from SKUs and order item processing
 */

/**
 * Extract color and size from B8Shield SKU
 * SKU format: B8S-{size}-{colorCode}
 * Examples: B8S-6-re (size 6, red), B8S-4-tr (size 4, transparent)
 */
export const extractColorSizeFromSku = (sku) => {
  if (!sku || typeof sku !== 'string') {
    return { color: null, size: null };
  }

  // SKU pattern: B8S-{size}-{colorCode}
  const match = sku.match(/^B8S-(\d+(?:\/\d+)?)-([a-z]+)$/i);
  if (!match) {
    return { color: null, size: null };
  }

  const [, sizeStr, colorCode] = match;
  
  // Map color codes to display names
  const colorMap = {
    'tr': 'Transparent',
    're': 'Röd', 
    'fl': 'Fluorescerande',
    'gl': 'Glitter'
  };

  return {
    size: sizeStr,
    color: colorMap[colorCode.toLowerCase()] || colorCode
  };
};

/**
 * Enhanced getOrderDistribution that extracts color/size from SKU when missing
 */
export const getEnhancedOrderDistribution = (order) => {
  // If we have proper items array, use it
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map(item => ({
      ...item,
      // Ensure color and size are present, extract from SKU if missing
      color: item.color || extractColorSizeFromSku(item.sku).color || 'Okänd färg',
      size: item.size || extractColorSizeFromSku(item.sku).size || 'Okänd storlek',
      name: item.name || 'B8 Shield',
      quantity: item.quantity || 0,
      price: item.price || 0
    }));
  }

  // If fordelning is already an array of objects with color, size, quantity
  if (order.fordelning && Array.isArray(order.fordelning)) {
    return order.fordelning.map(item => ({
      ...item,
      name: item.name || 'B8 Shield',
      price: item.price || (order.prisInfo?.produktPris / (order.antalForpackningar || 1)) || 0
    }));
  }
  
  // If orderDetails.distribution exists (array of color/size/quantity objects)
  if (order.orderDetails?.distribution && order.orderDetails.distribution.length > 0) {
    return order.orderDetails.distribution.map(item => ({
      ...item,
      name: item.name || 'B8 Shield',
      price: item.price || (order.prisInfo?.produktPris / (order.antalForpackningar || 1)) || 0
    }));
  }
  
  // If fordelning is old format (object with color_size keys)
  if (order.fordelning && typeof order.fordelning === 'object' && !Array.isArray(order.fordelning)) {
    return Object.entries(order.fordelning).map(([key, antal]) => {
      const [farg, storlek] = key.split('_');
      return {
        name: 'B8 Shield',
        color: farg,
        size: storlek?.replace('storlek', '') || '',
        quantity: antal,
        price: (order.prisInfo?.produktPris / (order.antalForpackningar || 1)) || 0
      };
    });
  }
  
  // Final fallback: try to extract from SKU if available, otherwise use summary fields
  const fallbackItem = {
    name: 'B8 Shield',
    color: order.color || 'Blandade färger',
    size: order.size || 'Blandade storlekar', 
    quantity: order.antalForpackningar || 0,
    price: order.prisInfo?.produktPris || order.total || 0
  };

  // If there's a single SKU in the order, try to extract color/size from it
  if (order.sku) {
    const extracted = extractColorSizeFromSku(order.sku);
    if (extracted.color) fallbackItem.color = extracted.color;
    if (extracted.size) fallbackItem.size = extracted.size;
  }

  return [fallbackItem];
};

/**
 * Format color name for display (handle multilingual objects)
 */
export const getDisplayColor = (color) => {
  if (!color) return '-';
  if (typeof color === 'string') return color;
  if (typeof color === 'object') {
    return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
  }
  return String(color);
};

/**
 * Format size for display (handle multilingual objects)  
 */
export const getDisplaySize = (size) => {
  if (!size) return '-';
  if (typeof size === 'string') return size;
  if (typeof size === 'object') {
    return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
  }
  return String(size);
};
