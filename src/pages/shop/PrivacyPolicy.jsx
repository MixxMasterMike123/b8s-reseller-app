import React from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import { getCountryAwareUrl } from '../../utils/productUrls';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Integritetspolicy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Allmän information</h2>
              <p className="mb-4">
                JPH Innovation AB ("vi", "oss", "vårt") respekterar din integritet och är engagerade i att skydda dina personuppgifter. 
                Denna integritetspolicy förklarar hur vi samlar in, använder och skyddar dina personuppgifter när du besöker vår webbplats 
                shop.b8shield.com och använder våra tjänster.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Kontaktuppgifter:</h3>
                <p className="text-blue-800">
                  JPH Innovation AB<br />
                  Östergatan 30c<br />
                  152 43 Södertälje<br />
                  E-post: info@b8shield.com<br />
                  Telefon: [Telefonnummer]
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Personuppgifter vi samlar in</h2>
              <h3 className="text-lg font-semibold mb-2">2.1 Uppgifter du lämnar till oss:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Namn och kontaktuppgifter (e-post, telefon, adress)</li>
                <li>Beställnings- och betalningsinformation</li>
                <li>Leveransadresser</li>
                <li>Kundtjänstkommunikation</li>
                <li>Marknadsföringspreferenser</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">2.2 Uppgifter vi samlar in automatiskt:</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>IP-adress och webbläsarinformation</li>
                <li>Cookies och liknande tekniker</li>
                <li>Användningsdata och webbplatsaktivitet</li>
                <li>Enhetsidentifierare</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Hur vi använder dina personuppgifter</h2>
              <ul className="list-disc pl-6 mb-4">
                <li>Behandla och leverera dina beställningar</li>
                <li>Tillhandahålla kundtjänst och support</li>
                <li>Skicka orderbekräftelser och leveransuppdateringar</li>
                <li>Förbättra vår webbplats och tjänster</li>
                <li>Skicka marknadsföringsmaterial (med ditt samtycke)</li>
                <li>Följa juridiska förpliktelser</li>
                <li>Förebygga bedrägerier och säkerhetshot</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Rättslig grund för behandling</h2>
              <p className="mb-4">Vi behandlar dina personuppgifter baserat på följande rättsliga grunder:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Avtal:</strong> För att fullgöra våra avtalsförpliktelser gentemot dig</li>
                <li><strong>Rättslig förpliktelse:</strong> För att uppfylla juridiska krav</li>
                <li><strong>Berättigat intresse:</strong> För att förbättra våra tjänster och säkerhet</li>
                <li><strong>Samtycke:</strong> För marknadsföring och frivilliga tjänster</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Delning av personuppgifter</h2>
              <p className="mb-4">Vi delar dina personuppgifter endast med:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Leveranspartners för att leverera dina beställningar</li>
                <li>Betalningsleverantörer för säker betalningsbehandling</li>
                <li>IT-tjänsteleverantörer som hjälper oss att driva vår verksamhet</li>
                <li>Juridiska myndigheter när det krävs enligt lag</li>
              </ul>
              <p className="mb-4">
                Vi säljer aldrig dina personuppgifter till tredje part för marknadsföringsändamål.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Dina rättigheter enligt GDPR</h2>
              <p className="mb-4">Du har följande rättigheter avseende dina personuppgifter:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Tillgång:</strong> Begära kopia av dina personuppgifter</li>
                <li><strong>Rättelse:</strong> Korrigera felaktiga eller ofullständiga uppgifter</li>
                <li><strong>Radering:</strong> Begära att vi raderar dina personuppgifter</li>
                <li><strong>Begränsning:</strong> Begränsa behandlingen av dina uppgifter</li>
                <li><strong>Portabilitet:</strong> Få dina uppgifter i ett strukturerat format</li>
                <li><strong>Invändning:</strong> Invända mot behandling baserad på berättigat intresse</li>
                <li><strong>Återkalla samtycke:</strong> När behandling baseras på samtycke</li>
              </ul>
              <p className="mb-4">
                För att utöva dina rättigheter, kontakta oss på info@b8shield.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies och spårningstekniker</h2>
              <p className="mb-4">
                Vi använder cookies och liknande tekniker för att förbättra din upplevelse på vår webbplats. 
                Du kan hantera dina cookie-inställningar genom din webbläsare. För mer information, 
                se vår <Link to={getCountryAwareUrl('cookies')} className="text-blue-600 hover:underline">Cookie-policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Datasäkerhet</h2>
              <p className="mb-4">
                Vi implementerar lämpliga tekniska och organisatoriska säkerhetsåtgärder för att skydda 
                dina personuppgifter mot obehörig åtkomst, förlust, förstörelse eller ändring.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Lagringsperioder</h2>
              <p className="mb-4">
                Vi behåller dina personuppgifter endast så länge som nödvändigt för de ändamål som anges 
                i denna policy eller enligt juridiska krav. Kunduppgifter behålls vanligtvis i 7 år 
                efter sista köp för redovisnings- och garantiändamål.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Klagomål</h2>
              <p className="mb-4">
                Om du har klagomål om vår behandling av dina personuppgifter har du rätt att lämna 
                klagomål till Integritetsskyddsmyndigheten (IMY).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Ändringar av denna policy</h2>
              <p className="mb-4">
                Vi kan uppdatera denna integritetspolicy från tid till annan. Väsentliga ändringar 
                kommer att meddelas via e-post eller genom meddelande på vår webbplats.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Kontakt</h2>
              <p className="mb-4">
                Om du har frågor om denna integritetspolicy eller vår behandling av personuppgifter, 
                kontakta oss:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  E-post: info@b8shield.com<br />
                  Telefon: [Telefonnummer]<br />
                  Adress: JPH Innovation AB, Östergatan 30c, 152 43 Södertälje
                </p>
              </div>
            </section>
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
    </div>
  );
};

export default PrivacyPolicy; 