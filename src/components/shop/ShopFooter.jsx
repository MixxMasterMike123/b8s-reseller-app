import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCountryAwareUrl } from '../../utils/productUrls';
import { useTranslation } from '../../contexts/TranslationContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LanguageCurrencySelector from './LanguageCurrencySelector';

const ShopFooter = () => {
  const { t } = useTranslation();
  const { currentUser } = useSimpleAuth();
  const [isActiveAffiliate, setIsActiveAffiliate] = useState(false);
  const [affiliateCheckLoading, setAffiliateCheckLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  // Check if current user is an active affiliate
  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!currentUser?.email) {
        setIsActiveAffiliate(false);
        return;
      }
      
      try {
        setAffiliateCheckLoading(true);
        const affiliatesRef = collection(db, 'affiliates');
        const affiliateQuery = query(
          affiliatesRef, 
          where('email', '==', currentUser.email), 
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(affiliateQuery);
        setIsActiveAffiliate(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking affiliate status:', error);
        setIsActiveAffiliate(false);
      } finally {
        setAffiliateCheckLoading(false);
      }
    };

    checkAffiliateStatus();
  }, [currentUser]);

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">B8Shield</h3>
            <p className="text-gray-300 text-sm mb-4">
              {t('footer_company_description', 'Professionellt skydd för dina fiskedon. Utvecklat av JPH Innovation AB för att maximera din framgång på vattnet.')}
            </p>
            <div className="text-gray-400 text-sm">
              <p>JPH Innovation AB</p>
              <p>Östergatan 30c</p>
              <p>152 43 Södertälje</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer_quick_links', 'Snabblänkar')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={getCountryAwareUrl('')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_home', 'Hem')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('cart')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_cart', 'Varukorg')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('account')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_my_account', 'Mitt konto')}
                </Link>
              </li>
              <li>
                <a href="mailto:info@b8shield.com" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_contact', 'Kontakt')}
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer_customer_service', 'Kundservice & Info')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={getCountryAwareUrl('shipping')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_shipping_info', 'Leveransinformation')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('returns')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_returns', 'Returer & Ångerrätt')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('affiliate-registration')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_become_affiliate', 'Bli en affiliate')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('affiliate-login')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_affiliate_login', 'Affiliate-inloggning')}
                </Link>
              </li>
              <li>
                <Link 
                  to={getCountryAwareUrl(isActiveAffiliate ? 'affiliate-portal' : 'affiliate-login')} 
                  className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                  {affiliateCheckLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent mr-2"></span>
                      {t('footer_affiliate_checking', 'Kontrollerar...')}
                    </>
                  ) : (
                    <>
                      {isActiveAffiliate ? 
                        t('footer_affiliate_portal', 'Affiliate-portal') : 
                        t('footer_affiliate_login', 'Affiliate-inloggning')
                      }
                      {isActiveAffiliate && (
                        <span className="ml-2 text-green-400 text-xs">●</span>
                      )}
                    </>
                  )}
                </Link>
              </li>
              <li>
                <a href="mailto:info@b8shield.com" className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_customer_support', 'Kundtjänst')}
                </a>
              </li>
              <li>
                <span className="text-gray-400">
                  {t('footer_business_hours', 'Mån-Fre: 09:00-17:00')}
                </span>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer_legal', 'Juridiskt')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={getCountryAwareUrl('terms')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_terms', 'Användarvillkor')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('privacy')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_privacy', 'Integritetspolicy')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('cookies')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_cookies', 'Cookie-policy')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('returns')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_return_policy', 'Returpolicy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              <p>{t('footer_copyright', '© {{year}} JPH Innovation AB. Alla rättigheter förbehållna.', { year: currentYear })}</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Nike-style Language/Currency Selector */}
              <div className="flex items-center">
                <LanguageCurrencySelector />
              </div>
              
              {/* Trust Badges */}
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="bg-green-600 text-white px-2 py-1 rounded">
                  {t('footer_badge_ssl', '✓ SSL')}
                </span>
                <span className="bg-blue-600 text-white px-2 py-1 rounded">
                  {t('footer_badge_gdpr', '✓ GDPR')}
                </span>
                <span className="bg-purple-600 text-white px-2 py-1 rounded">
                  {t('footer_badge_returns', '✓ 14 dagar ångerrätt')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Additional Legal Text */}
          <div className="mt-4 text-xs text-gray-500 text-center md:text-left">
            <p>
              {t('footer_legal_info', 'Organisationsnummer: {{orgNr}} | Registrerad för F-skatt | Medlem i Svensk Handel', { orgNr: '559123-4567' })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ShopFooter; 