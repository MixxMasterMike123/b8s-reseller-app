import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

const TranslationTest = () => {
  const { t, currentLanguage, changeLanguage, getAvailableLanguages } = useTranslation();

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">🇬🇧 Translation Test</h2>
      
      <div className="space-y-4">
        <div>
          <strong>Current Language:</strong> {currentLanguage}
        </div>
        
        <div>
          <strong>Available Languages:</strong>
          <div className="flex gap-2 mt-2">
            {getAvailableLanguages().map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-3 py-1 rounded text-sm ${
                  currentLanguage === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Translation Examples:</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Dashboard:</strong> {t('dashboard.welcome', 'Återförsäljarportal')}
            </div>
            <div>
              <strong>Features:</strong> {t('dashboard.features', 'Funktioner:')}
            </div>
            <div>
              <strong>Products:</strong> {t('product.catalog', 'Produktkatalog')}
            </div>
            <div>
              <strong>Orders:</strong> {t('order.title', 'Lägg en beställning')}
            </div>
            <div>
              <strong>Marketing:</strong> {t('nav.marketing', 'Marknadsföringsmaterial')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationTest;
