/**
 * Price Conversion Utility for B8Shield International E-commerce
 * Handles currency conversion using ExchangeRate-API.com
 */

import { getCurrencySymbol } from './currencyDetection';

// PERFORMANCE OPTIMIZATION: Cache conversion results to prevent duplicate API calls
const conversionCache = new Map();
const pendingRequests = new Map(); // FIX: Prevent race conditions
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate cache key for conversion
const getCacheKey = (amount, fromCurrency, toCurrency) => {
  return `${amount}_${fromCurrency}_${toCurrency}`;
};

// Check if cached result is still valid
const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

/**
 * Convert SEK price to target currency
 * @param {number} sekAmount - Amount in SEK
 * @param {string} targetCurrency - Target currency code (EUR, USD, GBP, etc.)
 * @returns {Promise<Object>} Conversion result with formatted price
 */
export const convertPrice = async (sekAmount, targetCurrency = 'SEK') => {
  // If target currency is SEK, return as-is
  if (targetCurrency === 'SEK') {
    console.log(`💰 No conversion needed: ${sekAmount} SEK`);
    return {
      originalPrice: sekAmount,
      originalCurrency: 'SEK',
      convertedPrice: sekAmount,
      targetCurrency: 'SEK',
      exchangeRate: 1.0,
      formatted: formatCurrency(sekAmount, 'SEK'),
      symbol: getCurrencySymbol('se')
    };
  }

  // Check cache first
  const cacheKey = getCacheKey(sekAmount, 'SEK', targetCurrency);
  const cached = conversionCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    console.log(`💰 Using cached conversion: ${sekAmount} SEK → ${targetCurrency} (${cached.result.convertedPrice})`);
    return cached.result;
  }

  // FIX: Check if request is already pending to prevent race conditions
  const pendingKey = `SEK_${targetCurrency}`; // Same exchange rate for all amounts
  if (pendingRequests.has(pendingKey)) {
    console.log(`💰 Waiting for pending exchange rate: SEK → ${targetCurrency}`);
    const exchangeRate = await pendingRequests.get(pendingKey);
    return calculateConversion(sekAmount, exchangeRate, targetCurrency);
  }

  console.log(`💰 Converting ${sekAmount} SEK to ${targetCurrency}`);

  // Create pending request promise
  const exchangeRatePromise = fetchExchangeRate(targetCurrency);
  pendingRequests.set(pendingKey, exchangeRatePromise);

  try {
    const exchangeRate = await exchangeRatePromise;
    const result = calculateConversion(sekAmount, exchangeRate, targetCurrency);
    
    // Cache the result
    conversionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    console.log(`💰 Conversion result:`, result);
    return result;

  } catch (error) {
    console.error('Error converting currency:', error);
    return getFallbackResult(sekAmount, targetCurrency, error);
  } finally {
    // Remove pending request
    pendingRequests.delete(pendingKey);
  }
};

/**
 * SMART PRICE CONVERSION for products - rounds UP to psychological .99 pricing
 * @param {number} sekAmount - Amount in SEK
 * @param {string} targetCurrency - Target currency code (EUR, USD, GBP, etc.)
 * @returns {Promise<Object>} Conversion result with .99 psychological pricing
 */
export const convertPriceSmart = async (sekAmount, targetCurrency = 'SEK') => {
  // Get exact conversion first
  const exactResult = await convertPrice(sekAmount, targetCurrency);
  
  // If SEK, no smart rounding needed
  if (targetCurrency === 'SEK') {
    return exactResult;
  }
  
  // Apply psychological pricing (.99 rounding)
  const smartPrice = applyPsychologicalPricing(exactResult.convertedPrice, targetCurrency);
  
  // Calculate the markup percentage
  const markupPercent = ((smartPrice - exactResult.convertedPrice) / exactResult.convertedPrice * 100).toFixed(1);
  
  return {
    ...exactResult,
    convertedPrice: smartPrice,
    formatted: formatCurrency(smartPrice, targetCurrency),
    exactPrice: exactResult.convertedPrice, // Keep original for reference
    markup: markupPercent > 0 ? markupPercent : null,
    isPsychological: true
  };
};

/**
 * Apply psychological pricing (.99 rounding)
 * @param {number} price - Original price
 * @param {string} currency - Currency code
 * @returns {number} Price rounded to .99
 */
const applyPsychologicalPricing = (price, currency) => {
  // Different strategies for different currencies
  switch (currency) {
    case 'EUR':
      // For EUR: Round up to nearest .99
      // Examples: 7.84 → 7.99, 12.45 → 12.99, 8.03 → 8.99
      return Math.floor(price) + 0.99;
      
    case 'USD':
      // For USD: Round up to nearest .99
      // Examples: 8.43 → 8.99, 15.23 → 15.99
      return Math.floor(price) + 0.99;
      
    case 'GBP':
      // For GBP: Round up to nearest .99
      // Examples: 6.78 → 6.99, 11.45 → 11.99
      return Math.floor(price) + 0.99;
      
    case 'NOK':
    case 'DKK':
      // For Nordic currencies: Round up to nearest .00 (whole numbers)
      // Examples: 87.34 → 88.00, 143.67 → 144.00
      return Math.ceil(price);
      
    case 'JPY':
      // For JPY: Round up to nearest 0 (no decimals)
      // Examples: 1234.56 → 1235
      return Math.ceil(price);
      
    default:
      // Default: Round up to nearest .99
      return Math.floor(price) + 0.99;
  }
};

/**
 * Format currency amount with proper localization
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency) => {
  try {
    // Special handling for common currencies
    const formatters = {
      'SEK': (amt) => `${amt.toFixed(2)} kr`,
      'EUR': (amt) => `€${amt.toFixed(2)}`,
      'USD': (amt) => `$${amt.toFixed(2)}`,
      'GBP': (amt) => `£${amt.toFixed(2)}`,
      'NOK': (amt) => `${amt.toFixed(2)} kr`,
      'DKK': (amt) => `${amt.toFixed(2)} kr`,
      'CHF': (amt) => `CHF ${amt.toFixed(2)}`,
      'JPY': (amt) => `¥${Math.round(amt)}`, // JPY doesn't use decimals
      'BRL': (amt) => `R$ ${amt.toFixed(2)}`
    };

    const formatter = formatters[currency];
    if (formatter) {
      return formatter(amount);
    }

    // Fallback to generic formatting
    return `${amount.toFixed(2)} ${currency}`;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount.toFixed(2)} ${currency}`;
  }
};

/**
 * Get country code for currency (for symbol lookup)
 * @param {string} currency - Currency code
 * @returns {string} Country code
 */
const getCountryForCurrency = (currency) => {
  const currencyCountryMap = {
    'SEK': 'se',
    'EUR': 'de', // Use Germany as default for EUR
    'USD': 'us',
    'GBP': 'gb',
    'NOK': 'no',
    'DKK': 'dk',
    'CHF': 'ch',
    'JPY': 'jp',
    'BRL': 'br'
  };

  return currencyCountryMap[currency] || 'se';
};

/**
 * Fetch exchange rate from API
 * @param {string} targetCurrency - Target currency code
 * @returns {Promise<number>} Exchange rate
 */
const fetchExchangeRate = async (targetCurrency) => {
  // Make API call to ExchangeRate-API.com
  const response = await fetch(`https://api.exchangerate-api.com/v4/latest/SEK`);
  
  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('💱 Exchange rates fetched from ExchangeRate-API.com');

  const exchangeRate = data.rates[targetCurrency];
  
  if (!exchangeRate) {
    throw new Error(`Exchange rate not found for ${targetCurrency}`);
  }

  return exchangeRate;
};

/**
 * Calculate conversion result
 * @param {number} sekAmount - Amount in SEK
 * @param {number} exchangeRate - Exchange rate
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Conversion result
 */
const calculateConversion = (sekAmount, exchangeRate, targetCurrency) => {
  const convertedAmount = sekAmount * exchangeRate;
  const formatted = formatCurrency(convertedAmount, targetCurrency);
  const symbol = getCurrencySymbol(getCountryForCurrency(targetCurrency));

  return {
    originalPrice: sekAmount,
    originalCurrency: 'SEK',
    convertedPrice: parseFloat(convertedAmount.toFixed(2)),
    targetCurrency,
    exchangeRate: parseFloat(exchangeRate.toFixed(4)),
    formatted,
    symbol,
    timestamp: Date.now()
  };
};

/**
 * Get fallback result on error
 * @param {number} sekAmount - Amount in SEK
 * @param {string} targetCurrency - Target currency code
 * @param {Error} error - Error object
 * @returns {Object} Fallback result
 */
const getFallbackResult = (sekAmount, targetCurrency, error) => {
  return {
    originalPrice: sekAmount,
    originalCurrency: 'SEK',
    convertedPrice: sekAmount,
    targetCurrency,
    exchangeRate: 1.0,
    formatted: formatCurrency(sekAmount, 'SEK'),
    symbol: getCurrencySymbol('se'),
    error: error.message,
    timestamp: Date.now()
  };
};

/**
 * Clear conversion cache (useful for testing or manual refresh)
 */
export const clearConversionCache = () => {
  conversionCache.clear();
  pendingRequests.clear();
  console.log('💰 Conversion cache cleared');
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(conversionCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([_, value]) => isCacheValid(value)).length,
    expiredEntries: entries.filter(([_, value]) => !isCacheValid(value)).length,
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(([_, value]) => value.timestamp)) : null,
    cacheAge: entries.length > 0 ? now - Math.min(...entries.map(([_, value]) => value.timestamp)) : 0,
    pendingRequests: pendingRequests.size
  };
}; 