import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const OrderPage = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { createOrder, PRODUCT_SETTINGS, generateOrderNumber } = useOrder();
  
  // State for products data
  const [products, setProducts] = useState([]);
  const [productColors, setProductColors] = useState([]);
  const [productSizes, setProductSizes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States from aterforsaljare-portal.tsx
  const [farger, setFarger] = useState({});
  const [storlekar, setStorlekar] = useState({});
  
  const [antalForpackningar, setAntalForpackningar] = useState(null);
  const [marginal, setMarginal] = useState(35); // Default 35% marginal
  const [fordelningsTyp, setFordelningsTyp] = useState('jamn'); // 'jamn' eller 'perFarg'
  const [loading, setLoading] = useState(false);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const productsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(productsQuery);
        
        const productsData = [];
        const colors = new Set();
        const sizes = new Set();
        const colorMap = new Map();
        const sizeMap = new Map();
        
        querySnapshot.forEach((doc) => {
          const product = { id: doc.id, ...doc.data() };
          productsData.push(product);
          
          // Extract color from name (assuming format like "B8Shield Transparent")
          const nameParts = product.name.split(' ');
          if (nameParts.length > 1) {
            const colorName = nameParts[1];
            // Convert to lowercase and remove special chars for ID
            const colorId = colorName.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            if (!colorMap.has(colorId)) {
              colorMap.set(colorId, { id: colorId, name: colorName });
              colors.add(colorId);
            }
          }
          
          // Extract size (assuming it's stored in the size field)
          if (product.size) {
            const sizeId = `storlek${product.size}`;
            if (!sizeMap.has(sizeId)) {
              sizeMap.set(sizeId, { id: sizeId, name: `Storlek ${product.size}` });
              sizes.add(sizeId);
            }
          }

          // If product has variants structure (backward compatibility)
          if (product.variants) {
            product.variants.forEach(variant => {
              if (variant.type === 'color' && variant.options) {
                variant.options.forEach(option => {
                  if (!colorMap.has(option.id)) {
                    colorMap.set(option.id, option);
                    colors.add(option.id);
                  }
                });
              }
              if (variant.type === 'size' && variant.options) {
                variant.options.forEach(option => {
                  if (!sizeMap.has(option.id)) {
                    sizeMap.set(option.id, option);
                    sizes.add(option.id);
                  }
                });
              }
            });
          }
        });
        
        // Convert maps to arrays
        const uniqueColors = Array.from(colorMap.values());
        const uniqueSizes = Array.from(sizeMap.values());
        
        console.log('Found colors:', uniqueColors);
        console.log('Found sizes:', uniqueSizes);
        
        setProducts(productsData);
        setProductColors(uniqueColors);
        setProductSizes(uniqueSizes);
        
        // Initialize farger state
        const initialFarger = {};
        uniqueColors.forEach(color => {
          initialFarger[color.id] = false;
        });
        initialFarger.alla = false;
        setFarger(initialFarger);
        
        // Initialize storlekar state
        const initialStorlekar = {};
        uniqueSizes.forEach(size => {
          initialStorlekar[size.id] = false;
        });
        initialStorlekar.alla = false;
        setStorlekar(initialStorlekar);
        
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Kunde inte hämta produkter från databasen');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Konstanter för beräkningar (now from context)
  const FORSALJNINGSPRIS_INKL_MOMS = PRODUCT_SETTINGS?.FORSALJNINGSPRIS_INKL_MOMS || 89; // kr per förpackning inkl moms
  const FORSALJNINGSPRIS = FORSALJNINGSPRIS_INKL_MOMS / 1.25; // kr per förpackning exkl moms
  const TILLVERKNINGSKOSTNAD = PRODUCT_SETTINGS?.TILLVERKNINGSKOSTNAD || 10; // kr per förpackning
  
  // Hantera färgval
  const handleFargerChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'alla') {
      const newFarger = { ...farger };
      Object.keys(newFarger).forEach(key => {
        newFarger[key] = checked;
      });
      setFarger(newFarger);
    } else {
      const newFarger = { ...farger, [name]: checked };
      // Uppdatera "Alla" baserat på om alla individuella val är markerade
      const allSelected = Object.keys(newFarger)
        .filter(key => key !== 'alla')
        .every(key => newFarger[key]);
      newFarger.alla = allSelected;
      setFarger(newFarger);
    }
  };
  
  // Hantera storleksval
  const handleStorlekarChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'alla') {
      const newStorlekar = { ...storlekar };
      Object.keys(newStorlekar).forEach(key => {
        newStorlekar[key] = checked;
      });
      setStorlekar(newStorlekar);
    } else {
      const newStorlekar = { ...storlekar, [name]: checked };
      // Uppdatera "Alla" baserat på om alla individuella val är markerade
      const allSelected = Object.keys(newStorlekar)
        .filter(key => key !== 'alla')
        .every(key => newStorlekar[key]);
      newStorlekar.alla = allSelected;
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

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!isFormComplete) {
      toast.error('Vänligen fyll i alla val innan du bekräftar ordern');
      return;
    }
    
    setLoading(true);
    
    try {
      // Format selected colors and sizes for display
      const selectedColors = Object.entries(farger)
        .filter(([key, val]) => val && key !== 'alla')
        .map(([key]) => {
          const foundColor = productColors.find(color => color.id === key);
          return foundColor ? foundColor.name : key;
        });
      
      const selectedSizes = Object.entries(storlekar)
        .filter(([key, val]) => val && key !== 'alla')
        .map(([key]) => {
          const foundSize = productSizes.find(size => size.id === key);
          return foundSize ? foundSize.name.replace('Storlek ', '') : key;
        });
      
      // Create distribution calculation
      let distribution = [];
      
      if (fordelningsTyp === 'jamn') {
        // Even distribution across all combinations
        const totalCombinations = antalFarger * antalStorlekar;
        const perCombination = Math.floor(antalForpackningar / totalCombinations);
        const remainder = antalForpackningar % totalCombinations;
        
        let combinationIndex = 0;
        
        selectedColors.forEach(color => {
          selectedSizes.forEach(size => {
            let quantity = perCombination;
            
            // Distribute remainder evenly among the first combinations
            if (combinationIndex < remainder) {
              quantity += 1;
            }
            
            distribution.push({
              color,
              size,
              quantity
            });
            
            combinationIndex++;
          });
        });
      } else {
        // Equal number of each color, distributed across sizes
        const packagesPerColor = Math.floor(antalForpackningar / antalFarger);
        const colorRemainder = antalForpackningar % antalFarger;
        
        selectedColors.forEach((color, colorIndex) => {
          let quantityPerColor = packagesPerColor;
          if (colorIndex < colorRemainder) {
            quantityPerColor += 1;
          }
          
          // Calculate distribution per size
          const packagesPerSize = Math.floor(quantityPerColor / antalStorlekar);
          const sizeRemainder = quantityPerColor % antalStorlekar;
          
          selectedSizes.forEach((size, sizeIndex) => {
            let quantityPerSize = packagesPerSize;
            if (sizeIndex < sizeRemainder) {
              quantityPerSize += 1;
            }
            
            distribution.push({
              color,
              size,
              quantity: quantityPerSize
            });
          });
        });
      }
      
      // Calculate total VAT (moms) at 25%
      const produktPris = totalPris;
      const moms = produktPris * 0.25;
      const totalPrisInklMoms = produktPris + moms;
      
      // Get a main color and size for the order summary display
      const mainColor = selectedColors[0] || '';
      const mainSize = selectedSizes.join(', ');
      
      // Create the order object with fields that match what OrderDetailPage expects
      const orderData = {
        // Basic order info
        orderNumber: generateOrderNumber(),
        antalForpackningar: antalForpackningar,
        color: selectedColors.join(', '),
        size: mainSize,
        
        // Company information from user profile
        companyName: userProfile?.companyName || '',
        contactName: userProfile?.displayName || currentUser?.displayName || '',
        address: userProfile?.address || '',
        postalCode: userProfile?.postalCode || '',
        city: userProfile?.city || '',
        
        // Payment information
        paymentMethod: 'Faktura',
        
        // Price information in a structured format
        prisInfo: {
          produktPris: produktPris,
          moms: moms,
          totalPris: totalPrisInklMoms
        },
        
        // Detailed information about the order
        orderDetails: {
          colors: selectedColors,
          sizes: selectedSizes,
          distribution: distribution,
          distributionType: fordelningsTyp,
          margin: marginal,
          pricePerPackage: inkopspris,
          profit: vinst,
          sellingPrice: FORSALJNINGSPRIS,
          manufacturingCost: TILLVERKNINGSKOSTNAD
        }
      };
      
      // Submit order to Firestore
      const order = await createOrder(orderData);
      
      toast.success('Order skapad!');
      navigate(`/orders/${order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Ett fel uppstod när ordern skulle skapas. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Återförsäljarportal</h1>
      
      <div className="mb-8 p-4 border border-gray-200 rounded">
        <h2 className="text-xl font-semibold mb-4">Välj antal färger:</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {productColors.map(color => (
            <label key={color.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                name={color.id}
                checked={farger[color.id] || false}
                onChange={handleFargerChange}
                className="h-5 w-5"
              />
              <span>{color.name}</span>
            </label>
          ))}
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alla"
              checked={farger.alla || false}
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
          {productSizes.map(size => (
            <label key={size.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                name={size.id}
                checked={storlekar[size.id] || false}
                onChange={handleStorlekarChange}
                className="h-5 w-5"
              />
              <span>{size.name}</span>
            </label>
          ))}
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="alla"
              checked={storlekar.alla || false}
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
                    const foundColor = productColors.find(color => color.id === key);
                    return foundColor ? foundColor.name : key;
                  })
                  .join(', ')
                }
              )</li>
              <li>Storlekar: {antalStorlekar} st (
                {Object.entries(storlekar)
                  .filter(([key, val]) => val && key !== 'alla')
                  .map(([key]) => {
                    const foundSize = productSizes.find(size => size.id === key);
                    return foundSize ? foundSize.name : key;
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
                          const foundColor = productColors.find(color => color.id === colorKey);
                          const colorName = foundColor ? foundColor.name : colorKey;
                          
                          return Object.entries(storlekar)
                            .filter(([key, val]) => val && key !== 'alla')
                            .map(([sizeKey, _], sizeIndex) => {
                              const foundSize = productSizes.find(size => size.id === sizeKey);
                              const sizeName = foundSize ? foundSize.name : sizeKey;
                              
                              const totalCombinations = antalFarger * antalStorlekar;
                              const perCombination = Math.floor(antalForpackningar / totalCombinations);
                              const remainder = antalForpackningar % totalCombinations;
                              
                              // Beräkna index för denna kombination
                              const colorIndex = Object.keys(farger)
                                .filter(k => k !== 'alla' && farger[k])
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
                        <td colSpan={2} className="p-2 font-semibold">Totalt</td>
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
                          const foundColor = productColors.find(color => color.id === colorKey);
                          const colorName = foundColor ? foundColor.name : colorKey;
                          
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
                              const foundSize = productSizes.find(size => size.id === sizeKey);
                              const sizeName = foundSize ? 
                                foundSize.name.replace('Storlek ', '') : 
                                sizeKey.replace('storlek', '');
                              
                              let quantityPerSize = packagesPerSize;
                              if (sizeIndex < sizeRemainder) {
                                quantityPerSize += 1;
                              }
                              
                              return `${quantityPerSize} st i ${sizeName}`;
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
                        <td colSpan={1} className="p-2 font-semibold">Totalt</td>
                        <td colSpan={2} className="p-2 text-right font-semibold">{antalForpackningar} st</td>
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
          </div>
          
          <div className="mt-6 text-center">
            <button 
              onClick={handleSubmitOrder}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bearbetar...' : 'Bekräfta beställning'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage; 