import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { 
  ShoppingCartIcon, 
  DocumentTextIcon, 
  CogIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  PhoneIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { userData, currentUser } = useAuth();

  // Debug info
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Debug Info - Subtle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center">
            <InformationCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-xs text-gray-600">
              B2B Mode: {hostname} | {subdomain}
            </span>
          </div>
        </div>

        {/* Hero Banner - Clean */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <img 
            src="/images/b8s_top.webp" 
            alt="B8Shield Banner" 
            className="w-full h-48 md:h-64 object-cover"
          />
        </div>

        {/* Welcome Section - Dashboard Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">
              Återförsäljarportal
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              JPH Innovation AB - B8Shield
            </p>
          </div>
          
          <div className="px-6 py-5">
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="mb-4">
                Välkommen till vår återförsäljarportal – ett verktyg för att göra ert samarbete med oss så smidigt som möjligt.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Funktioner:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Lägga beställningar direkt</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Överblick över orderhistorik</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Ladda ner marknadsföringsmaterial</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards - Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/order"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">Lägg beställning</h3>
            </div>
            <p className="text-sm text-gray-600">Skapa en ny beställning för dina kunder</p>
          </Link>
          
          <Link
            to="/orders"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="ml-3 text-base font-medium text-gray-900">Orderhistorik</h3>
            </div>
            <p className="text-sm text-gray-600">Visa och spåra dina tidigare beställningar</p>
          </Link>

          {userData?.role === 'admin' && (
            <Link
              to="/admin"
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <CogIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="ml-3 text-base font-medium text-gray-900">Administration</h3>
              </div>
              <p className="text-sm text-gray-600">Åtkomst till adminkontroller och inställningar</p>
            </Link>
          )}
        </div>

        {/* Store Staff Information - Dashboard Cards */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <MegaphoneIcon className="h-5 w-5 text-amber-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">
                Information för butikspersonal
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Introduction Card */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                B8Shield är en ny och unik produkt som löser problemet med att fastna i undervattensvegetation.
              </p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                <p className="text-sm text-amber-800 italic">
                  "Kunderna vet inte ännu vad B8Shield är eller vilket problem den löser"
                </p>
              </div>
            </div>

            {/* Key Actions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Viktiga åtgärder:
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="ml-3 text-sm text-gray-700">
                    <strong>Synlig placering:</strong> Ge produkten en central plats i butiken, gärna nära kassan.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="ml-3 text-sm text-gray-700">
                    <strong>Aktivt säljarbete:</strong> Förklara produkten för kunderna - utan detta uppmärksammas den inte.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="ml-3 text-sm text-gray-700">
                    <strong>Produktdemo:</strong> Lägg lösa B8Shields i en skål så kunder kan känna på produkten.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Explanation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Förklara produkten på 15 sekunder:
                </h3>
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <span>B8Shield hindrar fiskedrag från att fastna i undervattensvegetation.</span>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <p className="font-medium mb-2">Finns i 4 utföranden:</p>
                    <ul className="space-y-1 ml-4 text-xs">
                      <li>• <strong>Transparent:</strong> Naturliga färger</li>
                      <li>• <strong>Betesröd:</strong> Attraherar fisk</li>
                      <li>• <strong>Fluorescerande:</strong> För nattfiske</li>
                      <li>• <strong>Glitter:</strong> För stark solljus</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <span>Fästs på tre-krok. Passar krokstorlek 2, 4 och 6.</span>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Vanliga frågor:
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-3 bg-blue-50 py-2 rounded-r">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Kommer fisken sluta hugga?</h4>
                  <p className="text-xs text-blue-800">
                    Nej, B8Shield påverkar inte krokens förmåga att kroka fisk.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-400 pl-3 bg-green-50 py-2 rounded-r">
                  <h4 className="text-sm font-medium text-green-900 mb-1">Förstör det gången på draget?</h4>
                  <p className="text-xs text-green-800">
                    Nej, B8Shield är testad med många typer av drag. Ingen skillnad i gång.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-400 pl-3 bg-purple-50 py-2 rounded-r">
                  <h4 className="text-sm font-medium text-purple-900 mb-1">När ska man använda den?</h4>
                  <p className="text-xs text-purple-800">
                    När du fiskar där det finns undervattenshinder som vegetation eller stenar.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-800 text-white rounded-lg p-4">
              <div className="flex items-center mb-3">
                <PhoneIcon className="h-5 w-5 text-gray-300 mr-2" />
                <h3 className="text-base font-medium">Kontaktuppgifter</h3>
              </div>
              
              <div className="text-sm space-y-1">
                <p className="font-medium text-blue-200">JPH Innovation AB</p>
                <p className="text-gray-300">Östergatan 30 C</p>
                <p className="text-gray-300">152 43 Södertälje</p>
                <p className="text-gray-300">SWEDEN</p>
                <p className="mt-2">
                  <a href="mailto:info@b8shield.com" className="text-blue-300 hover:text-blue-200 underline">
                    info@b8shield.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage; 