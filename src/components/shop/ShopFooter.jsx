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
            <div className="text-gray-400 text-sm" dangerouslySetInnerHTML={{
              __html: t('footer_company_address', 'JPH Innovation AB<br>Östergatan 30c<br>152 43 Södertälje')
            }} />
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
                <a href="mailto:info@jphinnovation.se" className="text-gray-300 hover:text-white transition-colors">
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
                <Link to={getCountryAwareUrl('leveransinformation')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_shipping_info', 'Leveransinformation')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('legal/returpolicy')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_returns', 'Returer & Ångerrätt')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('affiliate-registration')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_become_affiliate', 'Bli en affiliate')}
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
                <a href="mailto:info@jphinnovation.se" className="text-gray-300 hover:text-white transition-colors">
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
                <Link to={getCountryAwareUrl('legal/anvandarvillkor')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_terms', 'Användarvillkor')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('legal/integritetspolicy')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_privacy', 'Integritetspolicy')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('legal/cookie-policy')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_cookies', 'Cookie-policy')}
                </Link>
              </li>
              <li>
                <Link to={getCountryAwareUrl('legal/returpolicy')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_return_policy', 'Returpolicy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        {/* Social Media Follow Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col items-center gap-6 mb-8">
            <h3 className="text-lg font-semibold text-white">
              {t('footer_follow_us', 'Följ B8Shield')}
            </h3>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61562171136878&paipv=0&eav=AfZdnv5jaazitVOcWiybcoEUhM_X525qscf20PEP8l8ivKoQh17uTAiMZqiZhYBAdCU"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-blue-600 rounded-full transition-colors"
                title="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              
              {/* Instagram */}
              <a
                href="https://www.instagram.com/b8shield_official/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-pink-600 rounded-full transition-colors"
                title="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.52.204 5.015.388a6.5 6.5 0 0 0-2.346 1.527A6.5 6.5 0 0 0 1.142 4.26c-.184.505-.306 1.08-.34 2.027C.768 7.235.756 7.642.756 11.263c0 3.621.012 4.028.047 4.975.034.947.156 1.522.34 2.027a6.5 6.5 0 0 0 1.527 2.346 6.5 6.5 0 0 0 2.346 1.527c.505.184 1.08.306 2.027.34.947.035 1.354.047 4.975.047 3.621 0 4.028-.012 4.975-.047.947-.034 1.522-.156 2.027-.34a6.5 6.5 0 0 0 2.346-1.527 6.5 6.5 0 0 0 1.527-2.346c.184-.505.306-1.08.34-2.027.035-.947.047-1.354.047-4.975 0-3.621-.012-4.028-.047-4.975-.034-.947-.156-1.522-.34-2.027a6.5 6.5 0 0 0-1.527-2.346A6.5 6.5 0 0 0 16.982.388C16.477.204 15.902.082 14.955.048 14.009.013 13.602.001 9.981.001h2.036zm-.024 5.924a6.16 6.16 0 1 1 0 12.32 6.16 6.16 0 0 1 0-12.32zm0 10.163a4.002 4.002 0 1 0 0-8.005 4.002 4.002 0 0 0 0 8.005zm7.846-10.405a1.441 1.441 0 1 1-2.883 0 1.441 1.441 0 0 1 2.883 0z"/>
                </svg>
              </a>
              
              {/* YouTube */}
              <a
                href="https://www.youtube.com/@B8Shield"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-red-600 rounded-full transition-colors"
                title="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@b8shield"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-black rounded-full transition-colors"
                title="TikTok"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
              
              {/* Pinterest */}
              <a
                href="https://se.pinterest.com/b8shield/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-red-700 rounded-full transition-colors"
                title="Pinterest"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.342-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.017 0z"/>
                </svg>
              </a>
              
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/b8shield%E2%84%A2-snag-prevention-077196311/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-blue-700 rounded-full transition-colors"
                title="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              
              {/* Wikipedia */}
              <a
                href="https://sv.m.wikipedia.org/wiki/Anv%C3%A4ndare:B8Shield/B8shield"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-600 rounded-full transition-colors"
                title="Wikipedia"
              >
                <img 
                  src="/images/icons/wikipedia_logo.svg" 
                  alt="Wikipedia" 
                  className="w-5 h-5"
                  style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} // Makes it white
                />
              </a>
              
              {/* FishBrain */}
              <a
                href="https://fishbrain.com/anglers/B8Shield"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-blue-800 rounded-full transition-colors"
                title="FishBrain"
              >
                <img 
                  src="/images/icons/fishbrain_icon.svg" 
                  alt="FishBrain" 
                  className="w-5 h-5"
                  style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} // Makes it white
                />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
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