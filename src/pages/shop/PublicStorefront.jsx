import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import toast from 'react-hot-toast';
import { useCart } from '../../contexts/CartContext';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';

const PublicStorefront = () => {
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Debug info
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('availability.b2c', '==', true) // Only show B2C available products
      );
      const querySnapshot = await getDocs(q);
      
      const productList = [];
      querySnapshot.forEach((doc) => {
        productList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort products alphabetically
      productList.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productList);
      
      // Group products by color (extract color from name)
      const grouped = groupProductsByColor(productList);
      setGroupedProducts(grouped);
      
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Kunde inte ladda produkter');
    } finally {
      setLoading(false);
    }
  };

  // Group products by color and return one representative product per color
  const groupProductsByColor = (products) => {
    const colorGroups = {};
    
    products.forEach(product => {
      // Extract color from product name (assuming format like "B8Shield Röd", "B8Shield Transparent", etc.)
      const colorMatch = product.name.match(/B8Shield\s+(.+?)(?:\s+\d|$)/i);
      const color = colorMatch ? colorMatch[1].trim() : 'Standard';
      
      if (!colorGroups[color]) {
        colorGroups[color] = {
          color: color,
          products: [],
          representativeProduct: product // Use first product as representative
        };
      }
      
      colorGroups[color].products.push(product);
    });
    
    // Return array of representative products with their variants
    return Object.values(colorGroups).map(group => ({
      ...group.representativeProduct,
      colorVariant: group.color,
      variants: group.products,
      availableSizes: group.products.map(p => ({
        id: p.id,
        size: p.size || 'Standard',
        price: p.b2cPrice || p.basePrice,
        name: p.name
      }))
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(price);
  };

  const addToCart = (product) => {
    // TODO: Implement cart functionality
    toast.success(`${product.name} tillagd i varukorgen!`);
  };

  // Get the best available image for B2C display
  const getB2cProductImage = (product) => {
    // Priority: B2C main image > B2C gallery first image > B2B image > legacy image > generated image
    if (product.b2cImageUrl) return product.b2cImageUrl;
    if (product.b2cImageGallery && product.b2cImageGallery.length > 0) return product.b2cImageGallery[0];
    if (product.b2bImageUrl) return product.b2bImageUrl;
    if (product.imageUrl) return product.imageUrl;
    if (product.imageData) return product.imageData;
    return getProductImage(product.name);
  };

  // Get product description - prefer B2C description
  const getB2cProductDescription = (product) => {
    if (product.descriptions?.b2c) return product.descriptions.b2c;
    if (product.description) return product.description;
    return `B8Shield ${product.colorVariant || ''} - Vasskydd som förhindrar att dina fiskedrag fastnar`;
  };

  const ProductQuickView = ({ product, onClose }) => {
    const cart = useCart();
    const [selectedSize, setSelectedSize] = useState(product.availableSizes[0]?.size || 'Standard');
    const [quantity, setQuantity] = useState(1);
    
    const handleAddToCart = () => {
      const productToAdd = product.availableSizes.find(p => p.size === selectedSize);
      if (productToAdd) {
        cart.addToCart(productToAdd, quantity, selectedSize);
        toast.success(`${productToAdd.name} tillagd i varukorgen!`);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">Välj storlek</h2>
          <div className="flex flex-col gap-4">
            {product.availableSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => setSelectedSize(size.size)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                {size.size}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <button 
              onClick={handleAddToCart}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Lägg i varukorgen
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-200 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-300"
          >
            Avbryt
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      {/* Debug Info */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-sm font-medium text-yellow-800">Debug Info (B2C Shop Mode)</h3>
          <p className="text-xs text-yellow-700">
            Hostname: {hostname} | Subdomain: {subdomain} | Full URL: {window.location.href}
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/images/Fil-000-222.jpg"
            alt="B8Shield fishing background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-indigo-900/60 to-purple-900/70"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-blue-600 border border-blue-200/50 mb-8">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Ny innovation från Sverige
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
              Fastna
              <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent"> aldrig </span>
              mer!
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              B8Shield™ – Vasskydd som förhindrar att dina fiskedrag fastnar i vassen utan att påverka ditt fiske.
            </p>

            {/* Social Proof */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-12 max-w-2xl mx-auto border border-white/20 shadow-xl">
              <div className="flex items-center justify-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <blockquote className="text-gray-700 italic text-lg">
                "Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!"
              </blockquote>
              <cite className="text-sm text-gray-500 mt-2 block">— Paul Wieringa, Sportfiskarna Sverige</cite>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Handla nu
              </button>
              <button className="border-2 border-white/70 text-white px-8 py-4 rounded-full text-lg font-semibold hover:border-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                Läs mer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Våra Produkter
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Välj mellan olika färger och storlekar för att passa ditt fiske
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-2 border-blue-300 opacity-20"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {groupedProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-blue-200 transform hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={getB2cProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Color Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                        {product.colorVariant}
                      </span>
                    </div>
                    
                    {/* Sizes Available Badge */}
                    {product.availableSizes && product.availableSizes.length > 1 && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                          {product.availableSizes.length} storlekar
                        </span>
                      </div>
                    )}
                    
                    {/* Quick Actions Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-3">
                        <Link
                          to={`/product/${product.id}`}
                          className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                          }}
                          className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293A1 1 0 005 16h12M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        B8Shield™ {product.colorVariant}
                      </h3>
                      <div className="text-right">
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-2xl font-bold">
                          {formatPrice(product.b2cPrice || product.basePrice)}
                        </span>
                        {product.availableSizes && product.availableSizes.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            från {formatPrice(Math.min(...product.availableSizes.map(s => s.price)))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 line-clamp-2">
                      {getB2cProductDescription(product)}
                    </p>

                    <div className="flex space-x-3">
                      <Link
                        to={`/product/${product.id}?color=${encodeURIComponent(product.colorVariant)}`}
                        className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 text-center"
                      >
                        Visa detaljer
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Välj storlek
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && groupedProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">Inga produkter tillgängliga för tillfället.</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Varför välja B8Shield™?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Bevisat Effektivt</h3>
              <p className="text-gray-600">Minska förlusten av beten med upp till 90% enligt våra tester</p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enkelt att Använda</h3>
              <p className="text-gray-600">Fäst enkelt på ditt fiskedrag på några sekunder</p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Miljövänligt</h3>
              <p className="text-gray-600">Återvinningsbart material som skyddar våra vattenmiljöer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <ShopFooter />

      {selectedProduct && (
        <ProductQuickView product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
};

export default PublicStorefront; 