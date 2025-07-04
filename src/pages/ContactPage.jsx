import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  ShoppingCartIcon, 
  ClipboardDocumentListIcon,
  CubeIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t('contact.header.title', '📞 Kontakt & Support')}
            </h1>
            <p className="text-xl text-blue-100">
              {t('contact.header.subtitle', 'Vi är här för att hjälpa er med alla era frågor och behov')}
            </p>
          </div>
        </div>

        {/* Main Contact Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Contact Details Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {t('contact.company.title', 'Företagsinformation')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-bold text-lg text-gray-800">JPH Innovation AB</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-700">Östergatan 30 C</p>
                  <p className="text-gray-700">152 43 Södertälje</p>
                  <p className="text-gray-700 font-semibold">SWEDEN</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <a 
                    href="mailto:info@b8shield.com" 
                    className="text-blue-600 hover:text-blue-800 font-semibold text-lg underline"
                  >
                    info@b8shield.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Support Information Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-8 h-8 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('contact.support.title', 'Support & Hjälp')}
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">{t('contact.support.email.title', '📧 E-post support')}</h3>
                <p className="text-green-700">
                  {t('contact.support.email.description', 'Skicka era frågor till')} <span className="font-semibold">info@b8shield.com</span> {t('contact.support.email.response', 'så återkommer vi så snart som möjligt')}.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                  </svg>
                  {t('contact.support.technical.title', 'Teknisk support')}
                </h3>
                <p className="text-blue-700">
                  {t('contact.support.technical.description', 'Behöver ni hjälp med portalen eller har tekniska frågor? Vi hjälper er gärna!')}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  {t('contact.support.product.title', 'Produktfrågor')}
                </h3>
                <p className="text-purple-700">
                  {t('contact.support.product.description', 'Frågor om B8Shield produkter, priser eller leveranser hanteras via samma e-post')}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('contact.hours.title', '🕒 Öppettider & Svarstider')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('contact.hours.contact.title', 'Kontakttider')}</h3>
              <p className="text-gray-600">
                {t('contact.hours.contact.days', 'Måndag - Fredag')}<br />
                {t('contact.hours.contact.time', '08:00 - 17:00')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('contact.hours.response.title', 'Svarstid E-post')}</h3>
              <p className="text-gray-600">
                {t('contact.hours.response.time', 'Vanligtvis inom')}<br />
                {t('contact.hours.response.duration', '24 timmar')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Navigation - Same as Dashboard */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('contact.quicklinks.title', '🔗 Snabblänkar')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Link
              to="/order"
              className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-3 text-base font-medium text-gray-900">{t('contact.quicklinks.order.title', 'Lägg en beställning')}</h3>
              </div>
              <p className="text-sm text-gray-600">{t('contact.quicklinks.order.description', 'Skapa en ny beställning för dina kunder')}</p>
            </Link>
            
            <Link
              to="/orders"
              className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-base font-medium text-gray-900">{t('contact.quicklinks.orders.title', 'Orderhistorik')}</h3>
              </div>
              <p className="text-sm text-gray-600">{t('contact.quicklinks.orders.description', 'Visa och spåra dina tidigare beställningar')}</p>
            </Link>

            <Link
              to="/products"
              className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <CubeIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="ml-3 text-base font-medium text-gray-900">{t('contact.quicklinks.products.title', 'Produktkatalog')}</h3>
              </div>
              <p className="text-sm text-gray-600">{t('contact.quicklinks.products.description', 'Bläddra och ladda ner produktinformation')}</p>
            </Link>

            <Link
              to="/marketing"
              className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <PresentationChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="ml-3 text-base font-medium text-gray-900">{t('contact.quicklinks.marketing.title', 'Marknadsföringsmaterial')}</h3>
              </div>
              <p className="text-sm text-gray-600">{t('contact.quicklinks.marketing.description', 'Ladda ner broschyrer och marknadsföringsmaterial')}</p>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContactPage; 