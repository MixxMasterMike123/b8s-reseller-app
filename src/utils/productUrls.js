// Product URL utilities for clean, SEO-friendly URLs
import { APP_URLS } from '../config/urls';
import { STORE } from '../config/store';

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
  const segments = pathname?.split('/')?.filter(Boolean) || [];
  const countryCode = segments[0] || 'se';
  
  return `/${countryCode}/product/${slug}`;
};

// Generate country-aware URL for B2C shop links
export const getCountryAwareUrl = (path) => {
  // Get current country from URL path
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/se';
  const segments = pathname?.split('/')?.filter(Boolean) || [];
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
  if (!product) return STORE.shopName;
  const name = safeGetContent(product.name);
  const size = product.size ? ` - ${product.size}` : '';
  return `${name}${size} | ${STORE.shopName}`;
};

/**
 * DYNAMIC SEO DESCRIPTION GENERATOR
 * Generates a descriptive meta description from the product object.
 */
export const getProductSeoDescription = (product) => {
  if (!product) return STORE.tagline || STORE.shopName;
  
  const name = safeGetContent(product.name);
  // Prioritize B2B description (more detailed), then B2C, then legacy description
  const b2bDesc = safeGetContent(product.descriptions?.b2b);
  const b2cDesc = safeGetContent(product.descriptions?.b2c);
  const fallbackDesc = safeGetContent(product.description);
  const defaultDesc = `${name} – ${STORE.shopName}`;
  
  const description = b2bDesc || b2cDesc || fallbackDesc || defaultDesc;
  
  // Truncate to a reasonable length for meta descriptions (160 chars is optimal)
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
  const urlLang = (preferredLang?.split('-')[1] || 'se').toLowerCase();

  const baseUrl = APP_URLS.B2C_SHOP;
  const langPath = `/${urlLang}`;
  const path = productPath ? `/${productPath}` : '';
  
  return `${baseUrl}${langPath}${path}?ref=${affiliateCode}`;
};

/**
 * SHOP SEO UTILITIES
 * Comprehensive SEO functions for B2C shop pages
 */

/**
 * Generate SEO title for shop homepage/storefront
 */
export const getShopSeoTitle = (language = 'sv-SE') => {
  // Generic, brand-driven title. Per-shop SEO override is a later slice.
  const tagline = STORE.tagline ? ` - ${STORE.tagline}` : '';
  return `${STORE.shopName}${tagline}`;
};

/**
 * Generate SEO description for shop homepage/storefront
 */
export const getShopSeoDescription = (language = 'sv-SE') => {
  return STORE.companyDescription || STORE.tagline || STORE.shopName;
};

/**
 * SEO title/description helpers for cart/checkout/affiliate/legal pages.
 * Generic + brand-driven (STORE.shopName) so the template carries no
 * hardcoded brand. Per-shop SEO override is a later slice.
 */
const seoSuffix = () => ` | ${STORE.shopName}`;

export const getCartSeoTitle = () => `Varukorg${seoSuffix()}`;
export const getCartSeoDescription = () =>
  'Granska dina valda produkter. Säker kassa och snabb leverans.';

export const getCheckoutSeoTitle = () => `Kassa${seoSuffix()}`;
export const getCheckoutSeoDescription = () =>
  'Säker kassa. Snabb leverans och 14 dagars ångerrätt. Betala säkert online.';

const AFFILIATE_LABELS = {
  login: 'Affiliate-inloggning',
  registration: 'Affiliate-registrering',
  portal: 'Affiliate Portal',
};
export const getAffiliateSeoTitle = (pageType = 'login') =>
  `${AFFILIATE_LABELS[pageType] || AFFILIATE_LABELS.login}${seoSuffix()}`;
export const getAffiliateSeoDescription = () =>
  'Hantera ditt affiliate-konto: länkar, statistik och utbetalningar.';

const LEGAL_LABELS = {
  privacy: 'Integritetspolicy',
  terms: 'Köpvillkor',
  returns: 'Returpolicy',
  cookies: 'Cookie-policy',
  shipping: 'Frakt & Leverans',
};
export const getLegalSeoTitle = (pageType = 'privacy') =>
  `${LEGAL_LABELS[pageType] || LEGAL_LABELS.privacy}${seoSuffix()}`;
export const getLegalSeoDescription = (pageType = 'privacy') => {
  const label = LEGAL_LABELS[pageType] || LEGAL_LABELS.privacy;
  return `${label} – ${STORE.shopName}.`;
};

/**
 * Generate structured data for shop homepage
 */
export const generateShopStructuredData = (language = 'sv-SE') => {
  // Structured data must reflect the actual serving domain.
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : APP_URLS.B2C_SHOP;
  const langCode = (language?.split('-')[1] || 'se').toLowerCase();

  // Social profiles from store config (empty values are hidden).
  const sameAs = Object.values(STORE.social || {}).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": STORE.shopName,
    "url": `${baseUrl}/${langCode}`,
    "logo": STORE.logoUrl?.startsWith('http') ? STORE.logoUrl : `${baseUrl}${STORE.logoUrl}`,
    "description": getShopSeoDescription(language),
    // NOTE: STORE has no structured postal-address or phone fields, so the
    // PostalAddress block and telephone are intentionally omitted rather
    // than inventing data.
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": STORE.supportEmail
    },
    ...(sameAs.length > 0 && { "sameAs": sameAs })
  };
};