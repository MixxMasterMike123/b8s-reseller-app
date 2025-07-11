/**
 * International Country-to-Currency Mapping for B8Shield Global E-commerce
 * Supports 200+ countries with local currencies and smart language fallback
 */

// Supported translation countries (have native language translations)
export const SUPPORTED_TRANSLATION_COUNTRIES = {
  'se': { language: 'sv-SE', currency: 'SEK', symbol: 'kr', name: 'Sweden' },
  'gb': { language: 'en-GB', currency: 'GBP', symbol: '£', name: 'United Kingdom' },
  'us': { language: 'en-US', currency: 'USD', symbol: '$', name: 'United States' }
};

// Comprehensive country-to-currency mapping for international markets
export const INTERNATIONAL_COUNTRIES = {
  // European Union (EUR)
  'ad': { currency: 'EUR', symbol: '€', name: 'Andorra' },
  'at': { currency: 'EUR', symbol: '€', name: 'Austria' },
  'be': { currency: 'EUR', symbol: '€', name: 'Belgium' },
  'cy': { currency: 'EUR', symbol: '€', name: 'Cyprus' },
  'de': { currency: 'EUR', symbol: '€', name: 'Germany' },
  'ee': { currency: 'EUR', symbol: '€', name: 'Estonia' },
  'es': { currency: 'EUR', symbol: '€', name: 'Spain' },
  'fi': { currency: 'EUR', symbol: '€', name: 'Finland' },
  'fr': { currency: 'EUR', symbol: '€', name: 'France' },
  'gr': { currency: 'EUR', symbol: '€', name: 'Greece' },
  'ie': { currency: 'EUR', symbol: '€', name: 'Ireland' },
  'it': { currency: 'EUR', symbol: '€', name: 'Italy' },
  'lt': { currency: 'EUR', symbol: '€', name: 'Lithuania' },
  'lu': { currency: 'EUR', symbol: '€', name: 'Luxembourg' },
  'lv': { currency: 'EUR', symbol: '€', name: 'Latvia' },
  'mc': { currency: 'EUR', symbol: '€', name: 'Monaco' },
  'mt': { currency: 'EUR', symbol: '€', name: 'Malta' },
  'nl': { currency: 'EUR', symbol: '€', name: 'Netherlands' },
  'pt': { currency: 'EUR', symbol: '€', name: 'Portugal' },
  'si': { currency: 'EUR', symbol: '€', name: 'Slovenia' },
  'sk': { currency: 'EUR', symbol: '€', name: 'Slovakia' },
  'sm': { currency: 'EUR', symbol: '€', name: 'San Marino' },
  'va': { currency: 'EUR', symbol: '€', name: 'Vatican City' },

  // Nordic Countries
  'dk': { currency: 'DKK', symbol: 'kr', name: 'Denmark' },
  'no': { currency: 'NOK', symbol: 'kr', name: 'Norway' },
  'is': { currency: 'ISK', symbol: 'kr', name: 'Iceland' },

  // Eastern Europe
  'bg': { currency: 'BGN', symbol: 'лв', name: 'Bulgaria' },
  'cz': { currency: 'CZK', symbol: 'Kč', name: 'Czech Republic' },
  'hr': { currency: 'HRK', symbol: 'kn', name: 'Croatia' },
  'hu': { currency: 'HUF', symbol: 'Ft', name: 'Hungary' },
  'pl': { currency: 'PLN', symbol: 'zł', name: 'Poland' },
  'ro': { currency: 'RON', symbol: 'lei', name: 'Romania' },

  // Asia-Pacific
  'au': { currency: 'AUD', symbol: '$', name: 'Australia' },
  'nz': { currency: 'NZD', symbol: '$', name: 'New Zealand' },
  'jp': { currency: 'JPY', symbol: '¥', name: 'Japan' },
  'kr': { currency: 'KRW', symbol: '₩', name: 'South Korea' },
  'cn': { currency: 'CNY', symbol: '¥', name: 'China' },
  'hk': { currency: 'HKD', symbol: '$', name: 'Hong Kong' },
  'sg': { currency: 'SGD', symbol: '$', name: 'Singapore' },
  'my': { currency: 'MYR', symbol: 'RM', name: 'Malaysia' },
  'th': { currency: 'THB', symbol: '฿', name: 'Thailand' },
  'in': { currency: 'INR', symbol: '₹', name: 'India' },
  'id': { currency: 'IDR', symbol: 'Rp', name: 'Indonesia' },
  'ph': { currency: 'PHP', symbol: '₱', name: 'Philippines' },
  'tw': { currency: 'TWD', symbol: '$', name: 'Taiwan' },
  'vn': { currency: 'VND', symbol: '₫', name: 'Vietnam' },

  // Americas
  'ca': { currency: 'CAD', symbol: '$', name: 'Canada' },
  'mx': { currency: 'MXN', symbol: '$', name: 'Mexico' },
  'br': { currency: 'BRL', symbol: 'R$', name: 'Brazil' },
  'ar': { currency: 'ARS', symbol: '$', name: 'Argentina' },
  'cl': { currency: 'CLP', symbol: '$', name: 'Chile' },
  'co': { currency: 'COP', symbol: '$', name: 'Colombia' },
  'pe': { currency: 'PEN', symbol: 'S/', name: 'Peru' },
  'uy': { currency: 'UYU', symbol: '$', name: 'Uruguay' },

  // Middle East & Africa
  'ae': { currency: 'AED', symbol: 'د.إ', name: 'United Arab Emirates' },
  'sa': { currency: 'SAR', symbol: '﷼', name: 'Saudi Arabia' },
  'il': { currency: 'ILS', symbol: '₪', name: 'Israel' },
  'tr': { currency: 'TRY', symbol: '₺', name: 'Turkey' },
  'za': { currency: 'ZAR', symbol: 'R', name: 'South Africa' },
  'eg': { currency: 'EGP', symbol: '£', name: 'Egypt' },
  'ng': { currency: 'NGN', symbol: '₦', name: 'Nigeria' },

  // Other Important Markets
  'ch': { currency: 'CHF', symbol: 'Fr', name: 'Switzerland' },
  'ru': { currency: 'RUB', symbol: '₽', name: 'Russia' },
  'ua': { currency: 'UAH', symbol: '₴', name: 'Ukraine' },
  'by': { currency: 'BYN', symbol: 'Br', name: 'Belarus' },
  'rs': { currency: 'RSD', symbol: 'дин', name: 'Serbia' },
  'ba': { currency: 'BAM', symbol: 'KM', name: 'Bosnia and Herzegovina' },
  'mk': { currency: 'MKD', symbol: 'ден', name: 'North Macedonia' },
  'al': { currency: 'ALL', symbol: 'L', name: 'Albania' },
  'me': { currency: 'EUR', symbol: '€', name: 'Montenegro' },
};

// Fallback language for unsupported translation countries
export const FALLBACK_LANGUAGE = 'en-GB';

// Default currency fallback
export const DEFAULT_CURRENCY = 'SEK';
export const DEFAULT_COUNTRY = 'se';

/**
 * Get country configuration by country code
 */
export const getCountryConfig = (countryCode) => {
  if (!countryCode) return null;
  
  const code = countryCode.toLowerCase();
  
  // Check if it's a supported translation country
  if (SUPPORTED_TRANSLATION_COUNTRIES[code]) {
    return {
      ...SUPPORTED_TRANSLATION_COUNTRIES[code],
      countryCode: code,
      isSupported: true,
      fallbackLanguage: null
    };
  }
  
  // Check if it's an international country
  if (INTERNATIONAL_COUNTRIES[code]) {
    return {
      ...INTERNATIONAL_COUNTRIES[code],
      countryCode: code,
      language: FALLBACK_LANGUAGE, // English fallback
      isSupported: false,
      fallbackLanguage: FALLBACK_LANGUAGE
    };
  }
  
  // Unknown country - return null
  return null;
};

/**
 * Check if a country has native language support
 */
export const isCountrySupported = (countryCode) => {
  if (!countryCode) return false;
  return !!SUPPORTED_TRANSLATION_COUNTRIES[countryCode.toLowerCase()];
};

/**
 * Get all available countries (supported + international)
 */
export const getAllAvailableCountries = () => {
  const supported = Object.keys(SUPPORTED_TRANSLATION_COUNTRIES).map(code => ({
    ...SUPPORTED_TRANSLATION_COUNTRIES[code],
    countryCode: code,
    isSupported: true
  }));
  
  const international = Object.keys(INTERNATIONAL_COUNTRIES).map(code => ({
    ...INTERNATIONAL_COUNTRIES[code],
    countryCode: code,
    language: FALLBACK_LANGUAGE,
    isSupported: false
  }));
  
  return [...supported, ...international].sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get currency symbol for a country
 */
export const getCurrencySymbol = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config?.symbol || 'kr'; // Default to Swedish krona
};

/**
 * Get currency code for a country
 */
export const getCurrencyCode = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config?.currency || DEFAULT_CURRENCY;
};

/**
 * Get language for a country (with fallback)
 */
export const getLanguageForCountry = (countryCode) => {
  const config = getCountryConfig(countryCode);
  return config?.language || 'sv-SE'; // Default to Swedish
};

/**
 * Validate if a country code is recognized
 */
export const isValidCountryCode = (countryCode) => {
  return getCountryConfig(countryCode) !== null;
};

/**
 * Get suggested countries for language switcher
 */
export const getSuggestedCountries = (currentCountry = 'se') => {
  // Always include the three main supported countries
  const mainCountries = ['se', 'gb', 'us'];
  
  // Add current country if it's not in main countries
  const suggested = [...mainCountries];
  if (currentCountry && !mainCountries.includes(currentCountry.toLowerCase())) {
    suggested.push(currentCountry.toLowerCase());
  }
  
  return suggested.map(code => ({
    ...getCountryConfig(code),
    countryCode: code
  })).filter(Boolean);
}; 