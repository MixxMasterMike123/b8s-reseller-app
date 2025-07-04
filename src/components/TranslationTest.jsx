import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

const TranslationTest = () => {
  const { t, currentLanguage } = useTranslation();
  
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold text-blue-900 mb-2">Translation System Test</h3>
      <p className="text-sm text-blue-800">
        Current Language: <span className="font-mono">{currentLanguage}</span>
      </p>
      <p className="text-sm text-blue-800">
        Test Translation: {t('test.welcome', 'Välkommen till B8Shield')}
      </p>
      <p className="text-xs text-blue-600 mt-2">
        ✅ Translation system is active and ready
      </p>
    </div>
  );
};

export default TranslationTest;
