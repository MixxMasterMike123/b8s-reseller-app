/**
 * Content Language Indicator Component
 * 
 * Shows the current language being edited and translation status for content fields.
 * Provides visual feedback about completion status and missing translations.
 */

import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

const ContentLanguageIndicator = ({ contentField, label, className = '', currentValue = null }) => {
  const { currentLanguage, getAvailableLanguages } = useTranslation();
  
  // Get language display info
  const getLanguageInfo = (langCode) => {
    const languages = {
      'sv-SE': { name: 'Svenska', flag: '🇸🇪', color: 'blue' },
      'en-GB': { name: 'English (UK)', flag: '🇬🇧', color: 'green' },
      'en-US': { name: 'English (US)', flag: '🇺🇸', color: 'purple' }
    };
    return languages[langCode] || { name: langCode, flag: '🌐', color: 'gray' };
  };
  
  // Get completion status
  const getCompletionStatus = (contentField) => {
    if (!contentField) return { completed: 0, total: 3, percentage: 0 };
    
    const supportedLanguages = ['sv-SE', 'en-GB', 'en-US'];
    let completed = 0;
    
    if (typeof contentField === 'string') {
      // Old format - only Swedish
      completed = contentField.length > 0 ? 1 : 0;
    } else if (typeof contentField === 'object') {
      // New multilingual format
      completed = supportedLanguages.filter(lang => 
        contentField[lang] && contentField[lang].length > 0
      ).length;
    }
    
    return {
      completed,
      total: supportedLanguages.length,
      percentage: Math.round((completed / supportedLanguages.length) * 100)
    };
  };
  
  // Check if current language has content
  const hasCurrentLanguageContent = () => {
    // If currentValue is provided (real-time editing), use that
    if (currentValue !== null) {
      return currentValue && currentValue.length > 0;
    }
    
    if (!contentField) return false;
    
    if (typeof contentField === 'string') {
      return currentLanguage === 'sv-SE' && contentField.length > 0;
    }
    
    if (typeof contentField === 'object') {
      return !!(contentField[currentLanguage] && contentField[currentLanguage].length > 0);
    }
    
    return false;
  };
  
  const currentLangInfo = getLanguageInfo(currentLanguage);
  const completionStatus = getCompletionStatus(contentField);
  const hasContent = hasCurrentLanguageContent();
  const needsTranslation = currentLanguage !== 'sv-SE' && !hasContent;
  
  return (
    <div className={`flex items-center justify-between mb-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        
        {/* Current Language Badge */}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          currentLangInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
          currentLangInfo.color === 'green' ? 'bg-green-100 text-green-800' :
          currentLangInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          <span className="mr-1">{currentLangInfo.flag}</span>
          {currentLangInfo.name}
        </span>
        
        {/* Content Status Badge */}
        {hasContent && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Innehåll finns
          </span>
        )}
        
        {needsTranslation && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            ⚠️ Behöver översättning
          </span>
        )}
      </div>
      
      {/* Completion Status */}
      <div className="flex items-center space-x-2">
        <div className="text-xs text-gray-500">
          {completionStatus.completed}/{completionStatus.total} språk
        </div>
        
        {/* Progress Bar */}
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              completionStatus.percentage === 100 ? 'bg-green-500' :
              completionStatus.percentage >= 66 ? 'bg-blue-500' :
              completionStatus.percentage >= 33 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${completionStatus.percentage}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 font-medium">
          {completionStatus.percentage}%
        </div>
      </div>
    </div>
  );
};

export default ContentLanguageIndicator; 