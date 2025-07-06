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

// Simple helper to safely get content from multilingual fields without using hooks
const safeGetContent = (field) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    // A simplified, non-hook version of getContentValue
    // Prioritize Swedish, then English, then take any available.
    return field['sv-SE'] || field['en-GB'] || field['en-US'] || Object.values(field)[0] || '';
  }
  return '';
};

// Generate clean product URL from product data
export const getProductSlug = (product) => {
  const productName = safeGetContent(product.name);
  // For multipacks, use 3pack slug
  if (productName.includes('3-pack') || productName.includes('multipack')) {
    return '3pack';
  }
  
  // For individual products, use color-based slug
  if (product.color && productSlugMap[product.color]) {
    return productSlugMap[product.color];
  }
  
  // Fallback: extract color from name
  const name = safeGetContent(product.name) || '';
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

/**
 * Generates an affiliate link with the correct language parameter based on affiliate's preferred language
 * @param {string} affiliateCode - The affiliate's unique code
 * @param {string} preferredLang - The affiliate's preferred language from DB (e.g., 'en-GB', 'en-US')
 * @param {string} [productPath] - Optional product path to append
 * @returns {string} The complete affiliate link
 */
export const generateAffiliateLink = (affiliateCode, preferredLang, productPath = '') => {
  // Convert DB language code to URL segment by taking everything after - and converting to lowercase
  // Default to 'se' if no valid language code is found
  const urlLang = preferredLang?.split('-')[1]?.toLowerCase() || 'se';
  
  const baseUrl = 'https://shop.b8shield.com';
  const langPath = `/${urlLang}`;
  const path = productPath ? `/${productPath}` : '';
  
  return `${baseUrl}${langPath}${path}?ref=${affiliateCode}`;
}; 