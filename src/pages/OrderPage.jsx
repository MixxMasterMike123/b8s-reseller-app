import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';

const OrderPage = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { createOrder, PRODUCT_SETTINGS, generateOrderNumber } = useOrder();
  
  // State for products data
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Individual ordering state - each color has its own quantity per size
  const [orderItems, setOrderItems] = useState({
    transparent: {
      active: false,
      sizes: { 2: 0, 4: 0, 6: 0 }
    },
    rod: {
      active: false, 
      sizes: { 2: 0, 4: 0, 6: 0 }
    },
    fluorescerande: {
      active: false,
      sizes: { 2: 0, 4: 0, 6: 0 }
    },
    glitter: {
      active: false,
      sizes: { 2: 0, 4: 0, 6: 0 }
    }
  });

  const [marginal, setMarginal] = useState(null);

  // Set margin from user profile when available
  useEffect(() => {
    if (userProfile && userProfile.marginal) {
      setMarginal(userProfile.marginal);
    }
  }, [userProfile]);

  // Helper function to get color display name
  const getColorDisplayName = (colorId) => {
    const colorNames = {
      transparent: 'Transparent',
      rod: 'Röd', 
      fluorescerande: 'Fluorescerande',
      glitter: 'Glitter'
    };
    return colorNames[colorId] || colorId;
  };

  // Helper function to get product image for color representation
  const getColorProduct = (colorId) => {
    // Map colorId to actual database color field values
    const getColorFieldValue = (colorId) => {
      switch(colorId) {
        case 'transparent':
          return 'Transparent';
        case 'rod':
          return 'Röd';
        case 'fluorescerande':
          return 'Fluorescerande';
        case 'glitter':
          return 'Glitter';
        default:
          return '';
      }
    };
    
    const targetColor = getColorFieldValue(colorId);
    if (!targetColor) return null;
    
    // Find SIZE 4 product for the color as standard representation
    const size4Product = products.find(p => {
      return p.size === '4' && p.color === targetColor;
    });
    
    // Fallback: any product with the color if no SIZE 4 found
    if (!size4Product) {
      return products.find(p => p.color === targetColor);
    }
    
    return size4Product;
  };

  // Helper function to update individual item quantities
  const updateItemQuantity = (colorId, size, quantity) => {
    setOrderItems(prev => {
      const newItems = { ...prev };
      newItems[colorId] = {
        ...newItems[colorId],
        sizes: {
          ...newItems[colorId].sizes,
          [size]: Math.max(0, quantity) // Ensure no negative quantities
        }
      };
      
      // Update active status based on whether any quantities > 0
      const hasQuantities = Object.values(newItems[colorId].sizes).some(qty => qty > 0);
      newItems[colorId].active = hasQuantities;
      
      return newItems;
    });
  };

  // Helper function to handle quantity button clicks
  const handleQuantityButton = (colorId, size, quantity) => {
    updateItemQuantity(colorId, size, quantity);
  };

  // Helper function to handle custom quantity input
  const handleCustomQuantity = (colorId, size, value) => {
    const quantity = parseInt(value) || 0;
    updateItemQuantity(colorId, size, quantity);
  };

  // Calculate order totals
  const calculateTotals = () => {
    let totalPackages = 0;
    let totalActiveColors = 0;
    let orderLines = [];

    Object.entries(orderItems).forEach(([colorId, colorData]) => {
      if (colorData.active) {
        totalActiveColors++;
        
        Object.entries(colorData.sizes).forEach(([size, quantity]) => {
          if (quantity > 0) {
            totalPackages += quantity;
            orderLines.push({
              colorId,
              colorName: getColorDisplayName(colorId),
              size: parseInt(size),
              quantity
            });
          }
        });
      }
    });

    return { totalPackages, totalActiveColors, orderLines };
  };

  // Calculate purchase price based on margin
  const calculateInkopspris = () => {
    // Calculate selling price excluding VAT from the inclusive price
    const FORSALJNINGSPRIS = PRODUCT_SETTINGS.FORSALJNINGSPRIS_INKL_MOMS / 1.25;
    
    if (!marginal) return FORSALJNINGSPRIS * 0.6; // Default 40% margin
    const marginDecimal = marginal / 100;
    return FORSALJNINGSPRIS * (1 - marginDecimal);
  };

  // Get order totals
  const { totalPackages, totalActiveColors, orderLines } = calculateTotals();
  const inkopspris = calculateInkopspris();
  const totalPris = totalPackages * inkopspris;
  const vinst = totalPackages * (inkopspris - PRODUCT_SETTINGS.TILLVERKNINGSKOSTNAD);

  // Check if form is complete with minimum order validation
  const MINIMUM_ORDER_QUANTITY = 10;
  const isFormComplete = totalPackages >= MINIMUM_ORDER_QUANTITY;
  const remainingQuantity = Math.max(0, MINIMUM_ORDER_QUANTITY - totalPackages);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const querySnapshot = await getDocs(collection(db, 'products'));
        
        const productsData = [];
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          // Only show active products that are available for B2B
          if (productData.isActive !== false && productData.availability?.b2b !== false) {
            const product = { id: doc.id, ...productData };
          productsData.push(product);
          }
        });
        
        console.log('📊 B2B products loaded for individual ordering:', productsData.length);
        setProducts(productsData);
        
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Ett fel uppstod när produkterna skulle hämtas');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (totalPackages < MINIMUM_ORDER_QUANTITY) {
      toast.error(
        `Du har beställt för få förpackningar (${totalPackages}), beställ minst ${remainingQuantity} st till för att nå minst ${MINIMUM_ORDER_QUANTITY} förpackningar`
      );
      return;
    }
    
    setLoading(true);
    
    try {
      // Create order items from individual selections
      const items = orderLines.map(line => ({
        name: "B8 Shield",
        color: line.colorName,
        size: line.size.toString(),
        quantity: line.quantity,
        price: inkopspris
      }));

      // Calculate totals
      const produktPris = totalPris;
      const moms = produktPris * 0.25;
      const totalPrisInklMoms = produktPris + moms;
      
      // Create the order object
      const orderData = {
        orderNumber: generateOrderNumber(),
        source: 'b2b',
        userId: currentUser.uid,
        status: 'pending',
        items: items,
        
        // Order summary info
        antalForpackningar: totalPackages,
        color: orderLines.map(line => line.colorName).join(', '),
        size: orderLines.map(line => line.size).join(', '),
        
        // Company information from user profile
        companyName: userProfile?.companyName || '',
        contactName: userProfile?.contactPerson || userProfile?.displayName || currentUser?.displayName || '',
        address: userProfile?.address || '',
        postalCode: userProfile?.postalCode || '',
        city: userProfile?.city || '',
        
        // Payment information
        paymentMethod: 'Faktura',
        
        // Price information
        prisInfo: {
          produktPris: produktPris,
          moms: moms,
          totalPris: totalPrisInklMoms
        },
        
        // Detailed information about the order
        orderDetails: {
          orderLines: orderLines,
          totalColors: totalActiveColors,
          margin: marginal,
          pricePerPackage: inkopspris,
          profit: vinst,
          sellingPrice: PRODUCT_SETTINGS.FORSALJNINGSPRIS_INKL_MOMS / 1.25,
          manufacturingCost: PRODUCT_SETTINGS.TILLVERKNINGSKOSTNAD
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
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">B2B Beställning - Individuell SKU-val</h1>
        
        {/* Main Grid Layout: Individual Products (2 cols) | Order Summary (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Individual Products Section - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
          
            <div className="mb-6">
              <h2 className="md:text-xl text-2xl font-semibold mb-4">Välj produkter och kvantiteter</h2>
              <p className="md:text-sm text-base text-gray-600 mb-4 leading-relaxed">
                Välj exakt hur många förpackningar du vill ha av varje färg och storlek. Bilder visar Storlek 4 som standardrepresentation.
              </p>
              
              {/* Friendly information box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg md:p-4 p-5 mb-4">
                <div className="flex items-start md:gap-3 gap-4">
                  <div className="flex-shrink-0 md:mt-0.5 mt-1">
                    <svg className="md:w-5 md:h-5 w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="md:text-sm text-base font-medium text-blue-900 mb-2">Så här fungerar beställningen</h3>
                    <ul className="md:text-sm text-base text-blue-800 md:space-y-1 space-y-2">
                      <li>• <strong>Minsta beställningsvolym:</strong> 10 förpackningar totalt</li>
                      <li>• <strong>Mix & match:</strong> Kombinera färger och storlekar precis som du vill</li>
                      <li className="md:block hidden">• <strong>Exempel:</strong> 5 st Röd Storlek 4 + 3 st Transparent Storlek 2 + 2 st Glitter Storlek 6 = 10 förpackningar ✓</li>
                      <li className="md:hidden block">• <strong>Exempel:</strong> 5 st Röd Storlek 4 + 3 st Transparent Storlek 2 + 2 st Glitter Storlek 6 = 10 förpackningar ✓</li>
                    </ul>
                  </div>
                </div>
              </div>
          </div>
          
            {/* Individual Color Cards */}
            <div className="space-y-6">
              {Object.keys(orderItems).map((colorId) => {
                const colorProduct = getColorProduct(colorId);
                const colorData = orderItems[colorId];
                const colorSubtotal = Object.values(colorData.sizes).reduce((sum, qty) => sum + qty, 0);
                
                return (
                                    <div key={colorId} className={`border rounded-lg md:p-6 p-4 ${colorData.active ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex flex-col md:flex-row md:gap-6 gap-4">
                      
                      {/* Product Image */}
                      <div className="flex-shrink-0 md:w-auto w-full">
                        <div className="text-center">
                          {colorProduct ? (
                            <img 
                              src={colorProduct.b2bImageUrl || colorProduct.imageUrl || colorProduct.imageData} 
                              alt={`${getColorDisplayName(colorId)} - B2B Förpackning`} 
                              className="md:w-32 md:h-32 w-40 h-40 mx-auto object-contain rounded-lg border-2 border-gray-200"
                            />
                          ) : (
                            <div className="md:w-32 md:h-32 w-40 h-40 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 md:text-sm text-base">Ingen bild</span>
                            </div>
                          )}
                          <h3 className="md:text-lg text-xl font-semibold mt-3 text-gray-800">
                            {getColorDisplayName(colorId)}
                          </h3>
                          {colorSubtotal > 0 && (
                            <div className="mt-2 bg-blue-600 text-white md:px-3 md:py-1 px-4 py-2 rounded-full md:text-sm text-base font-medium inline-block">
                              Totalt: {colorSubtotal} st
                            </div>
                          )}
                        </div>
                      </div>
        
                                            {/* Size Quantity Selectors */}
                      <div className="flex-1">
                        <div className="space-y-4 md:space-y-4 space-y-6">
                          {[2, 4, 6].map(size => (
                            <div key={size} className="md:flex md:items-center md:justify-between md:p-3 p-4 bg-white rounded border border-gray-200 md:space-y-0 space-y-4">
                              <div className="flex-1">
                                <label className="font-medium text-gray-700 md:text-base text-lg">
                                  Storlek {size}
                                </label>
                              </div>
                              
                              {/* Quick quantity buttons - Mobile: 2x2 grid, Desktop: horizontal row */}
                              <div className="md:flex md:items-center md:gap-2 grid grid-cols-2 gap-3 md:grid-cols-none">
                                {[10, 25, 50, 100].map(qty => (
                                  <button 
                                    key={qty}
                                    onClick={() => handleQuantityButton(colorId, size, qty)}
                                    className={`relative md:px-3 md:py-1 px-6 py-3 md:text-sm text-base rounded-lg border-2 transition-all duration-200 font-medium md:min-h-0 min-h-[48px] ${
                                      colorData.sizes[size] === qty 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105 font-semibold'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                  >
                                    {qty}
                                    {colorData.sizes[size] === qty && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    )}
                                  </button>
                                ))}
                              </div>
                                
                              {/* Custom input - Mobile: full width, Desktop: small */}
                              <div className="relative md:w-auto w-full md:mt-0 mt-3">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Annat antal"
                                  value={colorData.sizes[size] === 0 ? '' : colorData.sizes[size]}
                                  onChange={(e) => handleCustomQuantity(colorId, size, e.target.value)}
                                  className={`md:w-16 w-full md:px-2 md:py-1 px-4 py-3 md:text-sm text-base border-2 rounded-lg transition-all duration-200 md:min-h-0 min-h-[48px] ${
                                    colorData.sizes[size] > 0 && ![10, 25, 50, 100].includes(colorData.sizes[size])
                                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-sm'
                                      : 'border-gray-300 bg-white text-gray-700'
                                  }`}
                                />
                                {colorData.sizes[size] > 0 && ![10, 25, 50, 100].includes(colorData.sizes[size]) && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                                
                              {/* Clear button - Mobile: positioned better */}
                              {colorData.sizes[size] > 0 && (
                                <button
                                  onClick={() => updateItemQuantity(colorId, size, 0)}
                                  className="md:px-2 md:py-1 px-4 py-2 md:text-sm text-base text-red-600 hover:text-red-800 md:min-h-0 min-h-[40px] md:w-auto w-full md:mt-0 mt-2 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                                >
                                  <span className="md:inline hidden">✕</span>
                                  <span className="md:hidden inline">Rensa {size}</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
          </div>
                  </div>
                );
              })}
        </div>
        
                        {/* Information Section */}
            <div className="md:p-4 p-5 border border-gray-200 rounded bg-blue-50">
              <h2 className="md:text-xl text-2xl font-semibold mb-3">Information om prissättning</h2>
              <p className="md:text-base text-lg leading-relaxed">Alla priser är exklusive moms och beräknas med din personliga marginal på {marginal || 40}%.</p>
              {(marginal || 40) === 40 && (
                <div className="mt-4 md:p-3 p-4 bg-orange-100 border border-orange-300 rounded-lg">
                  <p className="text-orange-800 font-semibold md:text-base text-lg">
                    🎉 Just nu introduktionspris, endast under en kortare period, under fiskesäsong 2025
                  </p>
                </div>
              )}
            </div>
            
        </div>
        
          {/* Order Summary Section - Takes 1 column, sticky on desktop */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              {isFormComplete ? (
                <div className="bg-gray-50 md:p-4 p-6 rounded-lg border border-gray-200">
                  <h2 className="md:text-lg text-xl font-semibold mb-4">Orderöversikt</h2>
            
                  {/* Order Lines */}
                  <div className="mb-4">
                    <h3 className="font-medium text-sm mb-2">Dina val:</h3>
                    <div className="space-y-2">
                      {orderLines.map((line, index) => (
                        <div key={index} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span>{line.colorName} - Storlek {line.size}</span>
                          <span className="font-medium">{line.quantity} st</span>
                        </div>
                      ))}
                    </div>
            </div>
            
                  {/* Total Summary */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Totalt antal förpackningar:</span>
                      <span className="font-medium">{totalPackages} st</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Antal färger:</span>
                      <span className="font-medium">{totalActiveColors} st</span>  
                    </div>
                  </div>
                  
                  {/* Price Breakdown */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <h3 className="font-bold text-sm mb-2">Inköpspris med {marginal || 40}% marginal:</h3>
                    {(marginal || 40) === 40 && (
                      <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded text-xs">
                        <p className="text-green-800">
                          🎉 Just nu introduktionspris, endast under en kortare period, under fiskesäsong 2025
                        </p>
                      </div>
                    )}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Pris per förpackning (exkl. moms):</span>
                        <span>{inkopspris.toFixed(2)} kr</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Totalt inköpspris (exkl. moms):</span>
                        <span>{totalPris.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr</span>
                      </div>
              </div>
            </div>
            
                  <div className="mt-4">
                    {/* Minimum order warning */}
                    {totalPackages > 0 && totalPackages < MINIMUM_ORDER_QUANTITY && (
                      <div className="mb-3 md:p-3 p-4 bg-orange-100 border border-orange-300 rounded-lg">
                        <p className="text-orange-800 md:text-sm text-base font-medium">
                          ⚠️ Minsta beställning: {MINIMUM_ORDER_QUANTITY} förpackningar
                        </p>
                        <p className="text-orange-700 md:text-xs text-sm mt-1">
                          Du behöver beställa {remainingQuantity} förpackningar till
                        </p>
                      </div>
                    )}
                    
                                        <button 
                      onClick={handleSubmitOrder}
                      disabled={loading || !isFormComplete}
                      className={`md:px-4 md:py-3 px-6 py-4 rounded-lg font-medium transition-colors w-full md:text-base text-lg md:min-h-0 min-h-[56px] ${
                        isFormComplete
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading ? 'Bearbetar...' : 
                        !isFormComplete ? `Minst ${MINIMUM_ORDER_QUANTITY} förpackningar krävs` :
                        'Bekräfta beställning'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 text-center">
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Orderöversikt</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Välj produkter och kvantiteter för att se din orderöversikt
                  </p>
                  <p className="text-sm font-medium text-orange-600 mb-4">
                    Minsta beställning: {MINIMUM_ORDER_QUANTITY} förpackningar
                  </p>
                  <div className="text-4xl text-gray-300 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400">
                    Använd knapparna ovan för att välja antal av varje färg och storlek
                  </p>
                </div>
              )}
              </div>
            </div>
            
          </div>
      </div>
    </AppLayout>
  );
};

export default OrderPage; 