// Country configuration for B8Shield B2C Shop
// Follows e-commerce standards like IKEA, H&M, Zara

export const COUNTRIES = {
  se: {
    code: 'se',
    name: 'Sweden',
    language: 'sv-SE',
    flag: '🇸🇪',
    currency: 'SEK',
    shipping: { 
      cost: 0, 
      name: 'Free shipping',
      description: 'Free shipping within Sweden'
    },
    vat: 25, // 25% VAT for Sweden
    timezone: 'Europe/Stockholm'
  },
  gb: {
    code: 'gb', 
    name: 'United Kingdom',
    language: 'en-GB',
    flag: '🇬🇧',
    currency: 'SEK',
    shipping: { 
      cost: 59, 
      name: 'UK shipping',
      description: 'Shipping to United Kingdom'
    },
    vat: 0, // No VAT for international orders
    timezone: 'Europe/London'
  },
  us: {
    code: 'us',
    name: 'United States', 
    language: 'en-US',
    flag: '🇺🇸',
    currency: 'SEK',
    shipping: { 
      cost: 99, 
      name: 'US shipping',
      description: 'Shipping to United States'
    },
    vat: 0, // No VAT for international orders
    timezone: 'America/New_York'
  }
};

// Get country by code
export const getCountry = (code) => {
  return COUNTRIES[code] || COUNTRIES.se;
};

// Get country from URL path
export const getCountryFromPath = (pathname) => {
  const segments = pathname?.split('/')?.filter(Boolean) || [];
  const countryCode = segments[0];
  return COUNTRIES[countryCode] ? countryCode : null;
};

// Get stored country preference
export const getStoredCountry = () => {
  return localStorage.getItem('b8shield-country') || 'se';
};

// Get browser language preference
export const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('sv')) return 'se';
  if (browserLang.startsWith('en')) return 'gb'; // Default to UK for English
  return 'se'; // Default to Sweden
};

// Get current country from URL or stored preference
export const getCurrentCountry = (pathname) => {
  const urlCountry = getCountryFromPath(pathname);
  if (urlCountry) return urlCountry;
  
  return getStoredCountry();
};

// Format shipping cost for display
export const formatShippingCost = (countryCode) => {
  const country = getCountry(countryCode);
  if (country.shipping.cost === 0) {
    return 'Free';
  }
  return `${country.shipping.cost} SEK`;
};

// Get available countries
export const getAvailableCountries = () => {
  return Object.values(COUNTRIES);
};

export default COUNTRIES; 