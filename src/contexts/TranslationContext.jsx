/**
 * Translation Context for B8Shield International System
 * Handles language switching, translation loading, and fallback logic
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import LoaderOverlay from '../components/LoaderOverlay';

const TranslationContext = createContext();

// Available languages
const AVAILABLE_LANGUAGES = [
  { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' }
];

// Initialize language synchronously from localStorage and URL
const getInitialLanguage = () => {
  try {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && AVAILABLE_LANGUAGES.some(lang => lang.code === urlLang)) {
      console.log(`🌍 Initial language from URL: ${urlLang}`);
      return urlLang;
    }
    
    // For B2C shop, check if we already have a country in the URL path
    if (typeof window !== 'undefined' && window.location.hostname === 'shop.b8shield.com') {
      const pathname = window.location.pathname;
      const segments = pathname.split('/').filter(Boolean);
      const countryCode = segments[0];
      
      // If we have a country code in URL, map it to language immediately
      if (countryCode && countryCode.length === 2) {
        const countryLanguageMap = {
          'se': 'sv-SE',
          'gb': 'en-GB', 
          'us': 'en-US',
          // For unsupported countries, use English as fallback
        };
        
        const mappedLanguage = countryLanguageMap[countryCode.toLowerCase()];
        if (mappedLanguage) {
          console.log(`🌍 B2C: Country ${countryCode} → ${mappedLanguage} (from URL path)`);
          return mappedLanguage;
        } else {
          console.log(`🌍 B2C: Unsupported country ${countryCode} → en-GB (fallback)`);
          return 'en-GB';
        }
      }
      
      // Check localStorage for previously detected language (to handle page refreshes)
      const savedLang = localStorage.getItem('b8shield-language');
      if (savedLang && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLang)) {
        console.log(`🌍 B2C: Using saved language: ${savedLang} (from localStorage)`);
        return savedLang;
      }
      
      // Only return null if we truly have no information (initial page load without country)
      console.log(`🌍 B2C: No country in URL, waiting for geo-detection...`);
      return null; // Will wait for LanguageCurrencyContext to set the language
    }
    
    // Check localStorage for B2B
    const savedLang = localStorage.getItem('b8shield-language');
    console.log(`🌍 MAIN APP: Checking localStorage 'b8shield-language':`, savedLang);
    console.log(`🌍 MAIN APP: Available languages:`, AVAILABLE_LANGUAGES.map(l => l.code));
    if (savedLang && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLang)) {
      console.log(`🌍 MAIN APP: Initial language from localStorage: ${savedLang}`);
      return savedLang;
    } else {
      console.log(`🌍 MAIN APP: Saved language not found or unsupported: ${savedLang}`);
    }
    
    // Default to Swedish for B2B
    console.log(`🌍 MAIN APP: Initial language defaulted to: sv-SE`);
    return 'sv-SE';
  } catch (error) {
    console.error('Error getting initial language:', error);
    return 'sv-SE';
  }
};

export const TranslationProvider = ({ children }) => {
  const initialLanguage = getInitialLanguage();
  console.log(`🌍 MAIN APP: Component initializing with language: ${initialLanguage}`);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false); // Start as false for better perceived performance
  const [waitingForGeo, setWaitingForGeo] = useState(initialLanguage === null);

  // Load translations for a specific language
  const loadTranslations = useCallback(async (languageCode) => {
    setLoading(true);
    try {
      // Load from Firebase for all languages including Swedish
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      console.log(`🌍 Loading translations from: ${collectionName}`);
      
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (querySnapshot.empty) {
        console.log(`⚠️ No translations found in ${collectionName}`);
        
        // If requested language is not Swedish and not found, try English fallback
        if (languageCode !== 'sv-SE' && languageCode !== 'en-GB') {
          console.log(`🔄 Attempting English fallback for missing ${languageCode}`);
          await loadTranslations('en-GB');
          return;
        }
        
        // If English also fails, try Swedish
        if (languageCode === 'en-GB') {
          console.log(`🔄 English translations missing, falling back to Swedish`);
          await loadTranslations('sv-SE');
          return;
        }
        
        // If Swedish fails too, use empty translations
        setTranslations({});
        return;
      }

      // Process Firebase translations
      const firebaseTranslations = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use 'value' field if available, otherwise 'translation'
        firebaseTranslations[doc.id] = data.value || data.translation || '';
      });
      
      console.log(`✅ Loaded ${Object.keys(firebaseTranslations).length} translations from Firebase`);
      setTranslations(firebaseTranslations);
      
    } catch (error) {
      console.error('Error loading translations:', error);
      
      // Smart error fallback
      if (languageCode !== 'sv-SE') {
        console.log(`🔄 Error loading ${languageCode}, trying Swedish fallback`);
        await loadTranslations('sv-SE');
      } else {
      setTranslations({});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Change language with enhanced validation
  const changeLanguage = useCallback(async (languageCode) => {
    console.log(`🔄 TranslationProvider: Changing language to ${languageCode} (current: ${currentLanguage})`);
    
    // Validate language code
    if (!AVAILABLE_LANGUAGES.some(lang => lang.code === languageCode)) {
      console.warn(`⚠️ Unsupported language: ${languageCode}, falling back to en-GB`);
      languageCode = 'en-GB';
    }
    
    if (languageCode !== currentLanguage) {
      setCurrentLanguage(languageCode);
      setWaitingForGeo(false); // Geo-detection completed
      await loadTranslations(languageCode);
      
      // Store preference in localStorage
      localStorage.setItem('b8shield-language', languageCode);
      
      console.log(`✅ Language changed to: ${languageCode}`);
    }
  }, [currentLanguage, loadTranslations]);

  // Get translated string with fallback and variable interpolation
  const t = (key, fallback = '', variables = {}) => {
    let text = '';
    
    // For all languages, try to get translation from Firebase first, then fallback
    const translation = translations[key];
    text = translation || fallback || key;
    
    // Handle variable interpolation
    if (variables && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([variable, value]) => {
        const placeholder = `{{${variable}}}`;
        text = text.replace(new RegExp(placeholder, 'g'), value);
      });
    }
    
    return text;
  };

  // Get available languages
  const getAvailableLanguages = () => AVAILABLE_LANGUAGES;

  // Check if language is supported
  const isLanguageSupported = (languageCode) => {
    return AVAILABLE_LANGUAGES.some(lang => lang.code === languageCode);
  };

  // Load translations for the initial language
  useEffect(() => {
    let timeoutId;
    
    const initializeTranslations = async () => {
      try {
        // If waiting for geo-detection, just wait - no timeout needed
        if (waitingForGeo) {
          console.log(`🌍 TranslationProvider: Waiting for LanguageCurrencyContext to provide language...`);
          return; // Don't load translations yet
        }
        
        // Load translations for known language (non-blocking for performance)
        if (currentLanguage) {
          console.log(`🌍 Loading translations for initial language: ${currentLanguage}`);
          // Make translation loading non-blocking to improve perceived performance
          loadTranslations(currentLanguage).catch(error => {
            console.error('Translation loading failed (non-critical):', error);
          });
        }
      } catch (error) {
        console.error('Translation initialization failed:', error);
        // Only fallback to English if we don't have a current language
        if (!currentLanguage) {
          loadTranslations('en-GB').catch(err => {
            console.error('Fallback translation loading failed:', err);
          });
        }
      }
    };

    // Only initialize if we have a language or are not waiting for geo-detection
    if (currentLanguage || !waitingForGeo) {
      initializeTranslations();
    }
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentLanguage, waitingForGeo]); // FIXED: Removed loadTranslations from dependencies to prevent loops

  const value = {
    currentLanguage,
    translations,
    loading: loading || waitingForGeo,
    changeLanguage,
    t,
    getAvailableLanguages,
    isLanguageSupported
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
      <LoaderOverlay isVisible={loading || waitingForGeo} />
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
