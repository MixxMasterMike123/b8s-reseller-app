import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import AppLayout from '../components/layout/AppLayout';
import ProductMenu from '../components/ProductMenu';
import toast from 'react-hot-toast';

function ProductViewPage() {
  const { currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [filteredProduct, setFilteredProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('📥 Fetching products for customer view...');
        
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];

        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          // Only show active products that are available for B2B
          if (productData.isActive !== false && productData.availability?.b2b !== false) {
            productsData.push({
              id: doc.id,
              ...productData
            });
          }
        });

        // Sort products by name (default sorting)
        productsData.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        console.log('📊 Active B2B products loaded:', productsData.length);
        setProducts(productsData);
      } catch (err) {
        console.error('❌ Error fetching products:', err);
        setError(t('products.could_not_load', 'Kunde inte ladda produkter'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDownloadImage = (imageUrl, filename, type = 'product') => {
    if (!imageUrl) {
      toast.error(t('products.no_image_available', 'Ingen bild tillgänglig för nedladdning'));
      return;
    }

    try {
      // Create a download link
      const link = document.createElement('a');
      link.href = imageUrl;
      
      // Determine file extension from URL or default to jpg
      let extension = 'jpg';
      if (imageUrl.includes('.png')) extension = 'png';
      else if (imageUrl.includes('.svg')) extension = 'svg';
      else if (imageUrl.includes('.gif')) extension = 'gif';
      else if (imageUrl.includes('.webp')) extension = 'webp';
      
      link.download = `${filename}_${type}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${type === 'product' ? 'Produktbild' : 'EAN-kod'} nedladdad`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Kunde inte ladda ner bilden');
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFilteredProduct(null);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  // Add this helper function at the top level of the component
  const getProductImage = (product) => {
    // Priority: B2B image > legacy Firebase Storage URL > placeholder
    if (product.b2bImageUrl) return product.b2bImageUrl;
    if (product.imageUrl) return product.imageUrl;
    return null;
  };

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-500">{t('products.login_required', 'Du måste vara inloggad för att se produkter')}.</p>
            <Link to="/login" className="text-blue-600 hover:underline">
              Logga in
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produktkatalog</h1>
              <p className="mt-1 text-sm text-gray-600">Bläddra bland våra produkter och ladda ner bilder</p>
            </div>
            <div className="flex gap-3">
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Tillbaka till Dashboard
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin/products" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Hantera Produkter
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedProduct ? (
          /* Single Product View */
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Product Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToList}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-900"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Tillbaka till produktlista
                </button>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedProduct.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedProduct.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </div>

            {/* Product Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Info */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                    {/* B2B Technical Description */}
                    {selectedProduct.descriptions?.b2b && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-800 whitespace-pre-line">{selectedProduct.descriptions.b2b}</p>
                      </div>
                    )}
                    {/* Fallback to general description if no B2B description */}
                    {!selectedProduct.descriptions?.b2b && selectedProduct.description && (
                      <p className="text-gray-600">{selectedProduct.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Pris</h3>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedProduct.basePrice?.toFixed(2)} SEK
                      </p>
                      <p className="text-xs text-gray-500">Exkl. moms</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Storlek</h3>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedProduct.size || 'Ej angivet'}
                      </p>
                    </div>

                    {/* Weight */}
                    {selectedProduct.weight?.value > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Vikt</h3>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedProduct.weight.value} {selectedProduct.weight.unit}
                        </p>
                      </div>
                    )}

                    {/* Dimensions */}
                    {(selectedProduct.dimensions?.length?.value > 0 || 
                      selectedProduct.dimensions?.width?.value > 0 || 
                      selectedProduct.dimensions?.height?.value > 0) && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Mått</h3>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedProduct.dimensions?.length?.value || 0} × {' '}
                          {selectedProduct.dimensions?.width?.value || 0} × {' '}
                          {selectedProduct.dimensions?.height?.value || 0} {' '}
                          {selectedProduct.dimensions?.length?.unit || 'mm'}
                        </p>
                        <p className="text-xs text-gray-500">L × B × H</p>
                      </div>
                    )}

                    {selectedProduct.eanCode && (
                      <div className="bg-gray-50 p-4 rounded-lg sm:col-span-2">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">EAN-kod</h3>
                        <p className="text-lg font-mono font-semibold text-gray-900">
                          {selectedProduct.eanCode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Images */}
                <div className="space-y-6">
                  {/* Main Product Image */}
                  {(() => {
                    const imageUrl = getProductImage(selectedProduct);
                    return imageUrl ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Produktbild</h3>
                        <div className="space-y-3">
                          <img 
                            src={imageUrl} 
                            alt={selectedProduct.name} 
                            className="w-full h-64 object-contain border border-gray-200 rounded-md bg-white"
                          />
                          <button
                            onClick={() => handleDownloadImage(imageUrl, selectedProduct.name, 'product')}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ladda ner produktbild
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* EAN Code Images */}
                  {(selectedProduct.eanImagePngUrl || selectedProduct.eanImageSvgUrl) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">EAN-kod bilder</h3>
                      <div className="space-y-4">
                        {selectedProduct.eanImagePngUrl && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600">PNG/JPG Format</p>
                            <img 
                              src={selectedProduct.eanImagePngUrl} 
                              alt="EAN-kod PNG" 
                              className="w-full h-20 object-contain border border-gray-200 rounded bg-white"
                            />
                            <button
                              onClick={() => handleDownloadImage(selectedProduct.eanImagePngUrl, selectedProduct.name, 'ean_png')}
                              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Ladda ner PNG
                            </button>
                          </div>
                        )}

                        {selectedProduct.eanImageSvgUrl && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600">SVG Format</p>
                            <img 
                              src={selectedProduct.eanImageSvgUrl} 
                              alt="EAN-kod SVG" 
                              className="w-full h-20 object-contain border border-gray-200 rounded bg-white"
                            />
                            <button
                              onClick={() => handleDownloadImage(selectedProduct.eanImageSvgUrl, selectedProduct.name, 'ean_svg')}
                              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Ladda ner SVG
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Product List */
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg md:text-lg font-medium text-gray-900">Tillgängliga Produkter</h2>
                <div className="w-full sm:w-64">
                  <ProductMenu 
                    products={products} 
                    selectedProduct={filteredProduct} 
                    onProductSelect={(product) => setFilteredProduct(product)} 
                  />
                </div>
              </div>
            </div>
            
            {/* Mobile Card Layout */}
            <div className="md:hidden">
              {products.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-base text-gray-500">Inga produkter tillgängliga</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {(filteredProduct ? [filteredProduct] : products).map((product) => (
                    <div 
                      key={product.id} 
                      className="px-4 py-6 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const imageUrl = getProductImage(product);
                            return imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={product.name} 
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                <span className="text-sm text-gray-500">Ingen bild</span>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {product.name}
                              </h3>
                              {(product.descriptions?.b2b || product.description) && (
                                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                  {product.descriptions?.b2b || product.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Product Details */}
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">Storlek:</span>
                                <span className="font-medium text-gray-900">{product.size || 'Ej angivet'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">Pris:</span>
                                <span className="font-semibold text-gray-900">{product.basePrice?.toFixed(2)} SEK</span>
                              </div>
                            </div>
                            
                            {product.eanCode && (
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-500">EAN:</span>
                                <span className="font-mono text-gray-900">{product.eanCode}</span>
                                {(product.eanImagePngUrl || product.eanImageSvgUrl) && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {product.eanImagePngUrl && 'PNG '}
                                    {product.eanImageSvgUrl && 'SVG'}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Price note */}
                            <p className="text-xs text-gray-500">Exkl. moms</p>
                          </div>
                          
                          {/* Action Button */}
                          <div className="mt-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductSelect(product);
                              }}
                              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-base font-medium min-h-[48px] flex items-center justify-center"
                            >
                              Visa detaljer och ladda ner
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                      Produkt
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Storlek & Pris
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      EAN-kod
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Inga produkter tillgängliga
                      </td>
                    </tr>
                  ) : (
                    (filteredProduct ? [filteredProduct] : products).map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleProductSelect(product)}>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            {(() => {
                              const imageUrl = getProductImage(product);
                              return imageUrl ? (
                                <img 
                                  src={imageUrl} 
                                  alt={product.name} 
                                  className="w-10 h-10 object-cover rounded-md border border-gray-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200 flex-shrink-0">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              );
                            })()}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                              {(product.descriptions?.b2b || product.description) && (
                                <div className="text-xs text-gray-600 truncate max-w-xs">
                                  {product.descriptions?.b2b || product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">{product.size || 'Ej angivet'}</div>
                            <div className="text-sm font-semibold text-gray-900">{product.basePrice?.toFixed(2)} SEK</div>
                            <div className="text-xs text-gray-500">Exkl. moms</div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-mono text-gray-900">{product.eanCode || 'Ej angivet'}</div>
                            {(product.eanImagePngUrl || product.eanImageSvgUrl) && (
                              <div className="flex space-x-1">
                                {product.eanImagePngUrl && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">PNG</span>
                                )}
                                {product.eanImageSvgUrl && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">SVG</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            Visa detaljer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ProductViewPage; 