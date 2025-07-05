import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import ShopCredentialLanguageSwitcher from '../../components/shop/ShopCredentialLanguageSwitcher';

const CustomerRegister = () => {
  const { t } = useTranslation();
  
  // Read from unified key first, then credential-specific key, then default to Swedish
  const getInitialLanguage = () => {
    const unifiedLang = localStorage.getItem('b8shield-language');
    if (unifiedLang) return unifiedLang;
    
    const credentialLang = localStorage.getItem('b8shield-credential-language');
    if (credentialLang) return credentialLang;
    
    return 'sv-SE';
  };
  
  const [currentLanguage, setCurrentLanguage] = React.useState(getInitialLanguage());
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-end mb-4">
            <ShopCredentialLanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('customer_register_title', 'Skapa konto')}
            </h1>
            <p className="text-gray-600 mb-8">
              {t('customer_register_coming_soon', 'Registrering kommer snart...')}
            </p>
            <div className="space-y-4">
              <Link 
                to="/" 
                className="block w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                {t('customer_register_back_to_shop', 'Tillbaka till butiken')}
              </Link>
              <Link 
                to="/login" 
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors text-center"
              >
                {t('customer_register_already_have_account', 'Har redan konto? Logga in')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister; 