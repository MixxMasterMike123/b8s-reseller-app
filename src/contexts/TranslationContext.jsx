import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

const TranslationContext = createContext();

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('sv-SE');
  const [translations, setTranslations] = useState(new Map());
  const [loading, setLoading] = useState(false);

  // Get translation with fallback to original Swedish text
  const t = (key, fallback = '') => {
    // If Swedish, return fallback immediately
    if (currentLanguage === 'sv-SE') {
      return fallback;
    }

    // Check cache first
    const cacheKey = `${currentLanguage}:${key}`;
    if (translations.has(cacheKey)) {
      return translations.get(cacheKey);
    }

    // Return fallback if no translation found
    return fallback;
  };

  // Load translations for a specific language
  const loadTranslations = async (language) => {
    if (language === 'sv-SE') {
      return; // No need to load Swedish translations
    }

    setLoading(true);
    try {
      const collectionName = `translations_${language.replace('-', '_')}`;
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const newTranslations = new Map(translations);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const cacheKey = `${language}:${doc.id}`;
        newTranslations.set(cacheKey, data.value || data.translation);
      });
      
      setTranslations(newTranslations);
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Change language
  const changeLanguage = async (language) => {
    setCurrentLanguage(language);
    await loadTranslations(language);
  };

  // Get available languages
  const getAvailableLanguages = () => {
    return [
      { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
      { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
      { code: 'en-US', name: 'English (US)', flag: '🇺🇸' }
    ];
  };

  // Detect language from URL
  const detectLanguageFromURL = () => {
    const path = window.location.pathname;
    const langMatch = path.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)\//);
    return langMatch ? langMatch[1] : 'sv-SE';
  };

  // Initialize language from URL
  useEffect(() => {
    const urlLanguage = detectLanguageFromURL();
    if (urlLanguage !== currentLanguage) {
      changeLanguage(urlLanguage);
    }
  }, []);

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    loading,
    getAvailableLanguages,
    detectLanguageFromURL
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};
