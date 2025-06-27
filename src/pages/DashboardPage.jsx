import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import TrainingModal from '../components/TrainingModal';
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
  ClipboardDocumentListIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { userData, currentUser } = useAuth();
  const [isTrainingModalOpen, setIsTrainingModalOpen] = React.useState(false);

  // Debug info
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];

  const handleTrainingComplete = () => {
    console.log('Training completed!');
    // TODO: Save completion to user profile
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Debug Info - Subtle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <InformationCircleIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-xs text-gray-600">
                B2B Mode: {hostname} | {subdomain}
              </span>
            </div>
            
            {/* TEST BUTTON for stakeholders */}
            <button
              onClick={() => setIsTrainingModalOpen(true)}
              className="flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              <AcademicCapIcon className="h-4 w-4 mr-1" />
              Testa Säljutbildning
            </button>
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
                B8Shield är en ny och unik produkt som löser ett vanligt problem för fiskare - att fastna i undervattensvegetation och andra undervattenshinder.
              </p>
              <p className="text-sm text-gray-700 mb-3">
                B8Shield är samtidigt en helt ny typ av både produkt och produktkategori.
              </p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r">
                <p className="text-sm text-amber-800 italic">
                  "Kunderna vet därför inte ännu vad B8Shield är eller vilket problem den löser, och därför söker man således inte aktivt efter B8Shield trots att man har problemet med att fastna"
                </p>
              </div>
            </div>

            {/* Key Actions */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Av den orsaken är det avgörande att ni:
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p className="ml-3 text-sm text-gray-700">
                    Ge butiksstället en synlig och central plats i butiken, gärna nära kassan.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p className="ml-3 text-sm text-gray-700">
                    Aktivt säljer och förklarar produkten för kunderna. Gör man inte det är sannolikheten stor att kunderna inte uppmärksammar produkten och därmed inte köper produkten vilket vare sig vi eller ni vinner på.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p className="ml-3 text-sm text-gray-700">
                    För att försäkra säljprocessen ytterligare skickar vi också med ett antal lösa B8Shields. Med fördel kan dessa läggas i en skål vid stället så att kund kan få klämma och känna på produkten.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-3 rounded-r">
                <p className="text-sm text-green-800 italic">
                  "När kunden dock väl förstår vad B8Shield är och gör, är den lätt att välja, men kunden måste förstå det först".
                </p>
              </div>
            </div>

            {/* Product Explanation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Så förklarar du produkten på 15 sekunder:
                </h3>
              </div>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <span>B8Shield hindrar fiskedrag från att fastna i undervattensvegetation och andra undervattenshinder.</span>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <p className="font-medium mb-2">B8Shield finns i 4 olika utföranden:</p>
                    <ul className="space-y-2 ml-4 text-xs">
                      <li>• <strong>TRANSPARENT.</strong> När man inte vill kompromissa med fiskedragets naturliga färger och utseende.</li>
                      <li>• <strong>BETESRÖD.</strong> Utnyttja den traditionella röda färgen på många betesfiskar för att attrahera mer fisk.</li>
                      <li>• <strong>FLUORESCERANDE.</strong> När du skall natt fiska och vill attrahera fiskar i grumliga eller mörka vatten.</li>
                      <li>• <strong>GLITTER.</strong> När man skall fiska i stark solljus hjälper dess gnistrande färg till med att attrahera mer fisk.</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <span>B8Shield fästs på tre-krok. Passat till krokstorlek 2, 4 och 6, där storlek 2 också passar på krokstorlek 1. Krokstorlek 1/0 och 2/0 kommer inom kort.</span>
                </div>
                
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <span>B8Shields är designad så att man enkelt kan växla den mellan olika drag vid behov.</span>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-base font-medium text-gray-900">
                  Vanliga frågor – och vad du svarar:
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 py-3 rounded-r">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Fråga 1: Kommer fisken sluta hugga?</h4>
                  <p className="text-xs text-blue-800">
                    <strong>Svar:</strong> Nej, B8Shield påverkar inte krokens förmåga att kroka fisk. Under ett bett flexar sköldens vingar för att exponera krokarna, vilket säkerställer en lyckad fångst. Du krokar helt enkelt fisken som vanligt.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-400 pl-4 bg-green-50 py-3 rounded-r">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Fråga 2: Förstör det gången på draget?</h4>
                  <p className="text-xs text-green-800">
                    <strong>Svar:</strong> Nej, B8Shield är testad med många typer av drag. Ingen skillnad i gång.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-400 pl-4 bg-purple-50 py-3 rounded-r">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">Fråga 3: När ska man använda den?</h4>
                  <p className="text-xs text-purple-800">
                    <strong>Svar:</strong> När du fiskar där det finns många undervattenhinder som ex. undervattensvegetation eller där det är stenigt, alltså där fisken ofta gömmer sig.
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