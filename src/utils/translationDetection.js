/**
 * Dynamic Translation Detection for B8Shield International System
 * Automatically detects available translations in Firebase and manages language fallback
 */

import { db } from '../firebase/config';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { 
  getCountryConfig, 
  SUPPORTED_TRANSLATION_COUNTRIES,
  FALLBACK_LANGUAGE 
} from './internationalCountries';

// Cache for translation availability to avoid repeated Firebase calls
let translationCache = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// PERFORMANCE OPTIMIZATION: Only check for languages that actually exist
// This prevents 14 unnecessary Firebase queries for languages that don't exist
const ACTUALLY_AVAILABLE_LANGUAGES = [
  'sv-SE', // Swedish - Primary language
  'en-GB', // English UK - Secondary language
  'en-US'  // English US - Secondary language
];

/**
 * Check if a specific language has translations in Firebase
 */
export const checkTranslationExists = async (languageCode) => {
  try {
    const collectionName = `translations_${languageCode.replace('-', '_')}`;
    console.log(`🔍 Checking for translations: ${collectionName}`);
    
    // Try to get one document from the collection to check if it exists
    const q = query(collection(db, collectionName), limit(1));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    console.log(`${exists ? '✅' : '❌'} Translations ${collectionName}: ${exists ? 'Found' : 'Not found'}`);
    
    return exists;
  } catch (error) {
    console.error(`❌ Error checking translations for ${languageCode}:`, error);
    return false;
  }
};

/**
 * Get all available translation languages from Firebase
 * PERFORMANCE OPTIMIZED: Only checks languages that actually exist
 */
export const getAvailableTranslations = async () => {
  const now = Date.now();
  
  // Return cached result if still fresh
  if (translationCache.languages && (now - lastCacheUpdate) < CACHE_DURATION) {
    console.log('📋 Using cached translation availability');
    return translationCache.languages;
  }
  
  console.log('🔍 Detecting available translations from Firebase...');
  
  const availableLanguages = [];
  
  // ⚡ PERFORMANCE OPTIMIZATION: Only check languages we know exist
  // This reduces Firebase queries from 17 to 3, saving ~14 unnecessary database calls
  
  // Check each language in parallel for performance
  const checks = ACTUALLY_AVAILABLE_LANGUAGES.map(async (lang) => {
    const exists = await checkTranslationExists(lang);
    if (exists) {
      return lang;
    }
    return null;
  });
  
  const results = await Promise.all(checks);
  availableLanguages.push(...results.filter(Boolean));
  
  // Cache the results
  translationCache.languages = availableLanguages;
  lastCacheUpdate = now;
  
  console.log(`✅ Available translations detected: (${availableLanguages.length})`, availableLanguages);
  return availableLanguages;
};

/**
 * Get optimal language for a country based on available translations
 */
export const getOptimalLanguageForCountry = async (countryCode) => {
  if (!countryCode) {
    return FALLBACK_LANGUAGE;
  }
  
  const code = countryCode.toLowerCase();
  const countryConfig = getCountryConfig(code);
  
  if (!countryConfig) {
    console.log(`❓ Unknown country: ${code} → fallback to ${FALLBACK_LANGUAGE}`);
    return FALLBACK_LANGUAGE;
  }
  
  // If it's a supported translation country, check if translations exist
  if (countryConfig.isSupported) {
    const hasTranslations = await checkTranslationExists(countryConfig.language);
    
    if (hasTranslations) {
      console.log(`✅ Country ${code} → ${countryConfig.language} (native translations)`);
      return countryConfig.language;
    } else {
      console.log(`⚠️ Country ${code} configured for ${countryConfig.language} but translations missing → fallback to ${FALLBACK_LANGUAGE}`);
      return FALLBACK_LANGUAGE;
    }
  }
  
  // For unsupported countries, always use fallback language
  console.log(`🌍 Unsupported country ${code} → ${FALLBACK_LANGUAGE} (fallback)`);
  return FALLBACK_LANGUAGE;
};

/**
 * Check if dynamic language support is available for a country
 * This allows adding new language support without code changes
 */
export const checkDynamicLanguageSupport = async (countryCode) => {
  if (!countryCode) return null;
  
  const code = countryCode.toLowerCase();
  
  // ⚡ PERFORMANCE OPTIMIZATION: Only check for languages that might actually exist
  // Skip this check for now since we only have 3 languages
  const potentialLanguages = [];
  
  // If we add more languages in the future, add them to ACTUALLY_AVAILABLE_LANGUAGES first
  for (const lang of potentialLanguages) {
    if (ACTUALLY_AVAILABLE_LANGUAGES.includes(lang)) {
      const hasTranslations = await checkTranslationExists(lang);
      if (hasTranslations) {
        console.log(`🚀 Dynamic language support detected: ${code} → ${lang}`);
        return lang;
      }
    }
  }
  
  return null;
};

/**
 * Get complete country configuration with dynamic language detection
 */
export const getEnhancedCountryConfig = async (countryCode) => {
  const baseConfig = getCountryConfig(countryCode);
  
  if (!baseConfig) {
    return null;
  }
  
  // Check for dynamic language support for unsupported countries
  if (!baseConfig.isSupported) {
    const dynamicLanguage = await checkDynamicLanguageSupport(countryCode);
    
    if (dynamicLanguage) {
      return {
        ...baseConfig,
        language: dynamicLanguage,
        isSupported: true,
        isDynamic: true,
        fallbackLanguage: FALLBACK_LANGUAGE
      };
    }
  }
  
  // For supported countries, verify translations still exist
  if (baseConfig.isSupported) {
    const hasTranslations = await checkTranslationExists(baseConfig.language);
    
    if (!hasTranslations) {
      return {
        ...baseConfig,
        language: FALLBACK_LANGUAGE,
        isSupported: false,
        fallbackLanguage: FALLBACK_LANGUAGE,
        error: 'Configured translations not found'
      };
    }
  }
  
  return baseConfig;
};

/**
 * Clear translation cache (useful for development/testing)
 */
export const clearTranslationCache = () => {
  translationCache = {};
  lastCacheUpdate = 0;
  console.log('🗑️ Translation cache cleared');
};

/**
 * Get language switcher options with dynamic support
 */
export const getLanguageSwitcherOptions = async (currentCountry = 'se') => {
  const availableTranslations = await getAvailableTranslations();
  
  // Map available translations to country options
  const options = [];
  
  // Always include core supported countries if they have translations
  if (availableTranslations.includes('sv-SE')) {
    options.push({ countryCode: 'se', language: 'sv-SE', name: 'Svenska', flag: '🇸🇪' });
  }
  
  if (availableTranslations.includes('en-GB')) {
    options.push({ countryCode: 'gb', language: 'en-GB', name: 'English (UK)', flag: '🇬🇧' });
  }
  
  if (availableTranslations.includes('en-US')) {
    options.push({ countryCode: 'us', language: 'en-US', name: 'English (US)', flag: '🇺🇸' });
  }
  
  // Add current country if not already included and not in main options
  if (currentCountry && !options.find(opt => opt.countryCode === currentCountry.toLowerCase())) {
    const currentConfig = getCountryConfig(currentCountry);
    if (currentConfig) {
      options.push({
        countryCode: currentCountry.toLowerCase(),
        language: FALLBACK_LANGUAGE,
        name: currentConfig.name,
        flag: '🌍', // Generic flag for unsupported countries
        isFallback: true
      });
    }
  }
  
  return options;
}; 