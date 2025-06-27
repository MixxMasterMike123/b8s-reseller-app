import React from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';

const ReturnPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Returpolicy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg mb-8">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                ✓ 14 dagars ångerrätt enligt EU-lag
              </h2>
              <p className="text-green-800">
                Som konsument har du alltid rätt att ångra ditt köp inom 14 dagar från det att du 
                mottagit produkten, utan att behöva ange någon anledning.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Ångerrätt - Dina rättigheter</h2>
              <p className="mb-4">
                Enligt EU:s konsumenträttsdirektiv och svensk konsumentköplag har du som konsument 
                rätt att ångra ditt köp inom 14 dagar från det datum du eller en av dig utsedd 
                tredje part (som inte är transportören) fysiskt tagit produkten i besittning.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">1.1 Vem gäller ångerrätten för?</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Privatpersoner som handlar för eget bruk (konsumenter)</li>
                <li>Gäller inte för företagskunder eller återförsäljare</li>
                <li>Du måste vara minst 18 år</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">1.2 Ångerfristen</h3>
              <p className="mb-4">
                Ångerfristen är 14 kalenderdagar och börjar löpa:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Från den dag du mottagit produkten</li>
                <li>Om beställningen innehåller flera produkter som levereras separat: från den dag du mottagit den sista produkten</li>
                <li>Om produkten levereras i flera delar: från den dag du mottagit den sista delen</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Så ångrar du ditt köp</h2>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Steg-för-steg guide:</h3>
                <ol className="list-decimal pl-6 text-blue-800 space-y-2">
                  <li>Meddela oss inom 14 dagar att du vill ångra köpet</li>
                  <li>Packa produkten i originalförpackning</li>
                  <li>Skicka tillbaka produkten inom 14 dagar</li>
                  <li>Vi återbetalar inom 14 dagar efter mottagandet</li>
                </ol>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">2.1 Meddela din ånger</h3>
              <p className="mb-4">
                Du måste meddela oss ditt beslut att ångra köpet genom ett tydligt meddelande. 
                Du kan kontakta oss på följande sätt:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>E-post:</strong> info@b8shield.com (rekommenderas)</li>
                <li><strong>Telefon:</strong> [Telefonnummer]</li>
                <li><strong>Post:</strong> JPH Innovation AB, Östergatan 30c, 152 43 Södertälje</li>
              </ul>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Information att inkludera:</h4>
                <ul className="list-disc pl-6 text-sm">
                  <li>Ditt namn och kontaktuppgifter</li>
                  <li>Ordernummer</li>
                  <li>Vilka produkter du vill returnera</li>
                  <li>Datum för meddelandet</li>
                </ul>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">2.2 Returnera produkten</h3>
              <p className="mb-4">
                Du måste returnera produkten utan onödig dröjsmål och senast inom 14 dagar 
                från den dag du meddelade oss om din ånger.
              </p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Viktigt att tänka på:</h4>
                <ul className="list-disc pl-6 text-yellow-800 text-sm">
                  <li>Produkten ska vara i ursprungligt skick</li>
                  <li>Originalförpackning ska medfölja</li>
                  <li>Eventuella etiketter ska vara kvar</li>
                  <li>Du står för returkostnaden</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Produktens skick</h2>
              
              <h3 className="text-lg font-semibold mb-2">3.1 Tillåten hantering</h3>
              <p className="mb-4">
                Du får hantera produkten på samma sätt som du skulle göra i en fysisk butik. 
                Det innebär att du får:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Ta produkten ur förpackningen</li>
                <li>Inspektera produkten</li>
                <li>Testa grundläggande funktioner</li>
                <li>Läsa medföljande information</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">3.2 Värdeminskning</h3>
              <p className="mb-4">
                Om produktens värde minskat på grund av hantering som går utöver vad som är 
                nödvändigt för att fastställa produktens beskaffenhet, egenskaper och funktion, 
                kan vi göra avdrag från återbetalningen.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">3.3 Produkter som inte kan returneras</h3>
              <p className="mb-4">
                Vissa produkter kan inte returneras av hygieniska skäl eller andra viktiga skäl:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Produkter som förseglas och öppnats av hygieniska skäl</li>
                <li>Skräddarsydda eller personligt anpassade produkter</li>
                <li>Produkter som snabbt försämras eller har kort hållbarhet</li>
              </ul>
              <p className="mb-4">
                <em>För B8Shield-produkter gäller normala returregler då de inte faller under dessa undantag.</em>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Återbetalning</h2>
              
              <h3 className="text-lg font-semibold mb-2">4.1 Vad återbetalas</h3>
              <p className="mb-4">
                Vid godkänd retur återbetalar vi:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Produktens pris</li>
                <li>Ursprungliga leveranskostnader</li>
                <li>Eventuella avgifter du betalat</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">4.2 Vad som inte återbetalas</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Returkostnader (du står för dessa)</li>
                <li>Extra leveranskostnader om du valt dyrare leverans än vårt standardalternativ</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">4.3 När sker återbetalningen</h3>
              <p className="mb-4">
                Vi återbetalar utan onödig dröjsmål och senast inom 14 dagar från:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Den dag vi mottagit produkten tillbaka, eller</li>
                <li>Den dag du visar att du skickat tillbaka produkten</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2">4.4 Återbetalningsmetod</h3>
              <p className="mb-4">
                Återbetalning sker med samma betalningsmetod som du använde vid köpet, 
                om du inte uttryckligen godkänt något annat. Vi tar inte ut någon avgift för återbetalningen.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Reklamation (fel på produkten)</h2>
              
              <p className="mb-4">
                Reklamation och ångerrätt är två olika saker:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Ångerrätt</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• 14 dagar</li>
                    <li>• Ingen anledning behövs</li>
                    <li>• Du betalar returfrakt</li>
                    <li>• Produkten ska vara i gott skick</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Reklamation</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• 24 månader (garanti)</li>
                    <li>• Fel på produkten</li>
                    <li>• Vi betalar returfrakt</li>
                    <li>• Reparation, utbyte eller återbetalning</li>
                  </ul>
                </div>
              </div>
              
              <p className="mb-4">
                Om du upptäcker fel på produkten, kontakta oss så snart som möjligt på info@b8shield.com 
                för att diskutera reklamation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Kontakt och frågor</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Har du frågor om returer?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Kontaktuppgifter:</h4>
                    <p className="text-sm">
                      JPH Innovation AB<br />
                      Östergatan 30c<br />
                      152 43 Södertälje<br />
                      E-post: info@b8shield.com<br />
                      Telefon: [Telefonnummer]
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Öppettider kundtjänst:</h4>
                    <p className="text-sm">
                      Måndag-Fredag: 09:00-17:00<br />
                      Lördag: 10:00-15:00<br />
                      Söndag: Stängt<br />
                      <em>Vi svarar normalt inom 24 timmar</em>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Dina rättigheter</h2>
              <p className="mb-4">
                Denna returpolicy påverkar inte dina lagstadgade rättigheter som konsument. 
                Om du är missnöjd med hur vi hanterat din retur kan du kontakta:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Allmänna reklamationsnämnden (ARN):</strong> www.arn.se</li>
                <li><strong>Konsumentverket:</strong> www.konsumentverket.se</li>
                <li><strong>Konsumenternas:</strong> www.konsumenternas.se</li>
              </ul>
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

export default ReturnPolicy; 