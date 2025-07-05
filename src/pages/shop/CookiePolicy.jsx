import React from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { getCountryAwareUrl } from '../../utils/productUrls';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Cookie-policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                🍪 Vad är cookies?
              </h2>
              <p className="text-blue-800">
                Cookies är små textfiler som lagras på din enhet när du besöker en webbplats. 
                De hjälper oss att förbättra din upplevelse och tillhandahålla personaliserat innehåll.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Allmän information</h2>
              <p className="mb-4">
                JPH Innovation AB ("vi", "oss", "vårt") använder cookies och liknande tekniker på 
                vår webbplats shop.b8shield.com för att förbättra din upplevelse, analysera trafik 
                och tillhandahålla personaliserat innehåll.
              </p>
              <p className="mb-4">
                Denna cookie-policy förklarar vilka cookies vi använder, varför vi använder dem 
                och hur du kan kontrollera dina cookie-inställningar.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Vad är cookies?</h2>
              <p className="mb-4">
                Cookies är små textfiler som webbplatser placerar på din dator, mobil eller annan enhet 
                när du besöker dem. De innehåller information som hjälper webbplatsen att komma ihåg 
                dina preferenser och förbättra din användarupplevelse.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">2.1 Typer av cookies</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Sessionscookies</h4>
                  <p className="text-sm text-gray-700">
                    Tillfälliga cookies som raderas när du stänger webbläsaren. 
                    Används för grundläggande webbplatsfunktioner.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Permanenta cookies</h4>
                  <p className="text-sm text-gray-700">
                    Sparas på din enhet under en bestämd tid eller tills du raderar dem. 
                    Används för att komma ihåg dina preferenser.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Förstapartscookies</h4>
                  <p className="text-sm text-gray-700">
                    Sätts av vår webbplats direkt. Vi har full kontroll över dessa cookies.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Tredjepartscookies</h4>
                  <p className="text-sm text-gray-700">
                    Sätts av externa tjänster som vi använder, t.ex. analysverktyg eller sociala medier.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cookies vi använder</h2>
              
              <h3 className="text-lg font-semibold mb-4">3.1 Nödvändiga cookies</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm mb-2">
                  <strong>Dessa cookies är nödvändiga för att webbplatsen ska fungera och kan inte stängas av.</strong>
                </p>
              </div>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Cookie-namn</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Syfte</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Varaktighet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">b8shield_session</td>
                      <td className="px-4 py-2 text-sm">Säkerställer att din session fungerar korrekt</td>
                      <td className="px-4 py-2 text-sm">Session</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">b8shield_cart</td>
                      <td className="px-4 py-2 text-sm">Sparar innehållet i din varukorg</td>
                      <td className="px-4 py-2 text-sm">30 dagar</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">csrf_token</td>
                      <td className="px-4 py-2 text-sm">Säkerhetsskydd mot CSRF-attacker</td>
                      <td className="px-4 py-2 text-sm">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mb-4">3.2 Funktionella cookies</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Dessa cookies förbättrar webbplatsens funktionalitet och din användarupplevelse.</strong>
                </p>
              </div>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Cookie-namn</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Syfte</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Varaktighet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">language_preference</td>
                      <td className="px-4 py-2 text-sm">Kommer ihåg din språkinställning</td>
                      <td className="px-4 py-2 text-sm">1 år</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">cookie_consent</td>
                      <td className="px-4 py-2 text-sm">Sparar dina cookie-preferenser</td>
                      <td className="px-4 py-2 text-sm">1 år</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono">viewed_products</td>
                      <td className="px-4 py-2 text-sm">Visar nyligen visade produkter</td>
                      <td className="px-4 py-2 text-sm">30 dagar</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mb-4">3.3 Analytiska cookies</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm mb-2">
                  <strong>Dessa cookies hjälper oss att förstå hur besökare använder webbplatsen.</strong>
                </p>
              </div>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Tjänst</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Syfte</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Varaktighet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm">Google Analytics</td>
                      <td className="px-4 py-2 text-sm">Analyserar webbplatstrafik och användarbeteende</td>
                      <td className="px-4 py-2 text-sm">2 år</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Firebase Analytics</td>
                      <td className="px-4 py-2 text-sm">Spårar användarinteraktioner och prestanda</td>
                      <td className="px-4 py-2 text-sm">2 år</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mb-4">3.4 Marknadsföringscookies</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-purple-800 text-sm mb-2">
                  <strong>Dessa cookies används för att visa relevanta annonser och mäta kampanjeffektivitet.</strong>
                </p>
              </div>
              
              <p className="mb-4 text-sm text-gray-600">
                <em>Vi använder för närvarande inga marknadsföringscookies från tredje part, men kan komma att göra det i framtiden.</em>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Hantera dina cookie-inställningar</h2>
              
              <h3 className="text-lg font-semibold mb-2">4.1 Cookie-banner</h3>
              <p className="mb-4">
                När du besöker vår webbplats första gången visas en cookie-banner där du kan välja 
                vilka typer av cookies du accepterar. Du kan ändra dina preferenser när som helst.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">4.2 Webbläsarinställningar</h3>
              <p className="mb-4">
                Du kan också hantera cookies direkt i din webbläsare:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Chrome</h4>
                  <p className="text-sm text-gray-700">
                    Inställningar → Sekretess och säkerhet → Cookies och andra webbplatsdata
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Firefox</h4>
                  <p className="text-sm text-gray-700">
                    Inställningar → Sekretess och säkerhet → Cookies och webbplatsdata
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Safari</h4>
                  <p className="text-sm text-gray-700">
                    Inställningar → Sekretess → Hantera webbplatsdata
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Edge</h4>
                  <p className="text-sm text-gray-700">
                    Inställningar → Cookies och webbplatsbehörigheter → Cookies och lagrade data
                  </p>
                </div>
              </div>
              
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg mb-4">
                <h4 className="font-semibold text-orange-900 mb-2">Viktigt att veta:</h4>
                <p className="text-orange-800 text-sm">
                  Om du blockerar eller raderar nödvändiga cookies kan vissa delar av webbplatsen 
                  sluta fungera korrekt. Din varukorg kan tömmas och du kan behöva logga in igen.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Tredjepartstjänster</h2>
              
              <h3 className="text-lg font-semibold mb-2">5.1 Google Analytics</h3>
              <p className="mb-4">
                Vi använder Google Analytics för att analysera hur besökare använder vår webbplats. 
                Google kan använda denna data enligt sin egen integritetspolicy. 
                Du kan välja bort Google Analytics genom att installera 
                <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Google Analytics Opt-out Browser Add-on
                </a>.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">5.2 Firebase</h3>
              <p className="mb-4">
                Vår webbplats drivs av Google Firebase som kan sätta tekniska cookies för 
                att säkerställa funktionalitet och säkerhet.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">5.3 Betalningsleverantörer</h3>
              <p className="mb-4">
                När du gör en beställning kan våra betalningsleverantörer (Stripe, Klarna) 
                sätta cookies för att behandla din betalning säkert.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Dina rättigheter</h2>
              <p className="mb-4">
                Enligt GDPR och svensk lag har du följande rättigheter avseende cookies och personuppgifter:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Rätt att ge eller återkalla samtycke till cookies</li>
                <li>Rätt att få information om vilka cookies som används</li>
                <li>Rätt att begära radering av lagrad data</li>
                <li>Rätt att få tillgång till dina uppgifter</li>
              </ul>
              
              <p className="mb-4">
                För mer information om hur vi behandlar personuppgifter, se vår 
                <Link to={getCountryAwareUrl('privacy')} className="text-blue-600 hover:underline">Integritetspolicy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Ändringar av denna policy</h2>
              <p className="mb-4">
                Vi kan uppdatera denna cookie-policy från tid till annan för att återspegla 
                ändringar i vår användning av cookies eller av juridiska skäl. 
                Vi rekommenderar att du regelbundet granskar denna sida.
              </p>
              <p className="mb-4">
                Vid väsentliga ändringar kommer vi att meddela dig via vår webbplats eller e-post.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Kontakt</h2>
              <p className="mb-4">
                Om du har frågor om vår användning av cookies eller denna policy, kontakta oss:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>JPH Innovation AB</strong><br />
                  Östergatan 30c<br />
                  152 43 Södertälje<br />
                  E-post: info@b8shield.com<br />
                  Telefon: [Telefonnummer]
                </p>
              </div>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Hantera dina cookie-preferenser</h3>
              <p className="text-blue-800 text-sm mb-4">
                Du kan när som helst ändra dina cookie-inställningar genom att klicka på knappen nedan.
              </p>
              <button 
                onClick={() => {
                  // TODO: Implement cookie preference center
                  alert('Cookie-inställningar kommer snart...');
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Hantera cookie-inställningar
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link 
              to={getCountryAwareUrl('')} 
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              ← Tillbaka till startsidan
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <ShopFooter />
    </div>
  );
};

export default CookiePolicy; 