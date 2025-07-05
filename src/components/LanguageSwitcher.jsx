import React, { useState } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const LanguageSwitcher = () => {
  const { currentLanguage, changeLanguage, getAvailableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = getAvailableLanguages();
  const currentLang = languages.find(lang => lang.code === currentLanguage);
  
  const handleLanguageChange = async (languageCode) => {
    // Update context
    await changeLanguage(languageCode);
    
    // Don't navigate - just change the language and stay on current page
    // The B8Shield system doesn't use language prefixes in URLs
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span>{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.name}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                  language.code === currentLanguage ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
                {language.code === currentLanguage && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
