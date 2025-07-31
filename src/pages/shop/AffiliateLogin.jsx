import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../contexts/TranslationContext';
import CustomerLogin from './CustomerLogin';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { getCountryAwareUrl, getAffiliateSeoTitle, getAffiliateSeoDescription } from '../../utils/productUrls';
import { Helmet } from 'react-helmet-async';

const AffiliateLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>{getAffiliateSeoTitle('login')}</title>
        <meta name="description" content={getAffiliateSeoDescription('login')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getAffiliateSeoTitle('login')} />
        <meta property="og:description" content={getAffiliateSeoDescription('login')} />
        <meta property="og:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={getAffiliateSeoTitle('login')} />
        <meta name="twitter:description" content={getAffiliateSeoDescription('login')} />
        <meta name="twitter:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
      </Helmet>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_affiliate_login', 'Affiliate-inloggning')} />
      
      {/* Desktop: Side-by-side layout, Mobile: Stacked */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('affiliate_login_title', 'Affiliate-inloggning')}
          </h1>
          <p className="text-gray-600">
            {t('affiliate_login_subtitle', 'Logga in för att komma åt din affiliate-portal')}
          </p>
        </div>
        
        {/* Desktop: Two columns, Mobile: Single column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          
          {/* Left Column: CTA for becoming an affiliate */}
          <div className="lg:pr-8">
            <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 h-full flex flex-col justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {t('affiliate_login_not_partner_yet', 'Inte partner än?')}
                </h2>
                <p className="text-gray-600 mb-8 text-lg">
                  {t('affiliate_login_join_program', 'Gå med i vårt affiliate-program och tjäna provision på varje försäljning.')}
                </p>
                
                {/* Benefits list */}
                <div className="text-left mb-8 space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{t('affiliate_login_benefit_commission', 'Tjäna provision på varje försäljning')}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{t('affiliate_login_benefit_materials', 'Få tillgång till marknadsföringsmaterial')}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{t('affiliate_login_benefit_tracking', 'Följ dina resultat i realtid')}</span>
                  </div>
                </div>
                
                <Link 
                  to={getCountryAwareUrl('affiliate-registration')} 
                  className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
                >
                  {t('affiliate_login_become_affiliate', 'Bli en B8Shield affiliate')}
                </Link>
              </div>
            </div>
          </div>
          
          {/* Right Column: Login form */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <CustomerLogin 
                onLoginSuccess={() => navigate(getCountryAwareUrl('affiliate-portal'))} 
                hideLanguageSwitcher={true}
                hideNavigation={true}
              />
              
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  {t('affiliate_login_not_affiliate', 'Inte en affiliate ännu?')}{' '}
                  <Link to={getCountryAwareUrl('affiliate-registration')} className="font-medium text-blue-600 hover:text-blue-500">
                    {t('affiliate_login_apply_here', 'Ansök här!')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <ShopFooter />
    </div>
    </>
  );
};

export default AffiliateLogin; 