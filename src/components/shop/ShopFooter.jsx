import React from 'react';
import { Link } from 'react-router-dom';
import { getCountryAwareUrl } from '../../utils/productUrls';
import { useTranslation } from '../../contexts/TranslationContext';

const ShopFooter = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

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
                <Link to={getCountryAwareUrl('affiliate-portal')} className="text-gray-300 hover:text-white transition-colors">
                  {t('footer_affiliate_portal', 'Affiliate-portal')}
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
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              <p>{t('footer_copyright', '© {{year}} JPH Innovation AB. Alla rättigheter förbehållna.', { year: currentYear })}</p>
            </div>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
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