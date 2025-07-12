/**
 * Content Translation Hook
 * 
 * This hook extends the existing TranslationContext to handle content field translations.
 * It allows the same field (like "B2B Beskrivning") to have different language versions
 * that are automatically loaded/saved based on the current language context.
 */

import { useTranslation } from '../contexts/TranslationContext';

export const useContentTranslation = () => {
  const { currentLanguage } = useTranslation();
  
  // Safety check: Fallback to Swedish if currentLanguage is not yet initialized
  const safeCurrentLanguage = currentLanguage || 'sv-SE';
  
  /**
   * Get the value for a content field in the current language
   * @param {Object} contentField - The multilingual content field object
   * @param {string} fallbackLanguage - Language to fall back to (default: 'sv-SE')
   * @returns {string} The content value in the current language
   */
  const getContentValue = (contentField, fallbackLanguage = 'sv-SE') => {
    if (!contentField) return '';
    
    // If it's a simple string (backward compatibility)
    if (typeof contentField === 'string') {
      return contentField;
    }
    
    // If it's already a multilingual object
    if (typeof contentField === 'object') {
      // Try current language first
      if (contentField[safeCurrentLanguage]) {
        return contentField[safeCurrentLanguage];
      }
      
      // Fall back to fallback language
      if (contentField[fallbackLanguage]) {
        return contentField[fallbackLanguage];
      }
      
      // Fall back to any available language
      const availableLanguages = Object.keys(contentField);
      if (availableLanguages.length > 0) {
        return contentField[availableLanguages[0]];
      }
    }
    
    return '';
  };
  
  /**
   * Set the value for a content field in the current language
   * @param {Object} contentField - The current multilingual content field object
   * @param {string} value - The new value to set
   * @returns {Object} Updated multilingual content field object
   */
  const setContentValue = (contentField, value) => {
    // If contentField is null/undefined, create new object
    if (!contentField) {
      return { [safeCurrentLanguage]: value };
    }
    
    // If it's a simple string (backward compatibility), convert to multilingual
    if (typeof contentField === 'string') {
      return {
        'sv-SE': contentField, // Preserve original Swedish text
        [safeCurrentLanguage]: value
      };
    }
    
    // If it's already a multilingual object, update the current language
    if (typeof contentField === 'object') {
      return {
        ...contentField,
        [safeCurrentLanguage]: value
      };
    }
    
    return { [safeCurrentLanguage]: value };
  };
  
  /**
   * Get all available languages for a content field
   * @param {Object} contentField - The multilingual content field object
   * @returns {Array} Array of available language codes
   */
  const getAvailableLanguages = (contentField) => {
    if (!contentField || typeof contentField !== 'object') {
      return [];
    }
    
    return Object.keys(contentField);
  };
  
  /**
   * Check if a content field has a value in the current language
   * @param {Object} contentField - The multilingual content field object
   * @returns {boolean} True if the field has content in the current language
   */
  const hasContentInCurrentLanguage = (contentField) => {
    if (!contentField) return false;
    
    if (typeof contentField === 'string') {
      return safeCurrentLanguage === 'sv-SE' && contentField.length > 0;
    }
    
    if (typeof contentField === 'object') {
      return !!(contentField[safeCurrentLanguage] && contentField[safeCurrentLanguage].length > 0);
    }
    
    return false;
  };
  
  /**
   * Get completion status for a content field across all languages
   * @param {Object} contentField - The multilingual content field object
   * @param {Array} supportedLanguages - Array of language codes to check
   * @returns {Object} Completion status object
   */
  const getCompletionStatus = (contentField, supportedLanguages = ['sv-SE', 'en-GB', 'en-US']) => {
    const availableLanguages = getAvailableLanguages(contentField);
    const completedLanguages = availableLanguages.filter(lang => 
      contentField[lang] && contentField[lang].length > 0
    );
    
    return {
      total: supportedLanguages.length,
      completed: completedLanguages.length,
      missing: supportedLanguages.filter(lang => !completedLanguages.includes(lang)),
      percentage: Math.round((completedLanguages.length / supportedLanguages.length) * 100)
    };
  };
  
  /**
   * Create a language indicator component props object
   * @param {Object} contentField - The multilingual content field object
   * @returns {Object} Props for language indicator component
   */
  const getLanguageIndicatorProps = (contentField) => {
    const hasContent = hasContentInCurrentLanguage(contentField);
    const completion = getCompletionStatus(contentField);
    
    return {
      currentLanguage: safeCurrentLanguage,
      hasContent,
      completion,
      isEmpty: !hasContent,
      isTranslated: safeCurrentLanguage !== 'sv-SE' && hasContent,
      needsTranslation: safeCurrentLanguage !== 'sv-SE' && !hasContent
    };
  };

  /**
   * SMART WRAPPER: Automatically handles both old string and new multilingual content
   * This function can be used as a drop-in replacement for direct content access
   * @param {Object|string} content - Any content field (string or multilingual object)
   * @returns {string} The content in the current language
   */
  const smartContent = (content) => {
    return getContentValue(content);
  };

  /**
   * BATCH CONTENT GETTER: Get multiple content fields at once
   * @param {Object} contentObject - Object containing multiple content fields
   * @param {Array} fieldNames - Array of field names to extract
   * @returns {Object} Object with extracted content in current language
   */
  const getBatchContent = (contentObject, fieldNames) => {
    const result = {};
    if (!contentObject) return result;
    
    fieldNames.forEach(fieldName => {
      const fieldValue = contentObject[fieldName];
      result[fieldName] = getContentValue(fieldValue);
    });
    
    return result;
  };

  /**
   * RENDER HELPER: Returns JSX-safe content or fallback
   * @param {Object|string} content - Content field
   * @param {string} fallback - Fallback text if content is empty
   * @returns {string} Safe content for rendering
   */
  const renderContent = (content, fallback = '') => {
    const value = getContentValue(content);
    return value || fallback;
  };

  /**
   * PRODUCT HELPER: Extract common product fields automatically
   * @param {Object} product - Product object
   * @returns {Object} Product with extracted multilingual content
   */
  const getProductContent = (product) => {
    if (!product) return {};
    
    return {
      ...product,
      // Extract common multilingual fields
      b2bDescription: getContentValue(product.descriptions?.b2b),
      b2cDescription: getContentValue(product.descriptions?.b2c),
      b2cMoreInfo: getContentValue(product.descriptions?.b2cMoreInfo),
      generalDescription: getContentValue(product.description),
      displayName: getContentValue(product.displayName) || product.name,
      // Helper for choosing best description
      bestDescription: getContentValue(product.descriptions?.b2b) || 
                       getContentValue(product.descriptions?.b2c) || 
                       getContentValue(product.description) || ''
    };
  };
  
  return {
    currentLanguage,
    getContentValue,
    setContentValue,
    getAvailableLanguages,
    hasContentInCurrentLanguage,
    getCompletionStatus,
    getLanguageIndicatorProps,
    // Smart wrapper functions
    smartContent,
    getBatchContent,
    renderContent,
    getProductContent
  };
}; 