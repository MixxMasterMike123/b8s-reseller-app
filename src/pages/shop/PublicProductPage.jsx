import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import toast from 'react-hot-toast';
import { generateProductSchema } from '../../utils/productFeed';
import { useCart } from '../../contexts/CartContext';
import ShopNavigation from '../../components/shop/ShopNavigation';

const PublicProductPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const colorParam = searchParams.get('color');
  
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { addToCart, cart } = useCart();

  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      // Load the main product
      const productDoc = await getDoc(doc(db, 'products', id));
      if (!productDoc.exists()) {
        toast.error('Produkten hittades inte');
        return;
      }
      
      const productData = { id: productDoc.id, ...productDoc.data() };
      setProduct(productData);
      
      // Extract color from product name to find variants
      const colorMatch = productData.name.match(/B8Shield\s+(.+?)(?:\s+\d|$)/i);
      const baseColor = colorMatch ? colorMatch[1].trim() : 'Standard';
      
      // Load all variants of this product (same color, different sizes)
      const variantsQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('availability.b2c', '==', true)
      );
      
      const variantsSnapshot = await getDocs(variantsQuery);
      const allProducts = [];
      
      variantsSnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        allProducts.push(data);
      });
      
      // Filter products that match the same color
      const sameColorProducts = allProducts.filter(p => {
        const pColorMatch = p.name.match(/B8Shield\s+(.+?)(?:\s+\d|$)/i);
        const pColor = pColorMatch ? pColorMatch[1].trim() : 'Standard';
        return pColor.toLowerCase() === baseColor.toLowerCase();
      });
      
      // Sort by size (assuming size is in the format like "6mm", "8mm", "10mm")
      sameColorProducts.sort((a, b) => {
        const aSize = parseFloat(a.size?.replace(/[^\d.]/g, '') || '0');
        const bSize = parseFloat(b.size?.replace(/[^\d.]/g, '') || '0');
        return aSize - bSize;
      });
      
      setVariants(sameColorProducts);
      
      // Set initial selected variant
      if (sameColorProducts.length > 0) {
        setSelectedVariant(sameColorProducts[0]);
        setSelectedSize(sameColorProducts[0].id);
      }
      
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Kunde inte ladda produkten');
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = (variantId) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      setSelectedVariant(variant);
      setSelectedSize(variantId);
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Vänligen välj en storlek');
      return;
    }

    const selectedVariant = variants.find(v => v.id === selectedSize);
    if (!selectedVariant) {
      toast.error('Ogiltig storlek vald');
      return;
    }

    addToCart(selectedVariant, quantity, selectedVariant.size);
    toast.success('Produkt tillagd i varukorgen');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(price);
  };

  // Get all available images for the product
  const getProductImages = (product) => {
    const images = [];
    
    // B2C images first (lifestyle images)
    if (product.b2cImageUrl) images.push(product.b2cImageUrl);
    if (product.b2cImageGallery) images.push(...product.b2cImageGallery);
    
    // B2B images (technical images)
    if (product.b2bImageUrl) images.push(product.b2bImageUrl);
    if (product.b2bImageGallery) images.push(...product.b2bImageGallery);
    
    // Legacy images
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.imageData) images.push(product.imageData);
    
    // If no images, use generated image
    if (images.length === 0) {
      images.push(getProductImage(product.name));
    }
    
    return images;
  };

  // Get product description - prefer B2C description
  const getB2cDescription = (product) => {
    if (product.descriptions?.b2c) return product.descriptions.b2c;
    if (product.description) return product.description;
    return '';
  };

  // Get color from product name
  const getProductColor = (product) => {
    const colorMatch = product.name.match(/B8Shield\s+(.+?)(?:\s+\d|$)/i);
    return colorMatch ? colorMatch[1].trim() : 'Standard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-2 border-blue-300 opacity-20"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produkten hittades inte</h1>
          <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors">
            Tillbaka till butiken
          </Link>
        </div>
      </div>
    );
  }

  const currentProduct = selectedVariant || product;
  const productImages = getProductImages(currentProduct);
  const productColor = getProductColor(currentProduct);

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateProductSchema(currentProduct))
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={`B8Shield ${productColor}`} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                <img
                  src={productImages[activeImageIndex]}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Thumbnail Images */}
              {productImages.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {productImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all ${
                        activeImageIndex === index 
                          ? 'border-blue-600 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${currentProduct.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-8">
              {/* Product Title & Rating */}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  B8Shield™ – Vasskydd {productColor}
                </h1>
                
                {/* Rating */}
                <div className="flex items-center mb-6">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        className="w-5 h-5 fill-current" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">Betygsatt 5.00 av 5 baserat på 1 kundrecension</span>
                </div>
              </div>

              {/* Price */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatPrice(currentProduct.b2cPrice || currentProduct.basePrice)}
                </div>
                <p className="text-gray-600 mt-2">Inkluderar moms</p>
              </div>

              {/* Size Selection */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Storlek
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="">Välj ett alternativ</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.size ? `${variant.size} - ${formatPrice(variant.b2cPrice || variant.basePrice)}` : `Standard - ${formatPrice(variant.b2cPrice || variant.basePrice)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-4 mb-6">
                  <label className="text-lg font-semibold text-gray-900">
                    Antal
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-lg font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Lägg till i varukorg
                </button>
              </div>

              {/* Product Description */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Beskrivning</h2>
                <div className="prose prose-gray max-w-none">
                  {getB2cDescription(currentProduct) ? (
                    <div className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: getB2cDescription(currentProduct) }} />
                  ) : (
                    <p className="text-gray-500 italic">Ingen beskrivning tillgänglig</p>
                  )}
                </div>
              </div>

              {/* Detailed Product Information */}
              {currentProduct.descriptions?.b2cMoreInfo && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mt-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Mer Information</h2>
                  <div className="prose prose-gray max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: currentProduct.descriptions.b2cMoreInfo }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicProductPage; 