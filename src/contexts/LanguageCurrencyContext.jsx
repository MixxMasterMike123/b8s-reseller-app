/**
 * Language + Currency Context for B2C Shop
 * Manages intelligent language and currency detection, user preferences, and overrides
 * Integrates with existing TranslationContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from './TranslationContext';
import { useAuth } from './SimpleAuthContext'; // B2C auth context
import { 
  detectLanguageAndCurrency, 
  getAvailableLanguages,
  getCurrencyForLanguage,
  getLanguageCurrencyDisplay,
  storeUserPreferences,
  getStoredUserPreferences,
  isValidLanguageCurrencyPair
} from '../utils/geoLanguageCurrency.js';
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
 * Language + Currency Provider Component
 */
export const LanguageCurrencyProvider = ({ children }) => {
  // State management
  const [language, setLanguage] = useState('sv-SE');
  const [currency, setCurrency] = useState('SEK');
  const [detectionSource, setDetectionSource] = useState('loading');
  const [countryDetected, setCountryDetected] = useState(null);
  const [market, setMarket] = useState('primary');
  const [isLoading, setIsLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);

  // Get existing contexts
  const { setLanguage: setTranslationLanguage } = useTranslation();
  const { user } = useAuth(); // B2C user context

  /**
   * Updates both language and currency state
   */
  const updateLanguageAndCurrency = useCallback((newLanguage, newCurrency, source = 'manual') => {
    console.log('🔄 Updating language and currency:', newLanguage, '+', newCurrency, 'from', source);
    
    // Validate the combination
    if (!isValidLanguageCurrencyPair(newLanguage, newCurrency)) {
      console.warn('⚠️ Invalid language/currency pair:', newLanguage, newCurrency);
      return false;
    }

    // Update local state
    setLanguage(newLanguage);
    setCurrency(newCurrency);
    setDetectionSource(source);
    
    // Update translation context
    setTranslationLanguage(newLanguage);
    
    // Store preferences if manual
    if (source === 'manual' || source === 'user-selection') {
      storeUserPreferences(newLanguage, newCurrency);
      setManualOverride(true);
    }
    
    return true;
  }, [setTranslationLanguage]);

  /**
   * Detects and sets optimal language and currency
   */
  const detectAndSetLanguageCurrency = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Starting language and currency detection...');
      
      // Check for stored user preferences first
      const storedPrefs = getStoredUserPreferences();
      
      // Prepare detection options
      const options = {
        userPreferredLang: user?.preferredLang || null,
        manualLanguage: storedPrefs?.language || null,
        manualCurrency: storedPrefs?.currency || null,
        respectUserPreferences: true
      };
      
      console.log('🔍 Detection options:', options);
      
      // Perform detection
      const detection = detectLanguageAndCurrency(options);
      
      console.log('✅ Detection result:', detection);
      
      // Update state
      setLanguage(detection.language);
      setCurrency(detection.currency);
      setDetectionSource(detection.source);
      setCountryDetected(detection.countryDetected);
      setMarket(detection.market);
      setManualOverride(detection.source.includes('manual') || detection.source.includes('user'));
      
      // Update translation context
      setTranslationLanguage(detection.language);
      
    } catch (error) {
      console.error('❌ Error in language/currency detection:', error);
      
      // Fallback to Swedish
      setLanguage('sv-SE');
      setCurrency('SEK');
      setDetectionSource('error-fallback');
      setTranslationLanguage('sv-SE');
      
    } finally {
      setIsLoading(false);
    }
  }, [user, setTranslationLanguage]);

  /**
   * Manual language selection (currency follows)
   */
  const selectLanguage = useCallback((newLanguage) => {
    const newCurrency = getCurrencyForLanguage(newLanguage);
    const success = updateLanguageAndCurrency(newLanguage, newCurrency, 'user-selection');
    
    if (success) {
      console.log('👤 User selected language:', newLanguage, '→ currency:', newCurrency);
    }
    
    return success;
  }, [updateLanguageAndCurrency]);

  /**
   * Manual currency selection (keeps current language)
   */
  const selectCurrency = useCallback((newCurrency) => {
    const success = updateLanguageAndCurrency(language, newCurrency, 'user-selection');
    
    if (success) {
      console.log('👤 User selected currency:', newCurrency);
    }
    
    return success;
  }, [language, updateLanguageAndCurrency]);

  /**
   * Reset to geo-detected defaults
   */
  const resetToGeoDefaults = useCallback(() => {
    // Clear stored preferences
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-language-preference');
      localStorage.removeItem('user-currency-preference');
      localStorage.removeItem('user-preferences-timestamp');
    }
    
    setManualOverride(false);
    
    // Re-detect
    detectAndSetLanguageCurrency();
  }, [detectAndSetLanguageCurrency]);

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
      display: getLanguageCurrencyDisplay(language, currency),
      detectionSource,
      countryDetected,
      market,
      isManual: manualOverride,
      availableLanguages: getAvailableLanguages()
    };
  }, [language, currency, detectionSource, countryDetected, market, manualOverride]);

  // Initial detection on mount
  useEffect(() => {
    // Only run on B2C shop domain
    if (typeof window !== 'undefined' && window.location.hostname === 'shop.b8shield.com') {
      console.log('🛒 Initializing language/currency detection for B2C shop...');
      detectAndSetLanguageCurrency();
    } else {
      // B2B portal - set Swedish immediately
      console.log('🏠 B2B portal detected - using Swedish');
      setLanguage('sv-SE');
      setCurrency('SEK');
      setDetectionSource('b2b-portal');
      setTranslationLanguage('sv-SE');
      setIsLoading(false);
    }
  }, []); // Run once on mount

  // Re-detect when user changes (login/logout)
  useEffect(() => {
    if (!isLoading && user?.preferredLang) {
      console.log('👤 User logged in with preferred language:', user.preferredLang);
      detectAndSetLanguageCurrency();
    }
  }, [user?.preferredLang, detectAndSetLanguageCurrency, isLoading]);

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
    detectAndSetLanguageCurrency,
    
    // Utilities
    convertSEKPrice,
    getDisplayInfo,
    availableLanguages: getAvailableLanguages(),
    
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