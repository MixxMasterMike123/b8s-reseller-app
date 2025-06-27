import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import ProductMenu from '../components/ProductMenu';
import toast from 'react-hot-toast';

function ProductViewPage() {
  const { currentUser, isAdmin } = useAuth();
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
        setError('Kunde inte ladda produkter');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDownloadImage = (imageData, filename, type = 'product') => {
    if (!imageData) {
      toast.error('Ingen bild tillgänglig för nedladdning');
      return;
    }

    try {
      // Create a download link
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${filename}_${type}.${imageData.includes('data:image/svg') ? 'svg' : imageData.includes('data:image/png') ? 'png' : 'jpg'}`;
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

  if (!currentUser) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-500">Du måste vara inloggad för att se produkter.</p>
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
                    {selectedProduct.description && (
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
                  {(selectedProduct.imageUrl || selectedProduct.imageData) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Produktbild</h3>
                      <div className="space-y-3">
                        <img 
                          src={selectedProduct.imageUrl || selectedProduct.imageData} 
                          alt={selectedProduct.name} 
                          className="w-full h-64 object-contain border border-gray-200 rounded-md bg-white"
                        />
                        <button
                          onClick={() => handleDownloadImage(selectedProduct.imageUrl || selectedProduct.imageData, selectedProduct.name, 'product')}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Ladda ner produktbild
                        </button>
                      </div>
                    </div>
                  )}

                  {/* EAN Code Images */}
                  {(selectedProduct.eanImagePngUrl || selectedProduct.eanImagePng || selectedProduct.eanImageSvgUrl || selectedProduct.eanImageSvg) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">EAN-kod bilder</h3>
                      <div className="space-y-4">
                        {(selectedProduct.eanImagePngUrl || selectedProduct.eanImagePng) && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600">PNG/JPG Format</p>
                            <img 
                              src={selectedProduct.eanImagePngUrl || selectedProduct.eanImagePng} 
                              alt="EAN-kod PNG" 
                              className="w-full h-20 object-contain border border-gray-200 rounded bg-white"
                            />
                            <button
                              onClick={() => handleDownloadImage(selectedProduct.eanImagePngUrl || selectedProduct.eanImagePng, selectedProduct.name, 'ean_png')}
                              className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Ladda ner PNG
                            </button>
                          </div>
                        )}

                        {(selectedProduct.eanImageSvgUrl || selectedProduct.eanImageSvg) && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600">SVG Format</p>
                            <img 
                              src={selectedProduct.eanImageSvgUrl || selectedProduct.eanImageSvg} 
                              alt="EAN-kod SVG" 
                              className="w-full h-20 object-contain border border-gray-200 rounded bg-white"
                            />
                            <button
                              onClick={() => handleDownloadImage(selectedProduct.eanImageSvgUrl || selectedProduct.eanImageSvg, selectedProduct.name, 'ean_svg')}
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
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900">Tillgängliga Produkter</h2>
                <div className="w-full sm:w-64">
                  <ProductMenu 
                    products={products} 
                    selectedProduct={filteredProduct} 
                    onProductSelect={(product) => setFilteredProduct(product)} 
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Storlek
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pris
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EAN-kod
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Inga produkter tillgängliga
                      </td>
                    </tr>
                  ) : (
                    (filteredProduct ? [filteredProduct] : products).map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleProductSelect(product)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {(product.imageUrl || product.imageData) ? (
                              <img 
                                src={product.imageUrl || product.imageData} 
                                alt={product.name} 
                                className="w-12 h-12 mr-4 object-cover rounded-md border border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 mr-4 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200">
                                <span className="text-xs text-gray-500">Ingen bild</span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.size || 'Ej angivet'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.basePrice?.toFixed(2)} SEK</div>
                          <div className="text-sm text-gray-500">Exkl. moms</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.eanCode || 'Ej angivet'}</div>
                          {(product.eanImagePngUrl || product.eanImagePng || product.eanImageSvgUrl || product.eanImageSvg) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {(product.eanImagePngUrl || product.eanImagePng) && 'PNG '}
                              {(product.eanImageSvgUrl || product.eanImageSvg) && 'SVG'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            className="text-blue-600 hover:text-blue-900"
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