/**
 * Exchange Rate Service
 * Provides real-time currency exchange rates with caching and fallback mechanisms
 */

// Cache duration: 1 hour (exchange rates don't change that frequently)
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Fallback exchange rates (updated January 2025) - used if API fails
const FALLBACK_RATES = {
  'SEK': 1.0,      // Base currency
  'EUR': 0.08973,  // 1 SEK = 0.08973 EUR
  'USD': 0.10492,  // 1 SEK = 0.10492 USD  
  'GBP': 0.07749,  // 1 SEK = 0.07749 GBP
  'BRL': 0.58047,  // 1 SEK = 0.58047 BRL
  'NOK': 1.1543,   // 1 SEK = 1.1543 NOK
  'DKK': 0.6691,   // 1 SEK = 0.6691 DKK
  'CHF': 0.0947,   // 1 SEK = 0.0947 CHF
  'JPY': 16.25,    // 1 SEK = 16.25 JPY
  'CNY': 0.761,    // 1 SEK = 0.761 CNY
  'INR': 8.95,     // 1 SEK = 8.95 INR
  'MXN': 2.13      // 1 SEK = 2.13 MXN
};

/**
 * Gets exchange rates from cache if available and not expired
 * @returns {Object|null} Cached exchange rates or null if expired/unavailable
 */
const getCachedRates = () => {
  try {
    if (typeof window === 'undefined') return null;
    
    const cachedRates = localStorage.getItem('exchange-rates');
    const cacheTimestamp = localStorage.getItem('exchange-rates-timestamp');
    
    if (!cachedRates || !cacheTimestamp) return null;
    
    const age = Date.now() - parseInt(cacheTimestamp);
    if (age > CACHE_DURATION) {
      // Cache expired, remove it
      localStorage.removeItem('exchange-rates');
      localStorage.removeItem('exchange-rates-timestamp');
      return null;
    }
    
    return JSON.parse(cachedRates);
  } catch (error) {
    console.warn('Error getting cached exchange rates:', error);
    return null;
  }
};

/**
 * Caches exchange rates in localStorage
 * @param {Object} rates - Exchange rates object
 */
const setCachedRates = (rates) => {
  try {
    if (typeof window !== 'undefined' && rates) {
      localStorage.setItem('exchange-rates', JSON.stringify(rates));
      localStorage.setItem('exchange-rates-timestamp', Date.now().toString());
    }
  } catch (error) {
    console.warn('Error caching exchange rates:', error);
  }
};

/**
 * Fetches exchange rates from ExchangeRate-API.com (free tier)
 * @returns {Promise<Object>} Exchange rates with SEK as base currency
 */
const fetchFromExchangeRateAPI = async () => {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/SEK');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.rates) {
      console.log('💱 Exchange rates fetched from ExchangeRate-API.com');
      return data.rates;
    }
    
    throw new Error('Invalid response format from ExchangeRate-API');
  } catch (error) {
    console.warn('ExchangeRate-API failed:', error.message);
    throw error;
  }
};

/**
 * Fetches exchange rates from Fixer.io API (backup)
 * @returns {Promise<Object>} Exchange rates with SEK as base currency
 */
const fetchFromFixerAPI = async () => {
  try {
    // Note: Fixer.io requires API key for production, but has free tier
    // For now, we'll use a fallback structure
    const response = await fetch('https://api.fixer.io/latest?base=SEK');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.rates) {
      console.log('💱 Exchange rates fetched from Fixer.io');
      return data.rates;
    }
    
    throw new Error('Invalid response format from Fixer.io');
  } catch (error) {
    console.warn('Fixer.io API failed:', error.message);
    throw error;
  }
};

/**
 * Main function to get current exchange rates
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<Object>} Exchange rates with SEK as base currency
 */
export const getExchangeRates = async (forceRefresh = false) => {
  try {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedRates = getCachedRates();
      if (cachedRates) {
        console.log('💱 Using cached exchange rates');
        return cachedRates;
      }
    }
    
    // Try primary API (ExchangeRate-API.com)
    try {
      const rates = await fetchFromExchangeRateAPI();
      setCachedRates(rates);
      return rates;
    } catch (error) {
      console.warn('Primary exchange rate API failed, trying backup...');
    }
    
    // Try backup API (Fixer.io)
    try {
      const rates = await fetchFromFixerAPI();
      setCachedRates(rates);
      return rates;
    } catch (error) {
      console.warn('Backup exchange rate API failed, using fallback rates...');
    }
    
    // Use fallback rates if all APIs fail
    console.log('💱 Using fallback exchange rates (offline mode)');
    return FALLBACK_RATES;
    
  } catch (error) {
    console.error('Error getting exchange rates:', error);
    // Always return fallback rates as last resort
    return FALLBACK_RATES;
  }
};

/**
 * Gets a specific exchange rate for a currency pair
 * @param {string} fromCurrency - Source currency (e.g., 'SEK')
 * @param {string} toCurrency - Target currency (e.g., 'EUR')
 * @param {boolean} forceRefresh - Force refresh rates
 * @returns {Promise<number>} Exchange rate
 */
export const getExchangeRate = async (fromCurrency, toCurrency, forceRefresh = false) => {
  try {
    if (fromCurrency === toCurrency) return 1.0;
    
    const rates = await getExchangeRates(forceRefresh);
    
    // If base currency is SEK, direct lookup
    if (fromCurrency === 'SEK') {
      return rates[toCurrency] || 1.0;
    }
    
    // If target currency is SEK, inverse lookup
    if (toCurrency === 'SEK') {
      return 1.0 / (rates[fromCurrency] || 1.0);
    }
    
    // Cross-currency calculation (via SEK)
    const fromRate = rates[fromCurrency] || 1.0;
    const toRate = rates[toCurrency] || 1.0;
    
    return toRate / fromRate;
    
  } catch (error) {
    console.error('Error getting specific exchange rate:', error);
    return 1.0; // Safe fallback
  }
};

/**
 * Gets exchange rate status and information
 * @returns {Promise<Object>} Status object with rate info
 */
export const getExchangeRateStatus = async () => {
  try {
    const cachedRates = getCachedRates();
    const hasCachedRates = !!cachedRates;
    
    let cacheAge = 0;
    if (hasCachedRates) {
      const timestamp = localStorage.getItem('exchange-rates-timestamp');
      if (timestamp) {
        cacheAge = Date.now() - parseInt(timestamp);
      }
    }
    
    // Test if we can fetch new rates
    let apiStatus = 'unknown';
    try {
      await fetchFromExchangeRateAPI();
      apiStatus = 'online';
    } catch (error) {
      apiStatus = 'offline';
    }
    
    return {
      hasCachedRates,
      cacheAge,
      cacheAgeMinutes: Math.floor(cacheAge / (1000 * 60)),
      apiStatus,
      usingFallback: apiStatus === 'offline' && !hasCachedRates
    };
    
  } catch (error) {
    console.error('Error getting exchange rate status:', error);
    return {
      hasCachedRates: false,
      cacheAge: 0,
      cacheAgeMinutes: 0,
      apiStatus: 'error',
      usingFallback: true
    };
  }
};

/**
 * Clears cached exchange rates (for testing/debugging)
 */
export const clearExchangeRateCache = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('exchange-rates');
      localStorage.removeItem('exchange-rates-timestamp');
      console.log('💱 Exchange rate cache cleared');
    }
  } catch (error) {
    console.warn('Error clearing exchange rate cache:', error);
  }
};

/**
 * Preloads exchange rates (useful for app initialization)
 * @returns {Promise<void>} 
 */
export const preloadExchangeRates = async () => {
  try {
    console.log('💱 Preloading exchange rates...');
    await getExchangeRates();
    console.log('💱 Exchange rates preloaded successfully');
  } catch (error) {
    console.warn('Error preloading exchange rates:', error);
  }
}; 