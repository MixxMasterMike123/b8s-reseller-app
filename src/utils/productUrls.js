// Product URL utilities for clean, SEO-friendly URLs

// Helper to safely get content from multilingual fields without using hooks
const safeGetContent = (field) => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    // A simplified, non-hook version of getContentValue
    // Prioritize Swedish, then English, then take any available.
    return field['sv-SE'] || field['en-GB'] || field['en-US'] || Object.values(field)[0] || '';
  }
  return String(field);
};

// Helper to create a URL-friendly slug from a string
const slugify = (str) => {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[åä]/g, 'a')          // Replace Swedish characters
    .replace(/ö/g, 'o')
    .replace(/&/g, '-and-')         // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

/**
 * NEW DYNAMIC SLUG GENERATOR
 * Generates a unique, SEO-friendly slug for a specific product variant.
 * Format: [name-size]_[sku]
 * Example: b8shield-vasskydd-6_B8S-6-GL
 */
export const getVariantProductSlug = (product) => {
  if (!product || !product.sku) {
    console.error("Cannot generate slug for product without SKU:", product);
    return product?.id || 'invalid-product';
  }

  const name = safeGetContent(product.name) || 'product';
  const size = product.size || '';

  // Create the human-readable part from name and size.
  const seoPart = slugify(`${name} ${size}`);
  
  // Combine with the unique SKU, which is the key for database lookups.
  return `${seoPart}_${product.sku}`;
};

/**
 * Extracts the SKU from a dynamic variant slug.
 * This is the reverse of getVariantProductSlug.
 */
export const getSkuFromSlug = (slug) => {
  if (!slug || !slug.includes('_')) return null;
  const parts = slug.split('_');
  return parts[parts.length - 1];
};


// Generate full product URL using the new dynamic slug
export const getProductUrl = (product) => {
  const slug = getVariantProductSlug(product);
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/se';
  const segments = pathname.split('/').filter(Boolean);
  const countryCode = segments[0] || 'se';
  
  return `/${countryCode}/product/${slug}`;
};

// Generate country-aware URL for B2C shop links
export const getCountryAwareUrl = (path) => {
  // Get current country from URL path
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/se';
  const segments = pathname.split('/').filter(Boolean);
  const countryCode = segments[0] || 'se';
  
  // Validate country code
  const validCountries = ['se', 'gb', 'us'];
  const currentCountry = validCountries.includes(countryCode) ? countryCode : 'se';
  
  // Clean the input path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // For empty paths, return country root
  if (!cleanPath || cleanPath === '') {
    return `/${currentCountry}`;
  }
  
  // Return country-prefixed URL
  return `/${currentCountry}/${cleanPath}`;
};


/**
 * DYNAMIC SEO TITLE GENERATOR
 * Generates a descriptive title from the product object.
 */
export const getProductSeoTitle = (product) => {
  if (!product) return 'B8Shield - Professionellt Vasskydd';
  const name = safeGetContent(product.name);
  const size = product.size ? ` - ${product.size}` : '';
  return `${name}${size} | B8Shield Vasskydd`;
};

/**
 * DYNAMIC SEO DESCRIPTION GENERATOR
 * Generates a descriptive meta description from the product object.
 */
export const getProductSeoDescription = (product) => {
  if (!product) return 'B8Shield är det ultimata vasskyddet för sportfiskare. Skydda dina fiskedrag och fånga mer fisk. Finns i flera färger och storlekar.';
  
  const name = safeGetContent(product.name);
  const primaryDesc = safeGetContent(product.descriptions?.b2c);
  const fallbackDesc = safeGetContent(product.description);
  const defaultDesc = `Köp ${name}. Skyddar dina fiskedrag från att fastna i vass och annan undervattensvegetation. Perfekt för svenska förhållanden.`;
  
  const description = primaryDesc || fallbackDesc || defaultDesc;
  
  // Truncate to a reasonable length for meta descriptions
  return description.length > 160 ? description.substring(0, 157) + '...' : description;
};


/**
 * Generates an affiliate link with the correct language parameter based on affiliate's preferred language
 * @param {string} affiliateCode - The affiliate's unique code
 * @param {string} preferredLang - The affiliate's preferred language from DB (e.g., 'en-GB', 'en-US')
 * @param {string} [productPath] - Optional product path to append
 * @returns {string} The complete affiliate link
 */
export const generateAffiliateLink = (affiliateCode, preferredLang, productPath = '') => {
  const urlLang = preferredLang?.split('-')[1]?.toLowerCase() || 'se';
  
  const baseUrl = 'https://shop.b8shield.com';
  const langPath = `/${urlLang}`;
  const path = productPath ? `/${productPath}` : '';
  
  return `${baseUrl}${langPath}${path}?ref=${affiliateCode}`;
}; 