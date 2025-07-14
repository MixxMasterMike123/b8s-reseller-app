import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import CustomerLogin from './CustomerLogin';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';

const AffiliateLogin = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_affiliate_login', 'Affiliate-inloggning')} />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('affiliate_login_title', 'Affiliate-inloggning')}
          </h1>
          <p className="text-gray-600">
            {t('affiliate_login_subtitle', 'Logga in för att komma åt din affiliate-portal')}
          </p>
        </div>
        
        <CustomerLogin onLoginSuccess={() => window.location.href = '/affiliate-portal'} />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {t('affiliate_login_not_affiliate', 'Inte en affiliate ännu?')}{' '}
            <Link to="/affiliate-registration" className="font-medium text-blue-600 hover:text-blue-500">
              {t('affiliate_login_apply_here', 'Ansök här!')}
            </Link>
          </p>
        </div>
      </div>
      
      <ShopFooter />
    </div>
  );
};

export default AffiliateLogin; 