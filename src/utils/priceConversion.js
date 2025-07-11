/**
 * Price Conversion Utility
 * Converts SEK prices to other currencies with "round up to .99" psychological pricing
 */

import { getExchangeRate } from './exchangeRateService.js';
import { getCurrencySymbol } from './currencyDetection.js';

/**
 * Rounds a price to the nearest .99 value (psychological pricing)
 * @param {number} price - Raw converted price
 * @param {string} currency - Target currency code
 * @returns {number} Rounded price ending in .99
 */
export const roundToNinetyNine = (price, currency) => {
  if (!price || price <= 0) return 0;
  
  // Special handling for certain currencies
  switch (currency) {
    case 'JPY':
    case 'CNY':
      // For currencies typically without decimals, round to 99 or 999
      if (price < 100) {
        return Math.ceil(price / 10) * 10 - 1; // Round to X9 (e.g., 89, 99)
      } else {
        return Math.ceil(price / 100) * 100 - 1; // Round to X99 (e.g., 199, 299)
      }
      
    case 'BRL':
      // For Brazilian Real, handle larger values differently
      if (price < 10) {
        return Math.ceil(price) - 0.01; // Round to X.99
      } else {
        return Math.ceil(price) - 0.01; // Round to XX.99
      }
      
    default:
      // Standard .99 rounding for EUR, USD, GBP, etc.
      if (price < 1) {
        return 0.99; // Minimum price
      } else {
        return Math.ceil(price) - 0.01; // Round to X.99
      }
  }
};

/**
 * Converts a SEK price to target currency with .99 rounding
 * @param {number} sekPrice - Price in SEK
 * @param {string} targetCurrency - Target currency code
 * @param {boolean} forceRefresh - Force refresh exchange rates
 * @returns {Promise<Object>} Converted price info
 */
export const convertPrice = async (sekPrice, targetCurrency, forceRefresh = false) => {
  try {
    if (!sekPrice || sekPrice <= 0) {
      return {
        originalPrice: sekPrice,
        originalCurrency: 'SEK',
        convertedPrice: 0,
        targetCurrency,
        exchangeRate: 1.0,
        symbol: getCurrencySymbol(targetCurrency),
        formatted: '0',
        roundingApplied: false
      };
    }
    
    // If target currency is SEK, no conversion needed
    if (targetCurrency === 'SEK') {
      return {
        originalPrice: sekPrice,
        originalCurrency: 'SEK',
        convertedPrice: sekPrice,
        targetCurrency: 'SEK',
        exchangeRate: 1.0,
        symbol: getCurrencySymbol('SEK'),
        formatted: formatPrice(sekPrice, 'SEK'),
        roundingApplied: false
      };
    }
    
    // Get exchange rate
    const exchangeRate = await getExchangeRate('SEK', targetCurrency, forceRefresh);
    
    // Calculate raw converted price
    const rawPrice = sekPrice * exchangeRate;
    
    // Apply .99 rounding
    const roundedPrice = roundToNinetyNine(rawPrice, targetCurrency);
    
    // Calculate markup percentage
    const markup = ((roundedPrice - rawPrice) / rawPrice) * 100;
    
    return {
      originalPrice: sekPrice,
      originalCurrency: 'SEK',
      convertedPrice: roundedPrice,
      targetCurrency,
      exchangeRate,
      symbol: getCurrencySymbol(targetCurrency),
      formatted: formatPrice(roundedPrice, targetCurrency),
      roundingApplied: true,
      rawPrice,
      markup: Math.round(markup * 100) / 100 // Round to 2 decimal places
    };
    
  } catch (error) {
    console.error('Error converting price:', error);
    
    // Return safe fallback
    return {
      originalPrice: sekPrice,
      originalCurrency: 'SEK',
      convertedPrice: sekPrice,
      targetCurrency: 'SEK',
      exchangeRate: 1.0,
      symbol: getCurrencySymbol('SEK'),
      formatted: formatPrice(sekPrice, 'SEK'),
      roundingApplied: false,
      error: error.message
    };
  }
};

/**
 * Formats a price with currency symbol and proper decimals
 * @param {number} price - Price to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency) => {
  if (!price || price <= 0) return '0';
  
  const symbol = getCurrencySymbol(currency);
  
  // Format based on currency conventions
  switch (currency) {
    case 'JPY':
    case 'CNY':
      // No decimal places for these currencies
      return `${symbol}${Math.round(price)}`;
      
    case 'SEK':
    case 'NOK':
    case 'DKK':
      // Nordic currencies: symbol after price
      return `${price.toFixed(2)} ${symbol}`;
      
    case 'EUR':
      // Euro: symbol after price (European style)
      return `${price.toFixed(2)} ${symbol}`;
      
    case 'USD':
    case 'GBP':
    case 'BRL':
    case 'CHF':
    case 'INR':
    case 'MXN':
    default:
      // Symbol before price
      return `${symbol}${price.toFixed(2)}`;
  }
};

/**
 * Converts multiple prices at once (for product catalogs)
 * @param {Array} prices - Array of {price, id} objects
 * @param {string} targetCurrency - Target currency code
 * @param {boolean} forceRefresh - Force refresh exchange rates
 * @returns {Promise<Array>} Array of converted price objects
 */
export const convertPrices = async (prices, targetCurrency, forceRefresh = false) => {
  try {
    if (!prices || !Array.isArray(prices)) return [];
    
    const results = [];
    
    for (const priceItem of prices) {
      const converted = await convertPrice(priceItem.price, targetCurrency, forceRefresh);
      results.push({
        ...priceItem,
        ...converted
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('Error converting multiple prices:', error);
    return prices.map(item => ({
      ...item,
      error: error.message
    }));
  }
};

/**
 * Gets a preview of how a SEK price would convert to all supported currencies
 * @param {number} sekPrice - Price in SEK
 * @param {boolean} forceRefresh - Force refresh exchange rates
 * @returns {Promise<Object>} Preview of all currency conversions
 */
export const getMultiCurrencyPreview = async (sekPrice, forceRefresh = false) => {
  try {
    const currencies = ['EUR', 'USD', 'GBP', 'BRL', 'NOK', 'DKK', 'CHF', 'JPY', 'CNY', 'INR', 'MXN'];
    
    const preview = {
      originalPrice: sekPrice,
      originalCurrency: 'SEK',
      conversions: {}
    };
    
    // Add SEK as base
    preview.conversions['SEK'] = {
      convertedPrice: sekPrice,
      formatted: formatPrice(sekPrice, 'SEK'),
      symbol: getCurrencySymbol('SEK'),
      roundingApplied: false
    };
    
    // Convert to all other currencies
    for (const currency of currencies) {
      const converted = await convertPrice(sekPrice, currency, forceRefresh);
      preview.conversions[currency] = {
        convertedPrice: converted.convertedPrice,
        formatted: converted.formatted,
        symbol: converted.symbol,
        roundingApplied: converted.roundingApplied,
        markup: converted.markup,
        rawPrice: converted.rawPrice
      };
    }
    
    return preview;
    
  } catch (error) {
    console.error('Error getting multi-currency preview:', error);
    return {
      originalPrice: sekPrice,
      originalCurrency: 'SEK',
      conversions: {},
      error: error.message
    };
  }
};

/**
 * Calculates the savings/markup when using .99 rounding
 * @param {number} rawPrice - Raw converted price
 * @param {number} roundedPrice - Rounded .99 price
 * @returns {Object} Savings/markup information
 */
export const calculateRoundingImpact = (rawPrice, roundedPrice) => {
  if (!rawPrice || !roundedPrice) return { impact: 0, percentage: 0, type: 'none' };
  
  const difference = roundedPrice - rawPrice;
  const percentage = (difference / rawPrice) * 100;
  
  return {
    impact: Math.abs(difference),
    percentage: Math.round(percentage * 100) / 100,
    type: difference > 0 ? 'markup' : 'discount',
    isSignificant: Math.abs(percentage) > 5 // More than 5% difference
  };
};

/**
 * Validates if a price conversion makes business sense
 * @param {number} sekPrice - Original SEK price
 * @param {number} convertedPrice - Converted price
 * @param {string} targetCurrency - Target currency
 * @returns {Object} Validation result
 */
export const validatePriceConversion = (sekPrice, convertedPrice, targetCurrency) => {
  const warnings = [];
  const errors = [];
  
  if (!sekPrice || sekPrice <= 0) {
    errors.push('Invalid SEK price');
  }
  
  if (!convertedPrice || convertedPrice <= 0) {
    errors.push('Invalid converted price');
  }
  
  // Check for extreme markups
  if (convertedPrice && sekPrice) {
    const impact = calculateRoundingImpact(sekPrice, convertedPrice);
    
    if (impact.type === 'markup' && impact.percentage > 10) {
      warnings.push(`High markup: ${impact.percentage}% above exchange rate`);
    }
    
    if (impact.type === 'discount' && impact.percentage > 5) {
      warnings.push(`Price below exchange rate: ${impact.percentage}% discount`);
    }
  }
  
  // Currency-specific validations
  if (targetCurrency === 'JPY' && convertedPrice < 100) {
    warnings.push('JPY price might be too low for Japanese market');
  }
  
  if (targetCurrency === 'BRL' && convertedPrice < 10) {
    warnings.push('BRL price might be too low for Brazilian market');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    hasWarnings: warnings.length > 0
  };
}; 