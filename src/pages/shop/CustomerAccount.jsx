import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';

const CustomerAccount = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('customer_account_title', 'Mitt Konto')}
            </h1>
            <p className="text-gray-600 mb-8">
              {t('customer_account_coming_soon', 'Kontofunktioner kommer snart...')}
            </p>
            <Link 
              to="/" 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('customer_account_back_to_shop', 'Tillbaka till butiken')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccount; 