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

// Mock translations for testing (will be loaded from Firebase/Google Sheets in production)
const MOCK_TRANSLATIONS = {
  'en-GB': {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Product Catalogue',
    'nav.marketing': 'Marketing Materials',
    'nav.orders': 'Order History',
    'nav.profile': 'Profile',
    'nav.contact': 'Contact & Support',
    
    // Dashboard
    'dashboard.welcome': 'Reseller Portal',
    'dashboard.quicklinks': 'Quick Links',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.features': 'Features:',
    
    // Orders
    'order.title': 'Place an Order',
    'order.confirm': 'Confirm Order',
    'order.history': 'Order History',
    'order.status': 'Order Status',
    
    // Products
    'product.catalog': 'Product Catalogue',
    'product.details': 'Product Details',
    'product.price': 'Price',
    'product.download': 'Download',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    
    // Language switcher
    'language.switch': 'Switch Language',
    'language.current': 'Current Language',
    'language.swedish': 'Swedish',
    'language.english_uk': 'English (UK)',
    'language.english_us': 'English (US)',
    
    // Welcome messages
    'welcome.message': 'Welcome to our reseller portal – a tool to make your collaboration with us as smooth as possible.',
    'welcome.features.orders': 'Place orders directly',
    'welcome.features.history': 'Overview of order history',
    'welcome.features.catalog': 'Browse product catalogue',
    'welcome.features.materials': 'Download marketing materials'
  },
  'en-US': {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Product Catalog',
    'nav.marketing': 'Marketing Materials',
    'nav.orders': 'Order History',
    'nav.profile': 'Profile',
    'nav.contact': 'Contact & Support',
    
    // Dashboard
    'dashboard.welcome': 'Reseller Portal',
    'dashboard.quicklinks': 'Quick Links',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.features': 'Features:',
    
    // Orders
    'order.title': 'Place an Order',
    'order.confirm': 'Confirm Order',
    'order.history': 'Order History',
    'order.status': 'Order Status',
    
    // Products
    'product.catalog': 'Product Catalog',
    'product.details': 'Product Details',
    'product.price': 'Price',
    'product.download': 'Download',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    
    // Language switcher
    'language.switch': 'Switch Language',
    'language.current': 'Current Language',
    'language.swedish': 'Swedish',
    'language.english_uk': 'English (UK)',
    'language.english_us': 'English (US)',
    
    // Welcome messages
    'welcome.message': 'Welcome to our reseller portal – a tool to make your collaboration with us as smooth as possible.',
    'welcome.features.orders': 'Place orders directly',
    'welcome.features.history': 'Overview of order history',
    'welcome.features.catalog': 'Browse product catalog',
    'welcome.features.materials': 'Download marketing materials'
  }
};

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('sv-SE');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);

  // Load translations for a specific language
  const loadTranslations = async (languageCode) => {
    setLoading(true);
    try {
      // For Swedish, use fallback (no translation needed)
      if (languageCode === 'sv-SE') {
        setTranslations({});
        return;
      }

      // Try to load from Firebase first
      try {
        const collectionName = `translations_${languageCode.replace('-', '_')}`;
        console.log(`🌍 Loading translations from: ${collectionName}`);
        
        const querySnapshot = await getDocs(collection(db, collectionName));
        
        if (querySnapshot.empty) {
          console.log(`⚠️ No translations found in ${collectionName}, using mock data`);
          // Fall back to mock translations if no Firebase data
          const langTranslations = MOCK_TRANSLATIONS[languageCode] || {};
          setTranslations(langTranslations);
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
        
      } catch (firebaseError) {
        console.warn(`⚠️ Firebase translation loading failed for ${languageCode}:`, firebaseError);
        console.log(`📦 Falling back to mock translations for ${languageCode}`);
        
        // Fall back to mock translations
        const langTranslations = MOCK_TRANSLATIONS[languageCode] || {};
        setTranslations(langTranslations);
      }
      
    } catch (error) {
      console.error('Error loading translations:', error);
      // Final fallback to empty object
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

  // Get translated string with fallback
  const t = (key, fallback = '') => {
    // If Swedish (default), return the fallback or key
    if (currentLanguage === 'sv-SE') {
      return fallback || key;
    }
    
    // For other languages, try to get translation
    const translation = translations[key];
    if (translation) {
      return translation;
    }
    
    // Fallback to provided fallback or key
    return fallback || key;
  };

  // Get available languages
  const getAvailableLanguages = () => AVAILABLE_LANGUAGES;

  // Check if language is supported
  const isLanguageSupported = (languageCode) => {
    return AVAILABLE_LANGUAGES.some(lang => lang.code === languageCode);
  };

  // Initialize language from URL or localStorage
  useEffect(() => {
    const urlPath = window.location.pathname;
    const urlLangMatch = urlPath.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//);
    
    let initialLanguage = 'sv-SE'; // Default to Swedish
    
    if (urlLangMatch && isLanguageSupported(urlLangMatch[1])) {
      initialLanguage = urlLangMatch[1];
    } else {
      // Check localStorage
      const savedLanguage = localStorage.getItem('b8shield-language');
      if (savedLanguage && isLanguageSupported(savedLanguage)) {
        initialLanguage = savedLanguage;
      }
    }
    
    setCurrentLanguage(initialLanguage);
    if (initialLanguage !== 'sv-SE') {
      loadTranslations(initialLanguage);
    }
  }, []);

  const value = {
    currentLanguage,
    translations,
    loading,
    changeLanguage,
    loadTranslations,
    getAvailableLanguages,
    isLanguageSupported,
    t
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
