import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import ProductMenu from '../components/ProductMenu';
import AppLayout from '../components/layout/AppLayout';

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
  const [marginal, setMarginal] = useState(null); // Will be set from user profile
  const [fordelningsTyp, setFordelningsTyp] = useState('jamn'); // 'jamn' eller 'perFarg'
  const [loading, setLoading] = useState(false);

  // Set margin from user profile when available
  useEffect(() => {
    if (userProfile && userProfile.marginal) {
      setMarginal(userProfile.marginal);
    }
  }, [userProfile]);

  // Add state for selected product  
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Sort functions to ensure correct display order
  const sortColorOptions = (colors) => {
    // Define the preferred order to match hardcoded checkboxes - Transparent, Röd, Fluorescerande, Glitter
    const colorOrder = ['transparent', 'rod', 'fluorescerande', 'glitter'];
    
    // Sort the colors based on the preferred order
    return [...colors].sort((a, b) => {
      const indexA = colorOrder.indexOf(a.id.toLowerCase());
      const indexB = colorOrder.indexOf(b.id.toLowerCase());
      
      // If both colors are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one color is in the order array, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither color is in the array, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  const sortSizeOptions = (sizes) => {
    // Define the preferred order - we'll extract the size number for comparison
    const getSizeNumber = (sizeId) => {
      // Extract the number from "storlek2", "storlek4", etc.
      const match = sizeId.match(/storlek(\d+)/i);
      return match ? parseInt(match[1]) : 999; // Default to a high number if no match
    };
    
    // Sort sizes in ascending numerical order (2, 4, 6)
    return [...sizes].sort((a, b) => {
      return getSizeNumber(a.id) - getSizeNumber(b.id);
    });
  };

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        // Get all products, then filter for B2B availability (like ProductViewPage does)
        const querySnapshot = await getDocs(collection(db, 'products'));
        
        const productsData = [];
        const colors = new Set();
        const sizes = new Set();
        const colorMap = new Map();
        const sizeMap = new Map();
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          // Only show active products that are available for B2B
          if (productData.isActive !== false && productData.availability?.b2b !== false) {
            const product = { id: doc.id, ...productData };
            productsData.push(product);
            
            // Extract color from name (assuming format like "B8Shield Transparent")
            const nameParts = product.name.split(' ');
            if (nameParts.length > 1) {
              const colorName = nameParts[1];
              // Handle Swedish characters properly and convert to lowercase
              let colorId = colorName.toLowerCase();
              
              // Map specific color names to match hardcoded checkbox IDs
              if (colorId === 'fluorescent' || colorId === 'fluorescerande') {
                colorId = 'fluorescerande';
              } else if (colorId === 'röd' || colorId === 'red') {
                colorId = 'rod';
              } else if (colorId === 'transparent') {
                colorId = 'transparent';
              } else if (colorId === 'glitter') {
                colorId = 'glitter';
              } else {
                // For any other colors, remove non-alphanumeric but preserve basic Swedish chars
                colorId = colorId.replace(/[^a-z0-9öäåé]/g, '');
              }
              
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
                    let variantColorId = option.id.toLowerCase();
                    
                    // Map variant color IDs to match hardcoded checkbox IDs
                    if (variantColorId === 'fluorescent' || variantColorId === 'fluorescerande') {
                      variantColorId = 'fluorescerande';
                    } else if (variantColorId === 'röd' || variantColorId === 'red') {
                      variantColorId = 'rod';
                    } else if (variantColorId === 'transparent') {
                      variantColorId = 'transparent';
                    } else if (variantColorId === 'glitter') {
                      variantColorId = 'glitter';
                    }
                    
                    if (!colorMap.has(variantColorId)) {
                      colorMap.set(variantColorId, { ...option, id: variantColorId });
                      colors.add(variantColorId);
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
          }
        });
        
        // Convert maps to arrays and sort them in the desired order
        const uniqueColors = sortColorOptions(Array.from(colorMap.values()));
        const uniqueSizes = sortSizeOptions(Array.from(sizeMap.values()));
        
        console.log('📊 B2B products loaded:', productsData.length);
        console.log('🎨 Available colors for B2B:', uniqueColors);
        console.log('📏 Available sizes for B2B:', uniqueSizes);
        
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
  
  // Hantera val av antal förpackningar - använder kundens personliga marginal
  const handleAntalChange = (antal) => {
    setAntalForpackningar(antal);
    // Margin kommer från användarens profil via useEffect
  };
  
  // Hantera egen input av antal förpackningar
  const handleCustomAntalChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAntalForpackningar(value);
      // Margin kommer från användarens profil via useEffect
    }
  };
  
  // Beräkna inköpspris baserat på marginal
  const calculateInkopspris = () => {
    if (!marginal) return FORSALJNINGSPRIS * 0.6; // Default 40% margin if not set
    const marginDecimal = marginal / 100;
    return FORSALJNINGSPRIS * (1 - marginDecimal); // Dynamic margin calculation
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
        orderNumber: generateOrderNumber(),
        source: 'b2b',
        userId: currentUser.uid,
        status: 'pending',
        items: distribution.map(item => ({
          name: "B8 Shield",
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: inkopspris
        })),
        fordelning: distribution,
        antalForpackningar: antalForpackningar,
        color: selectedColors.join(', '),
        size: mainSize,
        
        // Company information from user profile
        companyName: userProfile?.companyName || '',
        contactName: userProfile?.contactPerson || userProfile?.displayName || currentUser?.displayName || '',
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
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Återförsäljarportal</h1>
        
        <div className="mb-8 p-4 border border-gray-200 rounded">
          <h2 className="text-xl font-semibold mb-4">Välj antal färger:</h2>
          
          {/* Display product images for colors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(() => {
              // First, group products by color
              const colorMatches = {
                'Transparent': 'transparent',
                'Röd': 'rod',
                'Red': 'rod',
                'Fluorescent': 'florerande',
                'Glitter': 'glitter'
              };
              
              // Log all products for debugging
              console.log("All products:", products.map(p => ({ id: p.id, name: p.name })));
              
              // Create color buckets - we need to manually create one for each color
              const colorProducts = {
                'transparent': null,
                'rod': null,
                'florerande': null,
                'glitter': null
              };
              
              // Find one product for each color
              products.filter(p => p.imageData).forEach(product => {
                // Skip if no name
                if (!product.name) return;
                
                console.log("Checking product:", product.name);
                
                // Check for Transparent
                if (product.name.includes("Transparent")) {
                  if (!colorProducts['transparent']) {
                    colorProducts['transparent'] = product;
                    console.log(`  Added to map: transparent = ${product.name}`);
                  }
                }
                // Check for Red variants
                else if (product.name.includes("Röd") || product.name.includes("Red") || 
                        product.name.toLowerCase().includes("rod") || product.name.includes("RED")) {
                  if (!colorProducts['rod']) {
                    colorProducts['rod'] = product;
                    console.log(`  Added to map: rod = ${product.name}`);
                  }
                }
                // Check for Fluorescent variants
                else if (product.name.includes("Fluorescent") || product.name.includes("Fluor")) {
                  if (!colorProducts['florerande']) {
                    colorProducts['florerande'] = product;
                    console.log(`  Added to map: florerande = ${product.name}`);
                  }
                }
                // Check for Glitter
                else if (product.name.includes("Glitter")) {
                  if (!colorProducts['glitter']) {
                    colorProducts['glitter'] = product;
                    console.log(`  Added to map: glitter = ${product.name}`);
                  }
                }
              });
              
              // Check if we have all expected colors and log the collected info
              console.log("Collected color products:", Object.entries(colorProducts)
                .map(([id, p]) => `${id}: ${p ? p.name : 'missing'}`));
              
              // Render one product per color (only if we have a product for that color)
              return Object.entries(colorProducts)
                .filter(([_, product]) => product !== null)
                .map(([colorId, product]) => (
                  <div key={product.id} className="text-center">
                    <img 
                      src={product.imageData} 
                      alt={product.name} 
                      className={`w-full h-40 object-cover rounded mb-2 border-2 ${farger[colorId] ? 'border-blue-500' : 'border-transparent'}`} 
                    />
                    <p className="text-sm font-medium">{product.name}</p>
                  </div>
                ));
            })()}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Manually define the order to ensure correct display */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="transparent"
                checked={farger["transparent"] || false}
                onChange={handleFargerChange}
                className="h-5 w-5"
              />
              <span>Transparent</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="rod"
                checked={farger["rod"] || false}
                onChange={handleFargerChange}
                className="h-5 w-5"
              />
              <span>Röd</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="fluorescerande"
                checked={farger["fluorescerande"] || false}
                onChange={handleFargerChange}
                className="h-5 w-5"
              />
              <span>Fluorescent</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="glitter"
                checked={farger["glitter"] || false}
                onChange={handleFargerChange}
                className="h-5 w-5"
              />
              <span>Glitter</span>
            </label>
            
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
            {/* Manually define the order to ensure correct display */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="storlek2"
                checked={storlekar["storlek2"] || false}
                onChange={handleStorlekarChange}
                className="h-5 w-5"
              />
              <span>Storlek 2</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="storlek4"
                checked={storlekar["storlek4"] || false}
                onChange={handleStorlekarChange}
                className="h-5 w-5"
              />
              <span>Storlek 4</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="storlek6"
                checked={storlekar["storlek6"] || false}
                onChange={handleStorlekarChange}
                className="h-5 w-5"
              />
              <span>Storlek 6</span>
            </label>
            
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
          <h2 className="text-xl font-semibold mb-4">Välj specifik produkt (valfritt):</h2>
          <div className="mb-4">
            <ProductMenu 
              products={products} 
              selectedProduct={selectedProduct} 
              onProductSelect={(product) => {
                setSelectedProduct(product);
                // Auto-select color and size based on the product
                if (product) {
                  const newFarger = { ...farger };
                  const newStorlekar = { ...storlekar };
                  
                  // Reset all selections
                  Object.keys(newFarger).forEach(key => {
                    newFarger[key] = false;
                  });
                  Object.keys(newStorlekar).forEach(key => {
                    newStorlekar[key] = false;
                  });
                  
                  // Set color based on product name
                  if (product.name) {
                    const name = product.name.toLowerCase();
                    if (name.includes('transparent')) {
                      newFarger.transparent = true;
                    } else if (name.includes('röd') || name.includes('red') || name.includes('rod')) {
                      newFarger.rod = true;  // Always use mapped ID 'rod'
                    } else if (name.includes('fluor')) {
                      newFarger.fluorescerande = true;  // Always use mapped ID 'fluorescerande'
                    } else if (name.includes('glitter')) {
                      newFarger.glitter = true;
                    }
                  }
                  
                  // Set size based on product size
                  if (product.size) {
                    const sizeKey = `storlek${product.size}`;
                    if (Object.keys(newStorlekar).includes(sizeKey)) {
                      newStorlekar[sizeKey] = true;
                    }
                  }
                  
                  setFarger(newFarger);
                  setStorlekar(newStorlekar);
                }
              }} 
            />
          </div>
          {selectedProduct && (
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium">Vald produkt: {selectedProduct.name}</p>
              {selectedProduct.size && <p>Storlek: {selectedProduct.size}</p>}
              {selectedProduct.basePrice && <p>Pris (exkl. moms): {selectedProduct.basePrice.toFixed(2)} SEK</p>}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Återställ val
              </button>
            </div>
          )}
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
          <p>Alla priser är exklusive moms och beräknas med din personliga marginal på {marginal || 40}%.</p>
          {(marginal || 40) === 40 && (
            <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
              <p className="text-orange-800 font-semibold">
                🎉 Just nu introduktionspris, endast under en kortare period, under fiskesäsong 2025
              </p>
            </div>
          )}
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
                <h3 className="font-bold text-lg mb-3">Inköpspris med {marginal || 40}% marginal:</h3>
                {(marginal || 40) === 40 && (
                  <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-sm">
                    <p className="text-green-800">
                      🎉 Just nu introduktionspris, endast under en kortare period, under fiskesäsong 2025
                    </p>
                  </div>
                )}
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
    </AppLayout>
  );
};

export default OrderPage; 