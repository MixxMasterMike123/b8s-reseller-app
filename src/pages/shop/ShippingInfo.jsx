import React from 'react';
import { Link } from 'react-router-dom';
import { getCountryAwareUrl } from '../../utils/productUrls';
import ShopNavigation from '../../components/shop/ShopNavigation';
import { useTranslation } from '../../contexts/TranslationContext';

const ShippingInfo = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb={t('breadcrumb_shipping', 'Leveransinformation')} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Leveransinformation</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg mb-8">
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                📦 Snabb och säker leverans
              </h2>
              <p className="text-green-800">
                Vi levererar din beställning snabbt och säkert. 
                Fri frakt inom Sverige på beställningar över 500 kr!
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Leveransområden</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">🇸🇪 Sverige</h3>
                  <ul className="text-blue-800 space-y-2">
                    <li>• Hela Sverige</li>
                    <li>• Inklusive Gotland och Öland</li>
                    <li>• Leverans till dörrn</li>
                    <li>• Spårning ingår</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3">🇪🇺 Europa</h3>
                  <ul className="text-purple-800 space-y-2">
                    <li>• Norge, Danmark, Finland</li>
                    <li>• Tyskland, Nederländerna</li>
                    <li>• Frankrike, Belgien</li>
                    <li>• Övriga EU-länder</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Leveranskostnader</h2>
              
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Destination</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Kostnad</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fri frakt från</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Leveranstid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">Sverige</td>
                      <td className="px-6 py-4 text-sm text-gray-900">49 kr</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">500 kr</td>
                      <td className="px-6 py-4 text-sm text-gray-900">1-3 arbetsdagar</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">Norge, Danmark, Finland</td>
                      <td className="px-6 py-4 text-sm text-gray-900">89 kr</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">800 kr</td>
                      <td className="px-6 py-4 text-sm text-gray-900">3-5 arbetsdagar</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-900">Tyskland, Nederländerna</td>
                      <td className="px-6 py-4 text-sm text-gray-900">129 kr</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">1000 kr</td>
                      <td className="px-6 py-4 text-sm text-gray-900">5-7 arbetsdagar</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">Övriga EU</td>
                      <td className="px-6 py-4 text-sm text-gray-900">159 kr</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">1200 kr</td>
                      <td className="px-6 py-4 text-sm text-gray-900">7-10 arbetsdagar</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Viktigt att veta:</h4>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Alla priser inkluderar moms (25%)</li>
                  <li>• Leveranskostnader beräknas automatiskt vid checkout</li>
                  <li>• För leveranser utanför EU kan tullavgifter tillkomma</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Leveranstider</h2>
              
              <h3 className="text-lg font-semibold mb-2">3.1 Bearbetningstid</h3>
              <p className="mb-4">
                Vi behandlar din beställning inom 1-2 arbetsdagar från det att betalningen är bekräftad. 
                Du får en orderbekräftelse via e-post när beställningen är mottagen och en 
                leveransbekräftelse när paketet skickas.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">3.2 Transporttid</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-green-900 mb-2">Sverige</h4>
                  <p className="text-2xl font-bold text-green-600 mb-1">1-3</p>
                  <p className="text-sm text-green-800">arbetsdagar</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-blue-900 mb-2">Norden</h4>
                  <p className="text-2xl font-bold text-blue-600 mb-1">3-5</p>
                  <p className="text-sm text-blue-800">arbetsdagar</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <h4 className="font-semibold text-purple-900 mb-2">Europa</h4>
                  <p className="text-2xl font-bold text-purple-600 mb-1">5-10</p>
                  <p className="text-sm text-purple-800">arbetsdagar</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Obs! Helger och högtider</h4>
                <p className="text-sm text-gray-700">
                  Leveranstider kan förlängas under helger, sommarsemester och högtider. 
                  Vi informerar om eventuella förseningar på vår webbplats och via e-post.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Leveranspartners</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">PostNord (Sverige)</h3>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Leverans till dörrn eller närmaste ombud</li>
                    <li>• SMS-avisering ingår</li>
                    <li>• Spårning via postnord.se</li>
                    <li>• Kvittens vid leverans</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">DHL (Europa)</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Express-leverans tillgänglig</li>
                    <li>• Internationell spårning</li>
                    <li>• Signatur vid leverans</li>
                    <li>• Försäkring ingår</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Spårning av din beställning</h2>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Så spårar du ditt paket:</h3>
                <ol className="list-decimal pl-6 text-blue-800 space-y-2">
                  <li>Du får ett e-postmeddelande med spårningsnummer när paketet skickas</li>
                  <li>Klicka på spårningslänken i e-postmeddelandet</li>
                  <li>Följ paketets resa i realtid</li>
                  <li>Få automatiska uppdateringar om leveransstatus</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Problem med spårning?</h4>
                <p className="text-sm text-gray-700">
                  Kontakta vår kundtjänst på info@jphinnovation.se om du har problem med att spåra ditt paket 
                  eller om spårningsinformationen inte uppdateras.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Leveransalternativ</h2>
              
              <h3 className="text-lg font-semibold mb-2">6.1 Standardleverans</h3>
              <p className="mb-4">
                Vår standardleverans sker till den adress du angett vid beställning. 
                Paketet lämnas i brevlådan eller till någon på adressen. 
                Om ingen är hemma lämnas en avi och paketet kan hämtas på närmaste ombud.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">6.2 Leverans till ombud</h3>
              <p className="mb-4">
                Du kan välja att få paketet levererat till ett PostNord-ombud nära dig. 
                Detta är praktiskt om du inte är hemma dagtid. Du får SMS när paketet är klart för hämtning.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">6.3 Express-leverans (tillval)</h3>
              <p className="mb-4">
                För brådskande beställningar erbjuder vi express-leverans inom Sverige (nästa arbetsdag) 
                för en extra kostnad på 149 kr. Välj detta alternativ vid checkout.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Leveransproblem</h2>
              
              <h3 className="text-lg font-semibold mb-2">7.1 Försenad leverans</h3>
              <p className="mb-4">
                Om ditt paket är försenat mer än 5 arbetsdagar från beräknad leveranstid, 
                kontakta oss så hjälper vi dig att spåra paketet. I vissa fall kan vi erbjuda 
                kompensation eller skicka en ny beställning.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">7.2 Skadat paket</h3>
              <p className="mb-4">
                Om paketet är skadat vid leverans, fotografera skadan innan du öppnar paketet 
                och kontakta oss inom 24 timmar. Vi ordnar utbyte eller återbetalning.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">7.3 Felaktig leveransadress</h3>
              <p className="mb-4">
                Kontrollera din leveransadress noggrant vid beställning. Om du angett fel adress 
                kan vi försöka ändra leveransen innan den skickas, men extra kostnader kan tillkomma.
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <h4 className="font-semibold text-red-900 mb-2">Viktigt:</h4>
                <p className="text-red-800 text-sm">
                  Vi ansvarar inte för paket som levereras till fel adress om kunden angett felaktig 
                  leveransinformation. Dubbelkolla alltid din adress innan du slutför beställningen.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Internationella leveranser</h2>
              
              <h3 className="text-lg font-semibold mb-2">8.1 Tull och avgifter</h3>
              <p className="mb-4">
                För leveranser inom EU ingår all moms och inga extra avgifter tillkommer. 
                För leveranser utanför EU kan tullavgifter och importskatter tillkomma som 
                mottagaren ansvarar för.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">8.2 Deklarationsvärde</h3>
              <p className="mb-4">
                Vi deklarerar alltid det korrekta värdet på internationella försändelser. 
                Vi kan inte märka paket som "gåva" eller med lägre värde än det verkliga.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">8.3 Leveransbegränsningar</h3>
              <p className="mb-4">
                Vissa länder kan ha begränsningar för import av fiskeutrustning. 
                Kontakta oss innan beställning om du är osäker på reglerna i ditt land.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Miljöansvar</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3">🌱 Miljövänlig leverans</h3>
                <ul className="text-green-800 space-y-2">
                  <li>• Vi använder återvinningsbart förpackningsmaterial</li>
                  <li>• Minimal förpackning för att minska miljöpåverkan</li>
                  <li>• Klimatkompenserade transporter när möjligt</li>
                  <li>• Samarbete med miljöcertifierade leveranspartners</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Kontakt</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Frågor om leverans?</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Kontaktuppgifter:</h4>
                    <p className="text-sm">
                      JPH Innovation AB<br />
                      Östergatan 30c<br />
                      152 43 Södertälje<br />
                      E-post: info@jphinnovation.se<br />
                      Telefon: [Telefonnummer]
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Kundtjänst:</h4>
                    <p className="text-sm">
                      Måndag-Fredag: 09:00-17:00<br />
                      Lördag: 10:00-15:00<br />
                      Söndag: Stängt<br />
                      <em>Svarstid: Inom 24 timmar</em>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link 
              to={getCountryAwareUrl("")} 
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

export default ShippingInfo; 