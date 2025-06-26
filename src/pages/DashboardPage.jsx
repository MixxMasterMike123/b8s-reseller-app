import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';

const DashboardPage = () => {
  const { userData, currentUser } = useAuth();

  // Debug info
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Debug Info */}
        <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-4">
          <h3 className="text-sm font-medium text-green-800">Debug Info (B2B Reseller Mode)</h3>
          <p className="text-xs text-green-700">
            Hostname: {hostname} | Subdomain: {subdomain} | Full URL: {window.location.href}
          </p>
        </div>

        {/* Banner Image */}
        <div className="w-full mb-8">
          <img 
            src="/images/b8s_top.webp" 
            alt="B8Shield Banner" 
            className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Välkommen till JPH Innovations återförsäljarportal
            </h1>
            <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-gray-700 leading-relaxed">
            <p className="text-lg mb-6">
              Ni är nu inloggade i vår återförsäljarportal – ett verktyg skapat för att göra ert samarbete med oss så smidigt och effektivt som möjligt.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Här kan ni:</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">•</span>
                  <span className="text-gray-700">Lägga beställningar direkt</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">•</span>
                  <span className="text-gray-700">Få en överblick över er orderhistorik</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-3 mt-1">•</span>
                  <span className="text-gray-700">Ladda ner aktuellt marknadsmaterial för ert sälj- och kampanjarbete</span>
                </li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-600 pl-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Om B8Shield</h2>
              <p className="text-gray-700 mb-4">
                B8Shield är en svensk innovation som gör det möjligt att fiska fritt – även i tät vegetation – utan att kompromissa med känslan i fisket. Produkten minskar risken att fastna, vilket sparar både tid, frustration och kostnaden för förlorade drag. Det gör B8Shield till ett uppskattat hjälpmedel för såväl sportfiskare som fritidsfiskare.
              </p>
              <p className="text-gray-700">
                Vi utvecklar och förbättrar vårt material kontinuerligt. Har ni behov av specifikt säljstöd eller saknar något i portalen är ni alltid välkomna att kontakta oss – vi producerar själva allt innehåll och kan snabbt ta fram det ni behöver.
              </p>
            </div>

            <div className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
              <p className="text-lg font-medium">
                Tack för förtroendet – vi ser fram emot ett framgångsrikt samarbete.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Link
              to="/order"
              className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg rounded-lg p-6 hover:shadow-xl hover:from-green-600 hover:to-green-700 transition duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-lg font-semibold">Lägg en beställning</h3>
              </div>
              <p className="text-green-100">Skapa en ny beställning för dina kunder</p>
            </Link>
            
            <Link
              to="/order-history"
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg rounded-lg p-6 hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-3">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold">Orderhistorik</h3>
              </div>
              <p className="text-blue-100">Visa och spåra dina tidigare beställningar</p>
            </Link>

            {userData?.role === 'admin' && (
              <Link
                to="/admin"
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg rounded-lg p-6 hover:shadow-xl hover:from-purple-600 hover:to-purple-700 transition duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-3">
                  <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold">Admin Dashboard</h3>
                </div>
                <p className="text-purple-100">Få åtkomst till adminkontroller och inställningar</p>
              </Link>
            )}
          </div>
        </div>

        {/* Store Staff Information Section */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg shadow-lg p-8 border-l-4 border-orange-500">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-orange-800 mb-4">
              📢 Viktig info till butikspersonal
            </h2>
            <div className="w-32 h-1 bg-orange-500 mx-auto"></div>
          </div>

          <div className="max-w-5xl mx-auto space-y-8">
            {/* Introduction */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                B8Shield är en ny och unik produkt som löser ett vanligt problem för fiskare - att fastna i undervattensvegetation och andra undervattenshinder.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                B8Shield är samtidigt en helt ny typ av både produkt och produktkategori.
              </p>
              <div className="bg-orange-100 border-l-4 border-orange-400 p-4 rounded">
                <p className="text-orange-800 font-medium italic">
                  "Kunderna vet därför inte ännu vad B8Shield är eller vilket problem den löser, och därför söker man således inte aktivt efter B8Shield trots att man har problemet med att fastna"
                </p>
              </div>
            </div>

            {/* Key Actions */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-bold">!</span>
                Av den orsaken är det avgörande att ni:
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">1</span>
                  <p className="text-gray-700 text-lg">
                    <strong>Ge butiksstället en synlig och central plats i butiken</strong>, gärna nära kassan.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">2</span>
                  <p className="text-gray-700 text-lg">
                    <strong>Aktivt säljer och förklarar produkten för kunderna.</strong> Gör man inte det är sannolikheten stor att kunderna inte uppmärksammar produkten och därmed inte köper produkten vilket vare sig vi eller ni vinner på.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">3</span>
                  <p className="text-gray-700 text-lg">
                    <strong>För att försäkra säljprocessen ytterligare</strong> skickar vi också med ett antal lösa B8Shields. Med fördel kan dessa läggas i en skål vid stället så att kund kan få klämma och känna på produkten.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 bg-green-100 border-l-4 border-green-400 p-4 rounded">
                <p className="text-green-800 font-medium italic">
                  "När kunden dock väl förstår vad B8Shield är och gör, är den lätt att välja, men kunden måste förstå det först".
                </p>
              </div>
            </div>

            {/* Product Explanation */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                🎯 Så förklarar du produkten på 15 sekunder:
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">1</span>
                  <p className="text-gray-700 text-lg">
                    B8Shield hindrar fiskedrag från att fastna i undervattensvegetation och andra undervattenshinder.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">2</span>
                  <div className="text-gray-700 text-lg">
                    <p className="mb-3 font-semibold">B8Shield finns i 4 olika utföranden:</p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span><strong>TRANSPARENT.</strong> När man inte vill kompromissa med fiskedragets naturliga färger och utseende.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span><strong>BETESRÖD.</strong> Utnyttja den traditionella röda färgen på många betesfiskar för att attrahera mer fisk.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span><strong>FLUORESCERANDE.</strong> När du skall natt fiska och vill attrahera fiskar i grumliga eller mörka vatten.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>GLITTER.</strong> När man skall fiska i stark solljus hjälper dess gnistrande färg till med att attrahera mer fisk.</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">3</span>
                  <p className="text-gray-700 text-lg">
                    B8Shield fästs på tre-krok. Passat till krokstorlek 2, 4 och 6, där storlek 2 också passar på krokstorlek 1. Krokstorlek 1/0 och 2/0 kommer inom kort.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 text-lg font-bold flex-shrink-0 mt-1">4</span>
                  <p className="text-gray-700 text-lg">
                    B8Shields är designad så att man enkelt kan växla den mellan olika drag vid behov.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                ❓ Vanliga frågor – och vad du svarar:
              </h3>
              
              <div className="space-y-6">
                <div className="border-l-4 border-blue-400 pl-6 py-4 bg-blue-50 rounded-r-lg">
                  <h4 className="font-bold text-blue-800 mb-2">Fråga 1: Kommer fisken sluta hugga?</h4>
                  <p className="text-blue-700">
                    <strong>Svar:</strong> Nej, B8Shield påverkar inte krokens förmåga att kroka fisk. Under ett bett flexar sköldens vingar för att exponera krokarna, vilket säkerställer en lyckad fångst. Du krokar helt enkelt fisken som vanligt.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-400 pl-6 py-4 bg-green-50 rounded-r-lg">
                  <h4 className="font-bold text-green-800 mb-2">Fråga 2: Förstör det gången på draget?</h4>
                  <p className="text-green-700">
                    <strong>Svar:</strong> Nej, B8Shield är testad med många typer av drag. Ingen skillnad i gång.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-400 pl-6 py-4 bg-purple-50 rounded-r-lg">
                  <h4 className="font-bold text-purple-800 mb-2">Fråga 3: När ska man använda den?</h4>
                  <p className="text-purple-700">
                    <strong>Svar:</strong> När du fiskar där det finns många undervattenhinder som ex. undervattensvegetation eller där det är stenigt, alltså där fisken ofta gömmer sig.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-6 shadow-md">
              <h3 className="text-2xl font-bold mb-6 text-center">
                📞 KONTAKTUPPGIFTER
              </h3>
              
              <div className="text-center space-y-2 text-lg">
                <p className="font-bold text-xl text-blue-300">JPH Innovation AB</p>
                <p>Östergatan 30 C</p>
                <p>152 43 Södertälje</p>
                <p>SWEDEN</p>
                <p className="mt-4">
                  <a href="mailto:info@b8shield.com" className="text-blue-300 hover:text-blue-200 underline font-semibold">
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