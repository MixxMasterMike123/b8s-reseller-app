/**
 * Language + Currency Selector for B2C Shop
 * Beautiful dropdown selector that allows users to override geo-detected language and currency
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLanguageCurrency } from '../../contexts/LanguageCurrencyContext';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const LanguageCurrencySelector = ({ 
  className = '', 
  showFullDisplay = true,
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const {
    language,
    currency,
    availableLanguages,
    selectLanguage,
    getDisplayInfo,
    isLoading,
    detectionSource,
    countryDetected
  } = useLanguageCurrency();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle language selection
  const handleLanguageSelect = (languageCode) => {
    selectLanguage(languageCode);
    setIsOpen(false);
  };

  // Get current language info
  const currentLanguage = availableLanguages.find(lang => lang.code === language);
  
  // Size-specific classes
  const sizeClasses = {
    small: {
      button: 'px-2 py-1 text-sm',
      dropdown: 'text-sm',
      flag: 'text-sm',
      icon: 'w-3 h-3'
    },
    normal: {
      button: 'px-3 py-2 text-sm',
      dropdown: 'text-sm',
      flag: 'text-base',
      icon: 'w-4 h-4'
    },
    large: {
      button: 'px-4 py-3 text-base',
      dropdown: 'text-base',
      flag: 'text-lg',
      icon: 'w-5 h-5'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.normal;

  if (isLoading) {
    return (
      <div className={`inline-flex items-center ${currentSize.button} ${className}`}>
        <div className="animate-pulse">
          <GlobeAltIcon className={`${currentSize.icon} text-gray-400`} />
        </div>
        {showFullDisplay && (
          <span className="ml-2 text-gray-400">Loading...</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center justify-between
          ${currentSize.button}
          bg-white border border-gray-300 rounded-lg shadow-sm
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center">
          {/* Current Language Flag & Info */}
          {currentLanguage ? (
            <>
              <span className={`${currentSize.flag} mr-2`}>{currentLanguage.flag}</span>
              {showFullDisplay ? (
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {currentLanguage.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currency} • {detectionSource === 'geo-primary' ? countryDetected : 'Selected'}
                  </div>
                </div>
              ) : (
                <span className="font-medium text-gray-900">
                  {currentLanguage.flag} {currency}
                </span>
              )}
            </>
          ) : (
            <>
              <GlobeAltIcon className={`${currentSize.icon} text-gray-400 mr-2`} />
              <span className="text-gray-500">Select Language</span>
            </>
          )}
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDownIcon 
          className={`${currentSize.icon} text-gray-400 ml-2 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">
                Choose Language & Currency
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Currency automatically follows language selection
              </p>
            </div>

            {/* Language Options */}
            <div className="max-h-64 overflow-y-auto">
              {availableLanguages.map((lang) => {
                const isSelected = lang.code === language;
                
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`
                      w-full flex items-center px-4 py-3 text-left hover:bg-gray-50
                      transition-colors duration-150
                      ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                    `}
                  >
                    {/* Flag */}
                    <span className="text-lg mr-3">{lang.flag}</span>
                    
                    {/* Language & Currency Info */}
                    <div className="flex-1">
                      <div className={`${currentSize.dropdown} font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {lang.name}
                      </div>
                      <div className={`text-xs ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {lang.currency} • {lang.code}
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-600">
                💡 Based on your location: {countryDetected || 'Unknown'}
              </p>
              {detectionSource === 'geo-primary' && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Automatically detected from your country
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for mobile/small spaces
 */
export const CompactLanguageCurrencySelector = (props) => {
  return (
    <LanguageCurrencySelector 
      {...props}
      showFullDisplay={false}
      size="small"
      className={`${props.className || ''}`}
    />
  );
};

/**
 * Large version for hero sections
 */
export const LargeLanguageCurrencySelector = (props) => {
  return (
    <LanguageCurrencySelector 
      {...props}
      showFullDisplay={true}
      size="large"
      className={`${props.className || ''}`}
    />
  );
};

export default LanguageCurrencySelector; 