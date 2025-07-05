/**
 * Translation Context for B8Shield International System
 * Handles language switching, translation loading, and fallback logic
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

const TranslationContext = createContext();

// Available languages
const AVAILABLE_LANGUAGES = [
  { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' }
];

// Initialize language synchronously from localStorage
const getInitialLanguage = () => {
  try {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    if (urlLang && AVAILABLE_LANGUAGES.some(lang => lang.code === urlLang)) {
      console.log(`🌍 Initial language from URL: ${urlLang}`);
      return urlLang;
    }
    
    // Check localStorage
    const savedLang = localStorage.getItem('b8shield-language');
    console.log(`🌍 MAIN APP: Checking localStorage 'b8shield-language':`, savedLang);
    console.log(`🌍 MAIN APP: Available languages:`, AVAILABLE_LANGUAGES.map(l => l.code));
    if (savedLang && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLang)) {
      console.log(`🌍 MAIN APP: Initial language from localStorage: ${savedLang}`);
      return savedLang;
    } else {
      console.log(`🌍 MAIN APP: Saved language not found or unsupported: ${savedLang}`);
    }
    
    // Default to Swedish
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
  const [loading, setLoading] = useState(false);

  // Load translations for a specific language
  const loadTranslations = async (languageCode) => {
    setLoading(true);
    try {
      // Load from Firebase for all languages including Swedish
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      console.log(`🌍 Loading translations from: ${collectionName}`);
      
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (querySnapshot.empty) {
        console.log(`⚠️ No translations found in ${collectionName}`);
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
      setTranslations({});
    } finally {
      setLoading(false);
    }
  };

  // Change language
  const changeLanguage = async (languageCode) => {
    if (languageCode !== currentLanguage) {
      setCurrentLanguage(languageCode);
      await loadTranslations(languageCode);
      
      // Store preference in localStorage
      localStorage.setItem('b8shield-language', languageCode);
    }
  };

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
    const initializeTranslations = async () => {
      try {
        console.log(`🌍 Loading translations for initial language: ${currentLanguage}`);
        await loadTranslations(currentLanguage);
      } catch (error) {
        console.error('Translation initialization failed:', error);
        await loadTranslations('sv-SE');
      }
    };

    initializeTranslations();
  }, []);

  const value = {
    currentLanguage,
    translations,
    loading,
    changeLanguage,
    t,
    getAvailableLanguages,
    isLanguageSupported
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
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
