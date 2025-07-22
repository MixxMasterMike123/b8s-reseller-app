/**
 * Language + Currency Selector for B2C Shop
 * Beautiful dropdown selector that allows users to override geo-detected language and currency
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChevronDownIcon, CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useLanguageCurrency } from '../../contexts/LanguageCurrencyContext';
import { 
  getCountryConfig,
  getSuggestedCountries,
  getAllAvailableCountries 
} from '../../utils/internationalCountries';
import { getLanguageSwitcherOptions } from '../../utils/translationDetection';

const LanguageCurrencySelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ vertical: 'bottom', horizontal: 'right' }); // { vertical: 'top'|'bottom', horizontal: 'left'|'right' }
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { countryCode: urlCountryCode } = useParams();
  const { 
    language, 
    currency, 
    selectLanguage,
    getDisplayInfo,
    isLoading 
  } = useLanguageCurrency();

  // Load available language options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await getLanguageSwitcherOptions(urlCountryCode || 'se');
        setAvailableOptions(options);
      } catch (error) {
        console.error('Error loading language options:', error);
        // Fallback to basic options
        setAvailableOptions([
          { countryCode: 'se', language: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
          { countryCode: 'gb', language: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
          { countryCode: 'us', language: 'en-US', name: 'English (US)', flag: '🇺🇸' }
        ]);
      }
    };

    loadOptions();
  }, [urlCountryCode]);

  // Handle window resize to recalculate dropdown position
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        const position = calculateDropdownPosition();
        setDropdownPosition(position);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleCountrySelection = async (targetCountryCode, targetLanguage) => {
    console.log('🔄 Country/Language selection:', targetCountryCode, '→', targetLanguage);
    
    // Get current path without country prefix
    const currentPath = location.pathname;
    const pathSegments = currentPath.split('/').filter(Boolean);
    
    // Remove current country from path if it exists
    const validCountries = getAllAvailableCountries().map(c => c.countryCode);
    const currentCountry = pathSegments[0];
    
    const pathWithoutCountry = validCountries.includes(currentCountry) 
      ? '/' + pathSegments.slice(1).join('/')
      : currentPath;
    
    // Construct new URL with target country
    const newPath = `/${targetCountryCode}${pathWithoutCountry === '/' ? '' : pathWithoutCountry}`;
    
    console.log(`🌍 Navigation: ${currentPath} → ${newPath}`);
    
    // Navigate to new country URL first
    navigate(newPath);
    
    // Update context state (will be overridden by URL detection)
    try {
      await selectLanguage(targetLanguage);
      console.log('✅ Language/Country selection successful');
    } catch (error) {
      console.error('❌ Language selection failed:', error);
    }
    
    setIsOpen(false);
  };

  const getCurrentCountryData = () => {
    const currentCountry = urlCountryCode || 'se';
    return getCountryConfig(currentCountry) || {
      countryCode: currentCountry,
      name: 'Unknown',
      currency: 'SEK',
      language: 'sv-SE'
    };
  };

  const currentCountryData = getCurrentCountryData();
  const displayInfo = getDisplayInfo();

  // Calculate optimal dropdown position based on viewport boundaries
  const calculateDropdownPosition = () => {
    if (!containerRef.current) return { vertical: 'bottom', horizontal: 'right' };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = 400; // Approximate height of dropdown
    const dropdownWidth = viewportWidth < 640 ? 256 : 288; // w-64 on mobile, w-72 on desktop
    
    // Check vertical positioning
    const spaceBelow = viewportHeight - containerRect.bottom;
    const spaceAbove = containerRect.top;
    
    // Check horizontal positioning
    const spaceRight = viewportWidth - containerRect.right;
    const spaceLeft = containerRect.left;
    
    // Determine vertical position
    let vertical = 'bottom';
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      vertical = 'top';
    } else if (spaceBelow < dropdownHeight && spaceAbove < dropdownHeight) {
      vertical = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
    
    // Determine horizontal position
    let horizontal = 'right';
    if (spaceRight < dropdownWidth && spaceLeft > dropdownWidth) {
      horizontal = 'left';
    } else if (spaceRight < dropdownWidth && spaceLeft < dropdownWidth) {
      horizontal = spaceLeft > spaceRight ? 'left' : 'right';
    }
    
    // For very small screens, center the dropdown if both sides are constrained
    if (viewportWidth < 400 && spaceRight < dropdownWidth && spaceLeft < dropdownWidth) {
      horizontal = 'center';
    }
    
    return { vertical, horizontal };
  };

  // Update dropdown position when opening
  const handleToggleDropdown = () => {
    if (!isOpen) {
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
    }
    setIsOpen(!isOpen);
  };

  // Get country flag emoji
  const getCountryFlag = (countryCode) => {
    const flagMap = {
      'se': '🇸🇪', 'gb': '🇬🇧', 'us': '🇺🇸', 'de': '🇩🇪', 'fr': '🇫🇷', 
      'es': '🇪🇸', 'it': '🇮🇹', 'nl': '🇳🇱', 'dk': '🇩🇰', 'no': '🇳🇴',
      'fi': '🇫🇮', 'au': '🇦🇺', 'ca': '🇨🇦', 'jp': '🇯🇵', 'kr': '🇰🇷',
      'cn': '🇨🇳', 'br': '🇧🇷', 'mx': '🇲🇽', 'ar': '🇦🇷', 'cl': '🇨🇱',
      'in': '🇮🇳', 'sg': '🇸🇬', 'my': '🇲🇾', 'th': '🇹🇭', 'id': '🇮🇩',
      'ph': '🇵🇭', 'vn': '🇻🇳', 'tw': '🇹🇼', 'hk': '🇭🇰', 'nz': '🇳🇿',
      'za': '🇿🇦', 'ng': '🇳🇬', 'eg': '🇪🇬', 'ae': '🇦🇪', 'sa': '🇸🇦',
      'il': '🇮🇱', 'tr': '🇹🇷', 'ru': '🇷🇺', 'ua': '🇺🇦', 'pl': '🇵🇱',
      'cz': '🇨🇿', 'hu': '🇭🇺', 'ro': '🇷🇴', 'bg': '🇧🇬', 'hr': '🇭🇷',
      'ch': '🇨🇭', 'at': '🇦🇹', 'be': '🇧🇪', 'pt': '🇵🇹', 'gr': '🇬🇷',
      'ie': '🇮🇪', 'lu': '🇱🇺', 'mt': '🇲🇹', 'cy': '🇨🇾', 'ee': '🇪🇪',
      'lv': '🇱🇻', 'lt': '🇱🇹', 'si': '🇸🇮', 'sk': '🇸🇰'
    };
    return flagMap[countryCode] || '🌍';
  };

  const getLanguageName = (langCode) => {
    const nameMap = {
      'sv-SE': 'Svenska',
      'en-GB': 'English (UK)', 
      'en-US': 'English (US)',
      'de-DE': 'Deutsch',
      'fr-FR': 'Français',
      'es-ES': 'Español',
      'it-IT': 'Italiano',
      'da-DK': 'Dansk',
      'no-NO': 'Norsk',
      'fi-FI': 'Suomi',
      'nl-NL': 'Nederlands',
      'pt-PT': 'Português',
      'pl-PL': 'Polski',
      'ru-RU': 'Русский',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
      'zh-CN': '中文'
    };
    return nameMap[langCode] || 'English';
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-400">
        <div className="animate-pulse">
          <GlobeAltIcon className="h-4 w-4" />
        </div>
        <span className="hidden sm:block">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggleDropdown}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-lg">{getCountryFlag(currentCountryData.countryCode)}</span>
        <div className="hidden sm:block text-left">
          <div className="font-medium">{getLanguageName(language)}</div>
          <div className="text-xs text-gray-500">{currency}</div>
        </div>
        <div className="sm:hidden">
          <span className="font-semibold">{currency}</span>
        </div>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - Compact Design */}
          <div 
            ref={dropdownRef}
            className={`absolute w-64 sm:w-72 min-w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto ${
              dropdownPosition.vertical === 'top' 
                ? 'bottom-full mb-2' 
                : 'top-full mt-2'
            } ${
              dropdownPosition.horizontal === 'left'
                ? 'right-0'
                : dropdownPosition.horizontal === 'center'
                ? 'left-1/2 transform -translate-x-1/2'
                : 'left-0'
            }`}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-900 mb-1">
                Choose Country & Language
              </h3>
              <p className="text-xs text-gray-500">
                {currentCountryData.name} • {displayInfo.detectionSource}
              </p>
            </div>
            
            {/* Current Selection (at top) */}
            {availableOptions.some(option => option.isFallback) && (
              <div className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border-b border-green-100">
                  ✓ Current Selection
                </div>
                
                {availableOptions.filter(option => option.isFallback).map((option) => {
                  const countryConfig = getCountryConfig(option.countryCode);
                  
                  return (
                    <div
                      key={`${option.countryCode}-current`}
                      className="w-full flex items-center px-3 py-2 bg-green-50 border-b border-green-100"
                    >
                      <span className="text-base mr-2">{getCountryFlag(option.countryCode)}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-green-900">{option.name}</div>
                        <div className="text-xs text-green-700">
                          English interface • {countryConfig?.currency || 'Unknown'} pricing
                        </div>
                      </div>
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Other Language Options */}
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Other Languages
              </div>
              
              {availableOptions.filter(option => !option.isFallback).map((option) => {
                const isSelected = option.countryCode === urlCountryCode && option.language === language && !availableOptions.some(opt => opt.isFallback);
                const countryConfig = getCountryConfig(option.countryCode);
                
                return (
                  <button
                    key={`${option.countryCode}-${option.language}`}
                    onClick={() => handleCountrySelection(option.countryCode, option.language)}
                    className={`
                      w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 transition-colors
                      ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-700'}
                    `}
                  >
                    <span className="text-base mr-2">{getCountryFlag(option.countryCode)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{option.name}</div>
                      <div className="text-xs text-gray-500">
                        {countryConfig?.name || 'Unknown'} • {countryConfig?.currency || 'Unknown'}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Footer - Compact Info */}
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-600">
                🌍 International E-commerce • 200+ Countries
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageCurrencySelector; 