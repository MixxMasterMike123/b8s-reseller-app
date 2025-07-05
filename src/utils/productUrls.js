// Product URL utilities for clean, SEO-friendly URLs

// Map product colors/groups to clean URL slugs
export const productSlugMap = {
  'Transparent': 'transparent',
  'Röd': 'rod', 
  'Fluorescerande': 'fluorescerande',
  'Glitter': 'glitter',
  '3-pack': '3pack',
  'multipack': '3pack'
};

// Reverse map for resolving slugs back to product names
export const slugToProductMap = {
  'transparent': 'Transparent',
  'rod': 'Röd',
  'fluorescerande': 'Fluorescerande', 
  'glitter': 'Glitter',
  '3pack': '3-pack'
};

// Generate clean product URL from product data
export const getProductSlug = (product) => {
  // For multipacks, use 3pack slug
  if (product.name?.includes('3-pack') || product.name?.includes('multipack')) {
    return '3pack';
  }
  
  // For individual products, use color-based slug
  if (product.color && productSlugMap[product.color]) {
    return productSlugMap[product.color];
  }
  
  // Fallback: extract color from name
  const name = product.name || '';
  for (const [color, slug] of Object.entries(productSlugMap)) {
    if (name.includes(color)) {
      return slug;
    }
  }
  
  // Ultimate fallback: use product ID (should not happen with proper data)
  return product.id;
};

// Generate full product URL
export const getProductUrl = (product) => {
  const slug = getProductSlug(product);
  
  // Get current country from URL path
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const countryCode = segments[0] || 'se'; // Default to 'se' if no country in path
  
  return `/${countryCode}/product/${slug}`;
};

// Get product description for SEO
export const getProductSeoDescription = (slug) => {
  const descriptions = {
    'transparent': 'B8Shield Transparent - Diskret vasskydd för klart vatten. Förhindrar fastnade fiskedrag.',
    'rod': 'B8Shield Röd - Vasskydd för mörkt vatten. Perfekt för gäddfiske och djupa vatten.',
    'fluorescerande': 'B8Shield Fluorescerande - Vasskydd för djupt vatten. Extra synligt för bättre resultat.',
    'glitter': 'B8Shield Glitter - Vasskydd för extra synlighet. Attraktiv glitterfinish.',
    '3pack': 'B8Shield 3-pack - Komplett startpaket med alla storlekar (2mm, 4mm, 6mm).'
  };
  
  return descriptions[slug] || 'B8Shield - Professionellt vasskydd för fiske';
};

// Get product title for SEO
export const getProductSeoTitle = (slug) => {
  const titles = {
    'transparent': 'B8Shield Transparent - Diskret Vasskydd',
    'rod': 'B8Shield Röd - Vasskydd för Mörkt Vatten',
    'fluorescerande': 'B8Shield Fluorescerande - Vasskydd för Djupt Vatten',
    'glitter': 'B8Shield Glitter - Vasskydd med Extra Synlighet',
    '3pack': 'B8Shield 3-pack - Komplett Startpaket'
  };
  
  return titles[slug] || 'B8Shield - Professionellt Vasskydd';
};

// Generate country-aware URL for B2C shop links
export const getCountryAwareUrl = (path) => {
  // Get current country from URL path
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const countryCode = segments[0] || 'se'; // Default to 'se' if no country in path
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Return URL with country code
  return `/${countryCode}${cleanPath ? `/${cleanPath}` : ''}`;
}; 