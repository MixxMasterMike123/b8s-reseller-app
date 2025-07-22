import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import AppLayout from '../components/layout/AppLayout';
import TrainingModal from '../components/TrainingModal';
import { 
  ShoppingCartIcon, 
  DocumentTextIcon, 
  CogIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  CubeIcon,
  PresentationChartBarIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { userData, currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isTrainingModalOpen, setIsTrainingModalOpen] = React.useState(false);

  // Debug info
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];

  // Detect if user is on mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleTrainingClick = () => {
    if (isMobile()) {
      // Redirect mobile users to training pages
      navigate('/training/step/1');
    } else {
      // Open modal for desktop users
      setIsTrainingModalOpen(true);
    }
  };

  const handleTrainingComplete = () => {
    console.log(t('dashboard.training_completed', 'Training completed!'));
    // TODO: Save completion to user profile
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Training Button */}
        <div className="flex justify-center">
          <button
            onClick={handleTrainingClick}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-base rounded-lg hover:bg-blue-700 transition-colors"
          >
            <AcademicCapIcon className="h-5 w-5 mr-2" />
            Viktig information till butikspersonal
          </button>
        </div>

        {/* Hero Banner - Clean */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <img 
            src="/images/b8s_top.webp" 
            alt={t('dashboard.b8shield_banner_alt', 'B8Shield Banner')}
            className="w-full h-32 md:h-48 lg:h-64 object-cover"
          />
        </div>

        {/* Welcome Section - Dashboard Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-200">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              {t('dashboard.welcome', 'Återförsäljarportal')}
            </h1>
            <p className="mt-1 text-sm md:text-sm text-gray-600">
              {t('dashboard.company_subtitle', 'JPH Innovation AB - B8Shield')}
            </p>
          </div>
          
          <div className="px-4 md:px-6 py-4 md:py-5">
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="mb-4 text-base md:text-sm">
                {t('dashboard.welcome_text', 'Välkommen till vår återförsäljarportal – ett verktyg för att göra ert samarbete med oss så smidigt som möjligt.')}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-base md:text-sm font-medium text-gray-900 mb-3">
                  {t('dashboard.features', 'Funktioner:')}
                </h3>
                <ul className="space-y-3 md:space-y-2 text-sm md:text-sm">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 md:h-4 md:w-4 text-green-600 mr-3 md:mr-2 mt-0.5 flex-shrink-0" />
                    <span>{t('dashboard.feature_orders', 'Lägga beställningar direkt')}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 md:h-4 md:w-4 text-green-600 mr-3 md:mr-2 mt-0.5 flex-shrink-0" />
                    <span>{t('dashboard.feature_history', 'Överblick över orderhistorik')}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 md:h-4 md:w-4 text-green-600 mr-3 md:mr-2 mt-0.5 flex-shrink-0" />
                    <span>{t('dashboard.feature_catalog', 'Bläddra i produktkatalog')}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 md:h-4 md:w-4 text-green-600 mr-3 md:mr-2 mt-0.5 flex-shrink-0" />
                    <span>{t('dashboard.feature_materials', 'Ladda ner marknadsföringsmaterial')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards - Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Link
            to="/order"
            className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">
                {t('order.title', 'Lägg en beställning')}
              </h3>
            </div>
            <p className="text-sm text-gray-600">{t('dashboard.order_description', 'Skapa en ny beställning för dina kunder')}</p>
          </Link>
          
          <Link
            to="/orders"
            className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">
                {t('order.history', 'Orderhistorik')}
              </h3>
            </div>
            <p className="text-sm text-gray-600">{t('dashboard.history_description', 'Visa och spåra dina tidigare beställningar')}</p>
          </Link>

          <Link
            to="/products"
            className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <CubeIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">
                {t('product.catalog', 'Produktkatalog')}
              </h3>
            </div>
            <p className="text-sm text-gray-600">{t('dashboard.catalog_description', 'Bläddra och ladda ner produktinformation')}</p>
          </Link>

          <Link
            to="/marketing"
            className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group min-h-[88px] md:min-h-0"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                <PresentationChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">
                {t('nav.marketing', 'Marknadsföringsmaterial')}
              </h3>
            </div>
            <p className="text-sm text-gray-600">{t('dashboard.marketing_description', 'Ladda ner broschyrer och marknadsföringsmaterial')}</p>
          </Link>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800 text-white rounded-lg p-4">
          <div className="flex items-center mb-3">
            <PhoneIcon className="h-5 w-5 text-gray-300 mr-2" />
            <h3 className="text-base font-medium">{t('dashboard.contact_title', 'Kontaktuppgifter')}</h3>
          </div>
          
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-200">{t('dashboard.company_name', 'JPH Innovation AB')}</p>
            <p className="text-gray-300">{t('dashboard.company_address_1', 'Östergatan 30 C')}</p>
            <p className="text-gray-300">{t('dashboard.company_address_2', '152 43 Södertälje')}</p>
            <p className="text-gray-300">{t('dashboard.company_country', 'SWEDEN')}</p>
            <p className="mt-2">
                              <a href="mailto:info@jphinnovation.se" className="text-blue-300 hover:text-blue-200 underline">
                  {t('dashboard.company_email', 'info@jphinnovation.se')}
              </a>
            </p>
          </div>
        </div>
      </div>
      
      {/* Training Modal */}
      <TrainingModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        onComplete={handleTrainingComplete}
      />
    </AppLayout>
  );
};

export default DashboardPage; 