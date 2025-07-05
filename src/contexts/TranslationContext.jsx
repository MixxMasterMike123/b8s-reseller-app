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

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('sv-SE');
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

  // Initialize language from URL or localStorage
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        let targetLanguage = 'sv-SE'; // Default to Swedish
        
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        
        if (urlLang && isLanguageSupported(urlLang)) {
          targetLanguage = urlLang;
        } else {
          // Check localStorage
          const savedLang = localStorage.getItem('b8shield-language');
          if (savedLang && isLanguageSupported(savedLang)) {
            targetLanguage = savedLang;
          }
        }
        
        // Always load translations for the determined language
        console.log(`🌍 Initializing language: ${targetLanguage}`);
        setCurrentLanguage(targetLanguage);
        await loadTranslations(targetLanguage);
        
      } catch (error) {
        console.error('Language initialization failed:', error);
        setCurrentLanguage('sv-SE');
        await loadTranslations('sv-SE');
      }
    };

    initializeLanguage();
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
