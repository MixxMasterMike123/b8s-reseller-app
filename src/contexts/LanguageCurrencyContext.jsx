/**
 * Language + Currency Context for B2C Shop
 * Manages intelligent language and currency detection, user preferences, and overrides
 * Integrates with existing TranslationContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from './TranslationContext';
import { useSimpleAuth } from './SimpleAuthContext'; // B2C auth context
import { 
  getCountryConfig,
  isCountrySupported,
  getCurrencyCode,
  getCurrencySymbol,
  getLanguageForCountry,
  DEFAULT_COUNTRY,
  FALLBACK_LANGUAGE
} from '../utils/internationalCountries';
import { 
  getOptimalLanguageForCountry,
  checkTranslationExists 
} from '../utils/translationDetection';
import { convertPrice } from '../utils/priceConversion.js';

const LanguageCurrencyContext = createContext();

/**
 * Hook to use Language + Currency context
 */
export const useLanguageCurrency = () => {
  const context = useContext(LanguageCurrencyContext);
  if (!context) {
    throw new Error('useLanguageCurrency must be used within a LanguageCurrencyProvider');
  }
  return context;
};

/**
 * Enhanced Language + Currency Provider for International E-commerce
 */
export const LanguageCurrencyProvider = ({ children }) => {
  // Get country from URL params
  const { countryCode: urlCountryCode } = useParams();
  
  // State management
  const [language, setLanguage] = useState('sv-SE');
  const [currency, setCurrency] = useState('SEK');
  const [detectionSource, setDetectionSource] = useState('loading');
  const [countryDetected, setCountryDetected] = useState(null);
  const [market, setMarket] = useState('primary');
  const [isLoading, setIsLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);

  // Get existing contexts
  const { changeLanguage: setTranslationLanguage } = useTranslation();
  const { currentUser } = useSimpleAuth(); // B2C user context

  /**
   * Safely updates translation language with error checking
   */
  const safeSetTranslationLanguage = useCallback(async (language) => {
    try {
      if (typeof setTranslationLanguage === 'function') {
        console.log('🔤 Updating translation language to:', language);
        await setTranslationLanguage(language);
      } else {
        console.warn('⚠️ setTranslationLanguage is not available:', typeof setTranslationLanguage);
      }
    } catch (error) {
      console.error('❌ Error setting translation language:', error);
    }
  }, [setTranslationLanguage]);

  /**
   * Updates both language and currency state with international support
   */
  const updateLanguageAndCurrency = useCallback(async (newLanguage, newCurrency, source = 'manual', detectedCountry = null) => {
    console.log('🔄 Updating language and currency:', newLanguage, '+', newCurrency, 'from', source);
    
    // Update local state
    setLanguage(newLanguage);
    setCurrency(newCurrency);
    setDetectionSource(source);
    setCountryDetected(detectedCountry);
    setMarket(detectedCountry === 'se' ? 'primary' : 'secondary');
    
    // Update translation context safely
    await safeSetTranslationLanguage(newLanguage);
    
    // Store preferences if manual
    if (source === 'manual' || source === 'user-selection') {
      localStorage.setItem('user-language-preference', newLanguage);
      localStorage.setItem('user-currency-preference', newCurrency);
      setManualOverride(true);
    }
    
    return true;
  }, [safeSetTranslationLanguage]);

  /**
   * Initialize from URL country code with international support
   */
  const initializeFromUrlCountry = useCallback(async (countryCode) => {
    if (!countryCode) {
      console.log('🌍 LanguageCurrency: No country code provided');
      return false;
    }
    
    const code = countryCode.toLowerCase();
    console.log(`🌍 LanguageCurrency: Initializing from URL country: ${code}`);
    
    // Get country configuration
    const countryConfig = getCountryConfig(code);
    
    if (!countryConfig) {
      console.log(`❓ Unknown country: ${code}, using default`);
      await updateLanguageAndCurrency('sv-SE', 'SEK', 'unknown-country-fallback', 'SE');
      return true;
    }
    
    // Get optimal language for this country
    const optimalLanguage = await getOptimalLanguageForCountry(code);
    const currency = countryConfig.currency;
    const isSupported = countryConfig.isSupported;
    
    console.log(`🌍 Country ${code}: ${optimalLanguage} + ${currency} (${isSupported ? 'supported' : 'unsupported'})`);
    
    await updateLanguageAndCurrency(
      optimalLanguage, 
      currency, 
      'url-country', 
      code.toUpperCase()
    );
    
    return true;
  }, [updateLanguageAndCurrency]);

  /**
   * Manual language selection with URL country awareness
   */
  const selectLanguage = useCallback(async (newLanguage) => {
    console.log('👤 Manual language selection:', newLanguage);
    
    // If we have a URL country, get its currency
    let targetCurrency = 'SEK';
    if (urlCountryCode) {
      targetCurrency = getCurrencyCode(urlCountryCode) || 'SEK';
    } else {
      // Map language to default currency
      const languageCurrencyMap = {
        'sv-SE': 'SEK',
        'en-GB': 'EUR',
        'en-US': 'USD'
      };
      targetCurrency = languageCurrencyMap[newLanguage] || 'SEK';
    }
    
    const success = await updateLanguageAndCurrency(
      newLanguage, 
      targetCurrency, 
      'user-selection',
      urlCountryCode?.toUpperCase() || countryDetected
    );
    
    if (success) {
      console.log('✅ Language selection successful:', newLanguage, '→', targetCurrency);
    }
    
    return success;
  }, [urlCountryCode, countryDetected, updateLanguageAndCurrency]);

  /**
   * Manual currency selection (keeps current language)
   */
  const selectCurrency = useCallback(async (newCurrency) => {
    const success = await updateLanguageAndCurrency(
      language, 
      newCurrency, 
      'user-selection',
      countryDetected
    );
    
    if (success) {
      console.log('👤 User selected currency:', newCurrency);
    }
    
    return success;
  }, [language, countryDetected, updateLanguageAndCurrency]);

  /**
   * Reset to geo-detected defaults
   */
  const resetToGeoDefaults = useCallback(async () => {
    // Clear stored preferences
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-language-preference');
      localStorage.removeItem('user-currency-preference');
    }
    
    setManualOverride(false);
    
    // Re-initialize from URL
    if (urlCountryCode) {
      await initializeFromUrlCountry(urlCountryCode);
    }
  }, [urlCountryCode, initializeFromUrlCountry]);

  /**
   * Converts a SEK price to current currency
   */
  const convertSEKPrice = useCallback(async (sekPrice) => {
    try {
      if (currency === 'SEK') {
        return {
          originalPrice: sekPrice,
          convertedPrice: sekPrice,
          formatted: `${sekPrice.toFixed(2)} kr`,
          currency: 'SEK',
          exchangeRate: 1.0
        };
      }
      
      return await convertPrice(sekPrice, currency);
    } catch (error) {
      console.error('Error converting price:', error);
      return {
        originalPrice: sekPrice,
        convertedPrice: sekPrice,
        formatted: `${sekPrice.toFixed(2)} kr`,
        currency: 'SEK',
        exchangeRate: 1.0,
        error: error.message
      };
    }
  }, [currency]);

  /**
   * Gets display information
   */
  const getDisplayInfo = useCallback(() => {
    return {
      language,
      currency,
      currencySymbol: getCurrencySymbol(countryDetected?.toLowerCase() || 'se'),
      detectionSource,
      countryDetected,
      market,
      isManual: manualOverride,
      isSupported: urlCountryCode ? isCountrySupported(urlCountryCode) : true,
      countryConfig: urlCountryCode ? getCountryConfig(urlCountryCode) : null
    };
  }, [language, currency, detectionSource, countryDetected, market, manualOverride, urlCountryCode]);

  // Initial detection on mount
  useEffect(() => {
    const initialize = async () => {
      // Only run on B2C shop domain
      if (typeof window !== 'undefined' && window.location.hostname === 'shop.b8shield.com') {
        console.log('🛒 Initializing enhanced language/currency for international e-commerce...');
        
        // Initialize from URL country if available
        if (urlCountryCode) {
          console.log(`🌍 LanguageCurrency: URL country detected: ${urlCountryCode}`);
          await initializeFromUrlCountry(urlCountryCode);
        } else {
          console.log('🌍 LanguageCurrency: No URL country, waiting for geo-redirect...');
          // Don't set defaults immediately - wait for potential redirect
          // Just set loading state
          setIsLoading(true);
          return; // Exit early, don't set defaults
        }
      } else {
        // B2B portal - set Swedish immediately
        console.log('🏠 B2B portal detected - using Swedish');
        await updateLanguageAndCurrency('sv-SE', 'SEK', 'b2b-portal', 'SE');
      }
      
      setIsLoading(false);
    };
    
    initialize();
  }, [urlCountryCode, initializeFromUrlCountry, updateLanguageAndCurrency]);

  // Re-detect when URL country changes
  useEffect(() => {
    if (urlCountryCode) {
      console.log(`🔄 URL country changed to: ${urlCountryCode}`);
      initializeFromUrlCountry(urlCountryCode);
    }
  }, [urlCountryCode, initializeFromUrlCountry]);

  // Timeout fallback for when no redirect happens
  useEffect(() => {
    if (!urlCountryCode && typeof window !== 'undefined' && window.location.hostname === 'shop.b8shield.com') {
      const timeoutId = setTimeout(() => {
        console.log('🕐 No redirect after 2 seconds, using Swedish defaults');
        updateLanguageAndCurrency('sv-SE', 'SEK', 'timeout-fallback', 'SE');
        setIsLoading(false);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [urlCountryCode, updateLanguageAndCurrency]);

  // Context value
  const contextValue = {
    // Current state
    language,
    currency,
    isLoading,
    detectionSource,
    countryDetected,
    market,
    isManual: manualOverride,
    
    // Actions
    selectLanguage,
    selectCurrency,
    resetToGeoDefaults,
    updateLanguageAndCurrency,
    
    // Utilities
    convertSEKPrice,
    getDisplayInfo,
    
    // International support
    urlCountryCode,
    countryConfig: urlCountryCode ? getCountryConfig(urlCountryCode) : null,
    isCountrySupported: urlCountryCode ? isCountrySupported(urlCountryCode) : true,
    
    // Computed properties
    isShopDomain: typeof window !== 'undefined' && window.location.hostname === 'shop.b8shield.com',
    isPrimaryMarket: market === 'primary',
    isSecondaryMarket: market === 'secondary'
  };

  return (
    <LanguageCurrencyContext.Provider value={contextValue}>
      {children}
    </LanguageCurrencyContext.Provider>
  );
};

// Export the context for advanced usage
export { LanguageCurrencyContext }; 