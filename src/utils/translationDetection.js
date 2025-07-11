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
  
  // Check each supported language
  const languagesToCheck = [
    'sv-SE', // Swedish
    'en-GB', // English UK  
    'en-US', // English US
    'de-DE', // German
    'fr-FR', // French
    'es-ES', // Spanish
    'it-IT', // Italian
    'da-DK', // Danish
    'no-NO', // Norwegian
    'fi-FI', // Finnish
    'pl-PL', // Polish
    'nl-NL', // Dutch
    'pt-PT', // Portuguese
    'ru-RU', // Russian
    'ja-JP', // Japanese
    'ko-KR', // Korean
    'zh-CN'  // Chinese Simplified
  ];
  
  // Check each language in parallel for performance
  const checks = languagesToCheck.map(async (lang) => {
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
  
  console.log(`✅ Available translations detected:`, availableLanguages);
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
  
  // Map country codes to potential language codes
  const countryLanguageMap = {
    'de': 'de-DE',
    'fr': 'fr-FR', 
    'es': 'es-ES',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'ru': 'ru-RU',
    'dk': 'da-DK',
    'no': 'no-NO',
    'fi': 'fi-FI',
    'jp': 'ja-JP',
    'kr': 'ko-KR',
    'cn': 'zh-CN',
    'br': 'pt-BR' // Brazilian Portuguese
  };
  
  const potentialLanguage = countryLanguageMap[code];
  
  if (potentialLanguage) {
    const hasTranslations = await checkTranslationExists(potentialLanguage);
    
    if (hasTranslations) {
      console.log(`🚀 Dynamic language support detected: ${code} → ${potentialLanguage}`);
      return potentialLanguage;
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
  
  // Add dynamic language options
  const dynamicLanguageMap = {
    'de-DE': { countryCode: 'de', name: 'Deutsch', flag: '🇩🇪' },
    'fr-FR': { countryCode: 'fr', name: 'Français', flag: '🇫🇷' },
    'es-ES': { countryCode: 'es', name: 'Español', flag: '🇪🇸' },
    'it-IT': { countryCode: 'it', name: 'Italiano', flag: '🇮🇹' },
    'da-DK': { countryCode: 'dk', name: 'Dansk', flag: '🇩🇰' },
    'no-NO': { countryCode: 'no', name: 'Norsk', flag: '🇳🇴' },
    'fi-FI': { countryCode: 'fi', name: 'Suomi', flag: '🇫🇮' }
  };
  
  availableTranslations.forEach(lang => {
    if (dynamicLanguageMap[lang]) {
      options.push({
        ...dynamicLanguageMap[lang],
        language: lang
      });
    }
  });
  
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