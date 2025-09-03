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
  if (!product) return 'B8Shield Webshop - Professionellt Vasskydd';
  const name = safeGetContent(product.name);
  const size = product.size ? ` - ${product.size}` : '';
  return `${name}${size} | B8Shield Webshop`;
};

/**
 * DYNAMIC SEO DESCRIPTION GENERATOR
 * Generates a descriptive meta description from the product object.
 */
export const getProductSeoDescription = (product) => {
  if (!product) return 'B8Shield är det ultimata vasskyddet för sportfiskare. Skydda dina fiskedrag och fånga mer fisk. Finns i flera färger och storlekar.';
  
  const name = safeGetContent(product.name);
  // Prioritize B2B description (more detailed), then B2C, then legacy description
  const b2bDesc = safeGetContent(product.descriptions?.b2b);
  const b2cDesc = safeGetContent(product.descriptions?.b2c);
  const fallbackDesc = safeGetContent(product.description);
  const defaultDesc = `Köp ${name}. Skyddar dina fiskedrag från att fastna i vass och annan undervattensvegetation. Perfekt för svenska förhållanden.`;
  
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
  
  const baseUrl = 'https://shop.b8shield.com';
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
  const titles = {
    'sv-SE': 'B8Shield Webshop - Vasskydd för Sportfiskare | Köp Online',
    'en-GB': 'B8Shield Webshop - Weed Guard for Anglers | Buy Online',  
    'en-US': 'B8Shield Webshop - Weed Guard for Anglers | Buy Online'
  };
  return titles[language] || titles['sv-SE'];
};

/**
 * Generate SEO description for shop homepage/storefront
 */
export const getShopSeoDescription = (language = 'sv-SE') => {
  const descriptions = {
    'sv-SE': 'B8Shield™ förhindrar att dina fiskedrag fastnar i vass och undervattensvegetation. Perfekt för svenska förhållanden. Gratis frakt över 299 kr. Köp online nu!',
    'en-GB': 'B8Shield™ prevents your fishing lures from getting caught in weeds and underwater vegetation. Perfect for Nordic conditions. Free shipping over £25. Buy online now!',
    'en-US': 'B8Shield™ prevents your fishing lures from getting caught in weeds and underwater vegetation. Perfect for fishing conditions. Free shipping over $30. Buy online now!'
  };
  return descriptions[language] || descriptions['sv-SE'];
};

/**
 * Generate SEO title for shopping cart page
 */
export const getCartSeoTitle = (language = 'sv-SE') => {
  const titles = {
    'sv-SE': 'Din Varukorg | B8Shield Webshop',
    'en-GB': 'Your Shopping Cart | B8Shield Webshop',
    'en-US': 'Your Shopping Cart | B8Shield Webshop'
  };
  return titles[language] || titles['sv-SE'];
};

/**
 * Generate SEO description for shopping cart page
 */
export const getCartSeoDescription = (language = 'sv-SE') => {
  const descriptions = {
    'sv-SE': 'Granska dina valda B8Shield produkter. Säker kassa och snabb leverans. Fortsätt handla eller gå till kassan.',
    'en-GB': 'Review your selected B8Shield products. Secure checkout and fast delivery. Continue shopping or proceed to checkout.',
    'en-US': 'Review your selected B8Shield products. Secure checkout and fast delivery. Continue shopping or proceed to checkout.'
  };
  return descriptions[language] || descriptions['sv-SE'];
};

/**
 * Generate SEO title for checkout page
 */
export const getCheckoutSeoTitle = (language = 'sv-SE') => {
  const titles = {
    'sv-SE': 'Kassa | Säker Betalning | B8Shield™',
    'en-GB': 'Checkout | Secure Payment | B8Shield™',
    'en-US': 'Checkout | Secure Payment | B8Shield™'
  };
  return titles[language] || titles['sv-SE'];
};

/**
 * Generate SEO description for checkout page
 */
export const getCheckoutSeoDescription = (language = 'sv-SE') => {
  const descriptions = {
    'sv-SE': 'Säker kassa för dina B8Shield produkter. Snabb leverans och 14 dagars ångerrätt. Betala säkert online.',
    'en-GB': 'Secure checkout for your B8Shield products. Fast delivery and 14-day return policy. Pay securely online.',
    'en-US': 'Secure checkout for your B8Shield products. Fast delivery and 14-day return policy. Pay securely online.'
  };
  return descriptions[language] || descriptions['sv-SE'];
};

/**
 * Generate SEO title for affiliate pages
 */
export const getAffiliateSeoTitle = (pageType = 'login', language = 'sv-SE') => {
  const titles = {
    login: {
      'sv-SE': 'Affiliate-inloggning | B8Shield™ Partner Portal',
      'en-GB': 'Affiliate Login | B8Shield™ Partner Portal',
      'en-US': 'Affiliate Login | B8Shield™ Partner Portal'
    },
    registration: {
      'sv-SE': 'Affiliate-registrering | Bli Partner | B8Shield™',
      'en-GB': 'Affiliate Registration | Become a Partner | B8Shield™',
      'en-US': 'Affiliate Registration | Become a Partner | B8Shield™'
    },
    portal: {
      'sv-SE': 'Affiliate Portal | Partner Dashboard | B8Shield™',
      'en-GB': 'Affiliate Portal | Partner Dashboard | B8Shield™',
      'en-US': 'Affiliate Portal | Partner Dashboard | B8Shield™'
    }
  };
  return titles[pageType]?.[language] || titles[pageType]?.['sv-SE'] || titles.login['sv-SE'];
};

/**
 * Generate SEO description for affiliate pages
 */
export const getAffiliateSeoDescription = (pageType = 'login', language = 'sv-SE') => {
  const descriptions = {
    login: {
      'sv-SE': 'Logga in på ditt B8Shield affiliate-konto. Hantera dina länkar, statistik och utbetalningar.',
      'en-GB': 'Login to your B8Shield affiliate account. Manage your links, statistics and payouts.',
      'en-US': 'Login to your B8Shield affiliate account. Manage your links, statistics and payouts.'
    },
    registration: {
      'sv-SE': 'Bli B8Shield affiliate-partner. Tjäna pengar genom att marknadsföra våra produkter. Ansök nu!',
      'en-GB': 'Become a B8Shield affiliate partner. Earn money by promoting our products. Apply now!',
      'en-US': 'Become a B8Shield affiliate partner. Earn money by promoting our products. Apply now!'
    },
    portal: {
      'sv-SE': 'Hantera ditt B8Shield affiliate-konto. Se statistik, generera länkar och hantera utbetalningar.',
      'en-GB': 'Manage your B8Shield affiliate account. View statistics, generate links and manage payouts.',
      'en-US': 'Manage your B8Shield affiliate account. View statistics, generate links and manage payouts.'
    }
  };
  return descriptions[pageType]?.[language] || descriptions[pageType]?.['sv-SE'] || descriptions.login['sv-SE'];
};

/**
 * Generate SEO title for legal pages
 */
export const getLegalSeoTitle = (pageType = 'privacy', language = 'sv-SE') => {
  const titles = {
    privacy: {
      'sv-SE': 'Integritetspolicy | B8Shield™',
      'en-GB': 'Privacy Policy | B8Shield™',
      'en-US': 'Privacy Policy | B8Shield™'
    },
    terms: {
      'sv-SE': 'Köpvillkor | B8Shield™',
      'en-GB': 'Terms of Service | B8Shield™',
      'en-US': 'Terms of Service | B8Shield™'
    },
    returns: {
      'sv-SE': 'Returpolicy | 14 Dagars Ångerrätt | B8Shield™',
      'en-GB': 'Return Policy | 14-Day Right of Withdrawal | B8Shield™',
      'en-US': 'Return Policy | 14-Day Right of Withdrawal | B8Shield™'
    },
    cookies: {
      'sv-SE': 'Cookie-policy | B8Shield™',
      'en-GB': 'Cookie Policy | B8Shield™',
      'en-US': 'Cookie Policy | B8Shield™'
    },
    shipping: {
      'sv-SE': 'Frakt & Leverans | B8Shield™',
      'en-GB': 'Shipping & Delivery | B8Shield™',
      'en-US': 'Shipping & Delivery | B8Shield™'
    }
  };
  return titles[pageType]?.[language] || titles[pageType]?.['sv-SE'] || titles.privacy['sv-SE'];
};

/**
 * Generate SEO description for legal pages
 */
export const getLegalSeoDescription = (pageType = 'privacy', language = 'sv-SE') => {
  const descriptions = {
    privacy: {
      'sv-SE': 'Läs om hur B8Shield hanterar dina personuppgifter. GDPR-kompatibel integritetspolicy.',
      'en-GB': 'Read about how B8Shield handles your personal data. GDPR-compliant privacy policy.',
      'en-US': 'Read about how B8Shield handles your personal data. GDPR-compliant privacy policy.'
    },
    terms: {
      'sv-SE': 'B8Shield köpvillkor och användarvillkor. Läs våra villkor innan du handlar.',
      'en-GB': 'B8Shield terms of service and conditions of purchase. Read our terms before shopping.',
      'en-US': 'B8Shield terms of service and conditions of purchase. Read our terms before shopping.'
    },
    returns: {
      'sv-SE': 'B8Shield returpolicy. 14 dagars ångerrätt enligt EU-lag. Enkel returprocess.',
      'en-GB': 'B8Shield return policy. 14-day right of withdrawal under EU law. Simple return process.',
      'en-US': 'B8Shield return policy. 14-day right of withdrawal under EU law. Simple return process.'
    },
    cookies: {
      'sv-SE': 'B8Shield cookie-policy. Läs om hur vi använder cookies på vår webbplats.',
      'en-GB': 'B8Shield cookie policy. Read about how we use cookies on our website.',
      'en-US': 'B8Shield cookie policy. Read about how we use cookies on our website.'
    },
    shipping: {
      'sv-SE': 'B8Shield frakt & leverans. Snabb leverans i Sverige och Norden. Gratis frakt över 299 kr.',
      'en-GB': 'B8Shield shipping & delivery. Fast delivery in Sweden and Nordic countries. Free shipping over £25.',
      'en-US': 'B8Shield shipping & delivery. Fast delivery in Sweden and Nordic countries. Free shipping over $30.'
    }
  };
  return descriptions[pageType]?.[language] || descriptions[pageType]?.['sv-SE'] || descriptions.privacy['sv-SE'];
};

/**
 * Generate structured data for shop homepage
 */
export const generateShopStructuredData = (language = 'sv-SE') => {
  const baseUrl = 'https://shop.b8shield.com';
  const langCode = (language?.split('-')[1] || 'se').toLowerCase();
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "B8Shield",
    "url": `${baseUrl}/${langCode}`,
    "logo": `${baseUrl}/images/B8S_full_logo.svg`,
    "description": getShopSeoDescription(language),
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Östergatan 30 C",
      "addressLocality": "Södertälje",
      "postalCode": "152 43",
      "addressCountry": "SE"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+46-8-123-4567",
      "contactType": "customer service",
      "email": "info@jphinnovation.se"
    },
    "sameAs": [
      "https://www.facebook.com/b8shield",
      "https://www.instagram.com/b8shield"
    ]
  };
}; 