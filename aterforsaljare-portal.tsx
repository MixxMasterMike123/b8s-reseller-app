import React, { useState, useEffect } from 'react';

const AterforsaljarePortal = () => {
  // States för användarval
  const [farger, setFarger] = useState({
    transparent: false,
    rod: false,
    florerande: false,
    glitter: false,
    alla: false
  });
  
  const [storlekar, setStorlekar] = useState({
    storlek2: false,
    storlek4: false,
    storlek6: false,
    alla: false
  });
  
  const [antalForpackningar, setAntalForpackningar] = useState(null);
  const [marginal, setMarginal] = useState(35); // Default 35% marginal
  const [fordelningsTyp, setFordelningsTyp] = useState('jamn'); // 'jamn' eller 'perFarg'
  
  // Konstanter för beräkningar
  const FORSALJNINGSPRIS_INKL_MOMS = 89; // kr per förpackning inkl moms
  const FORSALJNINGSPRIS = FORSALJNINGSPRIS_INKL_MOMS / 1.25; // kr per förpackning exkl moms
  const TILLVERKNINGSKOSTNAD = 10; // kr per förpackning
  
  // Hantera färgval
  const handleFargerChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'alla') {
      setFarger({
        transparent: checked,
        rod: checked,
        florerande: checked,
        glitter: checked,
        alla: checked
      });
    } else {
      const newFarger = { ...farger, [name]: checked };
      // Uppdatera "Alla" baserat på om alla individuella val är markerade
      newFarger.alla = newFarger.transparent && newFarger.rod && newFarger.florerande && newFarger.glitter;
      setFarger(newFarger);
    }
  };
  
  // Hantera storleksval
  const handleStorlekarChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'alla') {
      setStorlekar({
        storlek2: checked,
        storlek4: checked,
        storlek6: checked,
        alla: checked
      });
    } else {
      const newStorlekar = { ...storlekar, [name]: checked };
      // Uppdatera "Alla" baserat på om alla individuella val är markerade
      newStorlekar.alla = newStorlekar.storlek2 && newStorlekar.storlek4 && newStorlekar.storlek6;
      setStorlekar(newStorlekar);
    }
  };
  
  // Hantera val av antal förpackningar - nu med fast 35% marginal
  const handleAntalChange = (antal) => {
    setAntalForpackningar(antal);
    // Fast 35% marginal, oavsett antal
    setMarginal(35);
  };
  
  // Hantera egen input av antal förpackningar
  const handleCustomAntalChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAntalForpackningar(value);
      setMarginal(35);
    }
  };
  
  // Beräkna inköpspris baserat på marginal
  const calculateInkopspris = () => {
    return FORSALJNINGSPRIS * 0.65; // Fast 35% marginal (100% - 35% = 65% av exkl. moms pris)
  };
  
  // Antal valda färger
  const antalFarger = Object.entries(farger)
    .filter(([key, val]) => val && key !== 'alla')
    .length;
  
  // Antal valda storlekar
  const antalStorlekar = Object.entries(storlekar)
    .filter(([key, val]) => val && key !== 'alla')
    .length;
  
  // Beräkna totalpris och vinst
  const inkopspris = calculateInkopspris();
  const totalPris = antalForpackningar ? inkopspris * antalForpackningar : 0;
  const vinst = antalForpackningar ? (inkopspris - TILLVERKNINGSKOSTNAD) * antalForpackningar : 0;
  
  // Kontrollera om tillräckligt många val är gjorda
  const isFormComplete = antalFarger > 0 && antalStorlekar > 0 && antalForpackningar !== null;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Återförsäljarportal</h1>
      
      <div className="mb-8 p-4 border border-gray-200 rounded">
        <h2 className="text-xl font-semibold mb-4">Välj antal färger:</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="transparent"
              checked={farger.transparent}
              onChange={handleFargerChange}
              className="h-5 w-5"
            />
            <span>Transparent</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="rod"
              checked={farger.rod}
              onChange={handleFargerChange}
              className="h-5 w-5"
            />
            <span>Röd</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="florerande"
              checked={farger.florerande}
              onChange={handleFargerChange}
              className="h-5 w-5"
            />
            <span>Florerande</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="glitter"
              checked={farger.glitter}
              onChange={handleFargerChange}
              className="h-5 w-5"
            />
            <span>Glitter</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alla"
              checked={farger.alla}
              onChange={handleFargerChange}
              className="h-5 w-5"
            />
            <span>Alla</span>
          </label>
        </div>
      </div>
      
      <div className="mb-8 p-4 border border-gray-200 rounded">
        <h2 className="text-xl font-semibold mb-4">Välj storlekar:</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="storlek2"
              checked={storlekar.storlek2}
              onChange={handleStorlekarChange}
              className="h-5 w-5"
            />
            <span>Storlek 2</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="storlek4"
              checked={storlekar.storlek4}
              onChange={handleStorlekarChange}
              className="h-5 w-5"
            />
            <span>Storlek 4</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="storlek6"
              checked={storlekar.storlek6}
              onChange={handleStorlekarChange}
              className="h-5 w-5"
            />
            <span>Storlek 6</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alla"
              checked={storlekar.alla}
              onChange={handleStorlekarChange}
              className="h-5 w-5"
            />
            <span>Alla</span>
          </label>
        </div>
        
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm">
          <p>Vi rekommenderar att man beställer alla 3 storlekar (2, 4 och 6) för att tillmötesgå kundernas olika behov.</p>
        </div>
      </div>
      
      <div className="mb-8 p-4 border border-gray-200 rounded">
        <h2 className="text-xl font-semibold mb-4">Välj antal förpackningar:</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[100, 300, 600, 1000].map((antal) => (
            <button
              key={antal}
              onClick={() => handleAntalChange(antal)}
              className={`p-3 border rounded-lg text-center ${
                antalForpackningar === antal 
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {antal.toLocaleString('sv-SE')}
            </button>
          ))}
        </div>
        
        <div className="mt-4">
          <label className="block mb-2 font-medium">Eller ange eget antal:</label>
          <div className="flex">
            <input
              type="number"
              min="1"
              placeholder="Ange antal"
              value={antalForpackningar || ''}
              onChange={handleCustomAntalChange}
              className="p-3 border rounded-lg w-full md:w-1/3"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-8 p-4 border border-gray-200 rounded bg-blue-50">
        <h2 className="text-xl font-semibold mb-2">Information om prissättning</h2>
        <p>Alla priser är exklusive moms och beräknas med en fast marginal på 35%.</p>
      </div>
      
      {isFormComplete && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Resultat</h2>
          
          <div className="mb-6">
            <h3 className="font-medium text-lg">Din order:</h3>
            <ul className="mt-2 space-y-1">
              <li>Färger: {antalFarger} st (
                {Object.entries(farger)
                  .filter(([key, val]) => val && key !== 'alla')
                  .map(([key]) => {
                    switch(key) {
                      case 'transparent': return 'Transparent';
                      case 'rod': return 'Röd';
                      case 'florerande': return 'Florerande';
                      case 'glitter': return 'Glitter';
                      default: return '';
                    }
                  })
                  .join(', ')
                }
              )</li>
              <li>Storlekar: {antalStorlekar} st (
                {Object.entries(storlekar)
                  .filter(([key, val]) => val && key !== 'alla')
                  .map(([key]) => {
                    switch(key) {
                      case 'storlek2': return 'Storlek 2';
                      case 'storlek4': return 'Storlek 4';
                      case 'storlek6': return 'Storlek 6';
                      default: return '';
                    }
                  })
                  .join(', ')
                }
              )</li>
              <li>Antal förpackningar: {antalForpackningar}</li>
            </ul>
          </div>
          
          <div className="mb-6 p-4 bg-white rounded border border-gray-200">
            <h3 className="font-medium text-lg mb-3">Välj fördelningstyp:</h3>
            <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="fordelningsTyp"
                  value="jamn"
                  checked={fordelningsTyp === 'jamn'}
                  onChange={(e) => setFordelningsTyp(e.target.value)}
                  className="h-5 w-5"
                />
                <span>Jämn fördelning av alla kombinationer</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="fordelningsTyp"
                  value="perFarg"
                  checked={fordelningsTyp === 'perFarg'}
                  onChange={(e) => setFordelningsTyp(e.target.value)}
                  className="h-5 w-5"
                />
                <span>Lika många av varje färg</span>
              </label>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-white rounded border border-gray-200">
            <h3 className="font-medium text-lg mb-3">Din förpackningsfördelning:</h3>
            {fordelningsTyp === 'jamn' ? (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  Fördelningen nedan visar hur många förpackningar du får av varje färg och storlek.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Färg</th>
                        <th className="p-2 text-left">Storlek</th>
                        <th className="p-2 text-right">Antal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(farger)
                        .filter(([key, val]) => val && key !== 'alla')
                        .map(([colorKey, _]) => {
                          const colorName = {
                            transparent: 'Transparent',
                            rod: 'Röd',
                            florerande: 'Florerande',
                            glitter: 'Glitter'
                          }[colorKey];
                          
                          return Object.entries(storlekar)
                            .filter(([key, val]) => val && key !== 'alla')
                            .map(([sizeKey, _], sizeIndex) => {
                              const sizeName = {
                                storlek2: 'Storlek 2',
                                storlek4: 'Storlek 4',
                                storlek6: 'Storlek 6'
                              }[sizeKey];
                              
                              const totalCombinations = antalFarger * antalStorlekar;
                              const perCombination = Math.floor(antalForpackningar / totalCombinations);
                              const remainder = antalForpackningar % totalCombinations;
                              
                              // Beräkna index för denna kombination
                              const colorIndex = Object.keys(farger)
                                .filter(k => k !== 'alla')
                                .findIndex(k => k === colorKey);
                              
                              const combinationIndex = colorIndex * antalStorlekar + sizeIndex;
                              let quantity = perCombination;
                              
                              // Fördela resten jämnt på de första kombinationerna
                              if (combinationIndex < remainder) {
                                quantity += 1;
                              }
                              
                              return (
                                <tr key={`${colorKey}-${sizeKey}`} className="border-b">
                                  <td className="p-2">{colorName}</td>
                                  <td className="p-2">{sizeName}</td>
                                  <td className="p-2 text-right">{quantity} st</td>
                                </tr>
                              );
                            });
                        }).flat()}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="2" className="p-2 font-semibold">Totalt</td>
                        <td className="p-2 text-right font-semibold">{antalForpackningar} st</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  Fördelningen nedan visar hur många förpackningar du får av varje färg, jämnt fördelat över de valda storlekarna.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Färg</th>
                        <th className="p-2 text-right">Antal per färg</th>
                        <th className="p-2">Storlekar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(farger)
                        .filter(([key, val]) => val && key !== 'alla')
                        .map(([colorKey, _], index) => {
                          const colorName = {
                            transparent: 'Transparent',
                            rod: 'Röd',
                            florerande: 'Florerande',
                            glitter: 'Glitter'
                          }[colorKey];
                          
                          const packagesPerColor = Math.floor(antalForpackningar / antalFarger);
                          const colorRemainder = antalForpackningar % antalFarger;
                          
                          let quantityPerColor = packagesPerColor;
                          if (index < colorRemainder) {
                            quantityPerColor += 1;
                          }
                          
                          // Beräkna fördelning per storlek
                          const packagesPerSize = Math.floor(quantityPerColor / antalStorlekar);
                          const sizeRemainder = quantityPerColor % antalStorlekar;
                          
                          const storleksInfo = Object.entries(storlekar)
                            .filter(([key, val]) => val && key !== 'alla')
                            .map(([sizeKey, _], sizeIndex) => {
                              const sizeName = {
                                storlek2: '2',
                                storlek4: '4',
                                storlek6: '6'
                              }[sizeKey];
                              
                              let quantityPerSize = packagesPerSize;
                              if (sizeIndex < sizeRemainder) {
                                quantityPerSize += 1;
                              }
                              
                              return `${quantityPerSize} st i storlek ${sizeName}`;
                            })
                            .join(', ');
                          
                          return (
                            <tr key={colorKey} className="border-b">
                              <td className="p-2">{colorName}</td>
                              <td className="p-2 text-right">{quantityPerColor} st</td>
                              <td className="p-2 text-sm">{storleksInfo}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="1" className="p-2 font-semibold">Totalt</td>
                        <td colSpan="2" className="p-2 text-right font-semibold">{antalForpackningar} st</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white rounded border border-gray-200">
              <h3 className="font-bold text-lg mb-3">Inköpspris med 35% marginal:</h3>
              <p className="mb-2">
                Försäljningspris per förpackning (exkl. moms): {FORSALJNINGSPRIS.toFixed(2)} kr
              </p>
              <p className="mb-2">
                Inköpspris per förpackning (exkl. moms): {inkopspris.toFixed(2)} kr
              </p>
              <p className="mb-2 font-semibold">
                Totalt inköpspris (exkl. moms): {totalPris.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </p>
            </div>
            
            <div className="p-4 bg-white rounded border border-gray-200">
              <h3 className="font-bold text-lg mb-3">Vinst efter tillverkningskostnad:</h3>
              <p className="mb-2">
                Tillverkningskostnad per förpackning (exkl. moms): {TILLVERKNINGSKOSTNAD.toFixed(2)} kr
              </p>
              <p className="mb-2">
                Vinst per förpackning (exkl. moms): {(inkopspris - TILLVERKNINGSKOSTNAD).toFixed(2)} kr
              </p>
              <p className="mb-2 font-semibold">
                Total vinst (exkl. moms): {vinst.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
              </p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Bekräfta beställning
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AterforsaljarePortal;
