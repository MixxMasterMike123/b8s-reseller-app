import React from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Användarvillkor</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Allmänna bestämmelser</h2>
              <p className="mb-4">
                Dessa användarvillkor ("Villkoren") reglerar din användning av webbplatsen shop.b8shield.com 
                och köp av produkter från JPH Innovation AB (organisationsnummer: [ORG-NR]), 
                Östergatan 30c, 152 43 Södertälje ("Företaget", "vi", "oss").
              </p>
              <p className="mb-4">
                Genom att använda vår webbplats och göra en beställning accepterar du dessa villkor. 
                Om du inte accepterar villkoren ska du inte använda vår webbplats eller våra tjänster.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Produkter och priser</h2>
              <h3 className="text-lg font-semibold mb-2">2.1 Produktinformation</h3>
              <p className="mb-4">
                Vi strävar efter att ge korrekt produktinformation, men kan inte garantera att all information 
                är fullständig, korrekt eller aktuell. Vi förbehåller oss rätten att korrigera fel i 
                produktbeskrivningar, priser och tillgänglighet.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">2.2 Priser</h3>
              <p className="mb-4">
                Alla priser anges i svenska kronor (SEK) och inkluderar moms (25%). 
                Vi förbehåller oss rätten att ändra priser utan förvarning. 
                Det pris som gäller vid beställningstillfället är det pris du betalar.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">2.3 Tillgänglighet</h3>
              <p className="mb-4">
                Produkter säljs i mån av tillgång. Om en produkt inte är tillgänglig efter din beställning 
                kommer vi att kontakta dig för att diskutera alternativ eller återbetalning.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Beställning och avtal</h2>
              <h3 className="text-lg font-semibold mb-2">3.1 Beställningsprocess</h3>
              <p className="mb-4">
                När du lägger en beställning genom vår webbplats utgör det ett anbud om att köpa produkterna. 
                Vi förbehåller oss rätten att acceptera eller avslå din beställning av vilken anledning som helst.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">3.2 Orderbekräftelse</h3>
              <p className="mb-4">
                Ett köpeavtal uppstår när vi skickar en orderbekräftelse via e-post. 
                Denna bekräftelse innehåller detaljer om din beställning och leveransinformation.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">3.3 Åldersgräns</h3>
              <p className="mb-4">
                Du måste vara minst 18 år för att göra en beställning. 
                Genom att beställa bekräftar du att du uppfyller denna ålderskrav.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Betalning</h2>
              <p className="mb-4">
                Vi accepterar följande betalningsmetoder:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Kreditkort (Visa, Mastercard)</li>
                <li>Debetkort</li>
                <li>Swish</li>
                <li>Klarna</li>
              </ul>
              <p className="mb-4">
                Betalning ska ske vid beställning. Vi förbehåller oss rätten att begära ytterligare 
                verifiering av identitet eller betalningsinformation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Leverans</h2>
              <h3 className="text-lg font-semibold mb-2">5.1 Leveransområde</h3>
              <p className="mb-4">
                Vi levererar inom Sverige och till utvalda länder i Europa. 
                Leveranskostnader och tider varierar beroende på destination.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">5.2 Leveranstid</h3>
              <p className="mb-4">
                Normal leveranstid är 2-5 arbetsdagar inom Sverige. 
                Leveranstider är uppskattningar och vi kan inte garantera exakta leveransdatum.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">5.3 Leveransrisken</h3>
              <p className="mb-4">
                Risken för produkterna övergår till dig när produkterna lämnas till transportören.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Ångerrätt (14 dagar)</h2>
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-green-900 mb-2">Din rätt att ångra köpet</h3>
                <p className="text-green-800">
                  Som konsument har du rätt att ångra ditt köp inom 14 dagar från det att du 
                  mottagit produkten, utan att ange någon anledning.
                </p>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">6.1 Hur du ångrar dig</h3>
              <p className="mb-4">
                För att utöva din ångerrätt måste du meddela oss ditt beslut att ångra köpet genom 
                ett tydligt meddelande till info@b8shield.com eller per post till vår adress.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">6.2 Returnering av produkter</h3>
              <p className="mb-4">
                Du måste returnera produkterna utan onödig dröjsmål och senast inom 14 dagar 
                från den dag du meddelade oss om din ånger. Produkterna ska vara i ursprungligt skick.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">6.3 Återbetalning</h3>
              <p className="mb-4">
                Vi kommer att återbetala alla betalningar vi mottagit från dig, inklusive leveranskostnader, 
                utan onödig dröjsmål och senast inom 14 dagar från det att vi mottagit produkterna.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Reklamation och garanti</h2>
              <h3 className="text-lg font-semibold mb-2">7.1 Reklamationsrätt</h3>
              <p className="mb-4">
                Som konsument har du rätt att reklamera fel i produkten enligt konsumentköplagen. 
                Reklamation ska göras inom skälig tid efter det att felet upptäcktes.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">7.2 Garanti</h3>
              <p className="mb-4">
                Vi lämnar 24 månaders garanti på våra B8Shield-produkter mot tillverkningsfel 
                vid normal användning. Garantin gäller inte för skador orsakade av felaktig användning.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Ansvarsbegränsning</h2>
              <p className="mb-4">
                Vårt ansvar begränsas till det som följer av tvingande lagstiftning. 
                Vi ansvarar inte för indirekta skador eller följdskador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Immaterialrätt</h2>
              <p className="mb-4">
                Allt innehåll på webbplatsen, inklusive text, bilder, logotyper och design, 
                skyddas av upphovsrätt och andra immaterialrätter. Du får inte använda detta 
                innehåll utan vårt skriftliga tillstånd.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Personuppgifter</h2>
              <p className="mb-4">
                Behandling av personuppgifter regleras av vår 
                <Link to="/privacy" className="text-blue-600 hover:underline"> Integritetspolicy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Tillämplig lag och tvister</h2>
              <p className="mb-4">
                Dessa villkor regleras av svensk rätt. Tvister ska i första hand lösas genom förhandling. 
                Som konsument har du rätt att vända dig till Allmänna reklamationsnämnden (ARN) 
                eller relevant tingsrätt.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Ändringar av villkoren</h2>
              <p className="mb-4">
                Vi förbehåller oss rätten att ändra dessa villkor. Ändringar träder i kraft när 
                de publiceras på webbplatsen. Vid väsentliga ändringar kommer vi att meddela dig via e-post.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Kontakt</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">JPH Innovation AB</h3>
                <p>
                  Östergatan 30c<br />
                  152 43 Södertälje<br />
                  E-post: info@b8shield.com<br />
                  Telefon: [Telefonnummer]<br />
                  Organisationsnummer: [ORG-NR]
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              ← Tillbaka till butiken
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 