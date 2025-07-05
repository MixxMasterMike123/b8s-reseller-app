import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import { slugToProductMap, getProductSeoTitle, getProductSeoDescription } from '../../utils/productUrls';
import toast from 'react-hot-toast';
import { generateProductSchema } from '../../utils/productFeed';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { getProductGroupContent } from '../../utils/productGroups';
import ShopNavigation from '../../components/shop/ShopNavigation';
import SizeGuideModal from '../../components/SizeGuideModal';

const PublicProductPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const colorParam = searchParams.get('color');
  const { t } = useTranslation();
  
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [groupContent, setGroupContent] = useState(null);
  const [groupContentLoading, setGroupContentLoading] = useState(false);
  const [sizeGuideModalOpen, setSizeGuideModalOpen] = useState(false);
  const { addToCart, cart } = useCart();

  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  const loadGroupContent = async (groupId) => {
    if (!groupId) return;
    
    try {
      setGroupContentLoading(true);
      const content = await getProductGroupContent(groupId);
      setGroupContent(content);
    } catch (error) {
      console.error('Error loading group content:', error);
      // Don't show error toast as this is optional content
    } finally {
      setGroupContentLoading(false);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      // Convert slug to product color/type
      const productColor = slugToProductMap[slug];
      if (!productColor) {
        toast.error('Produkten hittades inte');
        return;
      }
      
      // Find products matching the slug
      let productsQuery;
      if (slug === '3pack') {
        // For 3-pack, find multipack products by checking if name contains "3-pack"
        productsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('availability.b2c', '==', true)
        );
      } else {
        // For individual products, find by color
        productsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('availability.b2c', '==', true),
          where('color', '==', productColor)
        );
      }
      
      const productsSnapshot = await getDocs(productsQuery);
      
      let filteredProducts = [];
      productsSnapshot.forEach((doc) => {
        const productData = { id: doc.id, ...doc.data() };
        
        if (slug === '3pack') {
          // For 3-pack, filter products that contain "3-pack" in the name
          if (productData.name && productData.name.includes('3-pack')) {
            filteredProducts.push(productData);
          }
        } else {
          // For individual products, all products match the color query
          filteredProducts.push(productData);
        }
      });
      
      if (filteredProducts.length === 0) {
        toast.error('Produkten hittades inte');
        return;
      }
      
      // Get the first product as the main product
      const mainProduct = filteredProducts[0];
      setProduct(mainProduct);
      
      // Load group content if product has a group
      if (mainProduct.group) {
        loadGroupContent(mainProduct.group);
      }
      
      // Use the group field to find all variants in the same group
      const productGroup = mainProduct.group;
      if (!productGroup) {
        // If no group, just show this single product
        setVariants([mainProduct]);
        setSelectedVariant(mainProduct);
        setSelectedSize(mainProduct.id);
        return;
      }
      
      // Check if this is a multipack product
      const isMultipack = productGroup.includes('multipack') || productGroup.includes('3-pack');
      
      if (isMultipack) {
        // For multipacks: load all products in the same group (different colors)
        const variantsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('availability.b2c', '==', true),
          where('group', '==', productGroup)
        );
        
        const variantsSnapshot = await getDocs(variantsQuery);
        const groupVariants = [];
        
        variantsSnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          groupVariants.push(data);
        });
        
        // Sort by color for multipacks
        groupVariants.sort((a, b) => {
          const colorOrder = ['Transparent', 'Röd', 'Fluorescerande', 'Glitter'];
          const aIndex = colorOrder.indexOf(a.color || 'Standard');
          const bIndex = colorOrder.indexOf(b.color || 'Standard');
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        
        setVariants(groupVariants);
        
        // Set the current product as selected variant
        setSelectedVariant(mainProduct);
        setSelectedSize(mainProduct.id);
      } else {
        // For individual products: load all products in the same group with the same color
        const variantsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('availability.b2c', '==', true),
          where('group', '==', productGroup),
          where('color', '==', mainProduct.color)
        );
        
        const variantsSnapshot = await getDocs(variantsQuery);
        const groupVariants = [];
        
        variantsSnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          groupVariants.push(data);
        });
        
        // Sort by size (convert size to number for proper sorting)
        groupVariants.sort((a, b) => {
          const aSize = parseFloat(a.size?.toString().replace(/[^\d.]/g, '') || '0');
          const bSize = parseFloat(b.size?.toString().replace(/[^\d.]/g, '') || '0');
          return aSize - bSize;
        });
        
        setVariants(groupVariants);
        
        // Set the current product as selected variant
        setSelectedVariant(mainProduct);
        setSelectedSize(mainProduct.id);
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
      setActiveImageIndex(0); // Reset to first image when variant changes
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error(isMultipack ? 'Vänligen välj en färg' : 'Vänligen välj en storlek');
      return;
    }

    const selectedVariant = variants.find(v => v.id === selectedSize);
    if (!selectedVariant) {
      toast.error(isMultipack ? 'Ogiltig färg vald' : 'Ogiltig storlek vald');
      return;
    }

    addToCart(selectedVariant, quantity, isMultipack ? selectedVariant.color : selectedVariant.size);
    toast.success('Produkt tillagd i varukorgen');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(price);
  };

  // Get all available images for the product (B2C ONLY for consumer shop)
  const getProductImages = (product) => {
    const images = [];
    
    // B2C images only (lifestyle images for consumers)
    if (product.b2cImageUrl) images.push(product.b2cImageUrl);
    if (product.b2cImageGallery && product.b2cImageGallery.length > 0) {
      images.push(...product.b2cImageGallery);
    }
    
    // If no B2C images, use generated consumer-focused image
    if (images.length === 0) {
      images.push(getProductImage(product));
    }
    
    return images;
  };

  // Get product description - prefer B2C description
  const getB2cDescription = (product) => {
    if (product.descriptions?.b2c) return product.descriptions.b2c;
    if (product.description) return product.description;
    return '';
  };

  // Get color from product color field
  const getProductColor = (product) => {
    return product.color || 'Standard';
  };

  // Helper function to get group content value with multilingual support
  const getGroupContentValue = (contentField) => {
    if (!groupContent || !contentField) return '';
    
    const content = groupContent[contentField];
    if (!content) return '';
    
    // If it's a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object (multilingual), get the appropriate language
    if (typeof content === 'object') {
      // Try to get Swedish first, then English UK, then English US, then any available
      return content['sv-SE'] || content['en-GB'] || content['en-US'] || 
             Object.values(content).find(val => val && val.length > 0) || '';
    }
    
    return '';
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
  
  // Check if this is a multipack product
  const isMultipack = product?.group?.includes('multipack') || product?.group?.includes('3-pack');

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateProductSchema(currentProduct))
        }}
      />
      
      <div className="min-h-screen bg-white">
        <ShopNavigation breadcrumb={currentProduct.name} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Product Images */}
            <div className="lg:w-1/2">
              <div className="flex gap-4 sticky top-24">
                {/* Thumbnail Images - Left Side */}
                {productImages.length > 1 && (
                  <div className="flex flex-col gap-2 w-20">
                    {productImages.map((image, index) => (
                      <button
                        key={index}
                        onMouseEnter={() => setActiveImageIndex(index)}
                        className={`aspect-square bg-gray-50 rounded-md overflow-hidden border-2 transition-all ${
                          activeImageIndex === index 
                            ? 'border-black' 
                            : 'border-transparent hover:border-gray-300'
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
                
                {/* Main Image */}
                <div className="flex-1">
                  <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={productImages[activeImageIndex]}
                      alt={currentProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="lg:w-1/2 space-y-8">
              {/* Product Title */}
              <div>
                <h1 className="text-3xl font-medium text-gray-900 mb-2">
                  {currentProduct.name}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  {getB2cDescription(currentProduct) || `B8Shield ${productColor} - ${currentProduct.size || 'Standard'}`}
                </p>

              {/* Price */}
                <div className="text-2xl font-medium text-gray-900 mb-6">
                  {formatPrice(currentProduct.b2cPrice || currentProduct.basePrice)}
                </div>
              </div>

              {/* Size/Color Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">
                    {isMultipack ? 'Välj färg' : 'Välj storlek'}
                  </h3>
                  {!isMultipack && (
                    <button 
                      onClick={() => setSizeGuideModalOpen(true)}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      {t('size_guide_link', 'Storleksguide')}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => handleSizeChange(variant.id)}
                      className={`py-4 px-4 text-center border rounded-md transition-all ${
                        selectedSize === variant.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {isMultipack ? (variant.color || 'Standard') : (variant.size || 'Standard')}
                      </div>
                    </button>
                  ))}
                </div>
                </div>
                
              {/* Add to Cart */}
              <div className="space-y-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className="w-full bg-black text-white py-4 px-8 rounded-full text-base font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lägg i shoppingbagen
                </button>
                
                <button className="w-full border border-gray-300 py-4 px-8 rounded-full text-base font-medium hover:border-gray-400 transition-colors">
                  Favorit ♡
                </button>
              </div>

              {/* Payment Options */}
              <div className="border-t pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Klarna.</span> är tillgängligt i kassan.
                </p>
                <p className="text-sm text-gray-600">
                  Tillgängligt för Click and Collect i kassan
                </p>
              </div>

              {/* Product Description */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Visa produktinformation
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600">
                  <p>
                    {getB2cDescription(currentProduct) || 
                     `B8Shield ${productColor} i storlek ${currentProduct.size || 'Standard'} ger dig det ultimata skyddet för dina fiskedrag. Denna högkvalitativa produkt är utvecklad för att hålla i många år av intensivt fiske, oavsett väderförhållanden. Perfekt för både nybörjare och erfarna fiskare som vill skydda sina värdefulla fiskedrag från skador.`}
                  </p>
                  
                  <ul className="mt-4 space-y-2">
                    <li>• Färg som visas: {productColor}</li>
                    <li>• Storlek: {currentProduct.size || 'Standard'}</li>
                    <li>• Stil: {currentProduct.sku || 'B8S-001'}</li>
                  </ul>
                </div>
              </div>

              {/* Expandable Information Sections */}
              <div className="border-t pt-6 space-y-4">
                {/* Size and Fit - From Group Content */}
                <details className="group">
                  <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                    <span className="text-base font-medium text-gray-900">
                      {t('size_and_fit_section', 'Storlek och passform')}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-4 px-4 -mx-4 text-sm text-gray-600">
                    {groupContentLoading ? (
                      <p className="text-gray-500 italic">
                        {t('loading_group_content', 'Laddar information...')}
                      </p>
                    ) : (
                      getGroupContentValue('sizeAndFit') ? (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: getGroupContentValue('sizeAndFit') }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <p className="mb-3">B8Shield finns i flera storlekar för att passa olika fiskeförhållanden:</p>
                          <ul className="space-y-2">
                            <li>• <strong>4mm:</strong> Perfekt för lättare fiskedrag och mindre fiskar</li>
                            <li>• <strong>6mm:</strong> Standardstorlek för allmänt fiske</li>
                            <li>• <strong>8mm:</strong> För tyngre fiskedrag och större fiskar</li>
                            <li>• <strong>10mm:</strong> Maximal skydd för extrema förhållanden</li>
                          </ul>
                          <p className="mt-3 text-xs text-gray-500">
                            Välj storlek baserat på ditt fiskedrag och fiskeområde. Vid osäkerhet, välj en större storlek.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </details>

                {/* Free Shipping and Returns - From Group Content */}
                <details className="group">
                  <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                    <span className="text-base font-medium text-gray-900">
                      {t('shipping_returns_section', 'Fri frakt och fri retur')}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-4 px-4 -mx-4 text-sm text-gray-600">
                    {groupContentLoading ? (
                      <p className="text-gray-500 italic">
                        {t('loading_group_content', 'Laddar information...')}
                      </p>
                    ) : (
                      getGroupContentValue('shippingReturns') ? (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: getGroupContentValue('shippingReturns') }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Leverans</h4>
                            <p>• Fri frakt på alla beställningar över 500 SEK</p>
                            <p>• Standard leverans: 2-5 arbetsdagar</p>
                            <p>• Express leverans: 1-2 arbetsdagar (extra kostnad)</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">Returer</h4>
                            <p>• 30 dagars returrätt</p>
                            <p>• Kostnadsfri retur via PostNord</p>
                            <p>• Produkten ska vara oanvänd och i originalförpackning</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </details>

                {/* How it's Made - From Group Content */}
                <details className="group">
                  <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                    <span className="text-base font-medium text-gray-900">
                      {t('how_its_made_section', 'Hur den tillverkades')}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-4 px-4 -mx-4 text-sm text-gray-600">
                    {groupContentLoading ? (
                      <p className="text-gray-500 italic">
                        {t('loading_group_content', 'Laddar information...')}
                      </p>
                    ) : (
                      getGroupContentValue('howItsMade') ? (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: getGroupContentValue('howItsMade') }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <p>B8Shield tillverkas med miljötänk och hållbarhet i fokus:</p>
                          <ul className="space-y-2">
                            <li>• <strong>Återvinningsbart material:</strong> Tillverkat av högkvalitativ plast som kan återvinnas</li>
                            <li>• <strong>Svensk design:</strong> Utvecklat och testat i svenska vatten</li>
                            <li>• <strong>Miljövänlig produktion:</strong> Minimal miljöpåverkan under tillverkning</li>
                            <li>• <strong>Långlivad:</strong> Designad för att hålla i många år av intensivt fiske</li>
                          </ul>
                          <p className="text-xs text-gray-500 mt-3">
                            JPH Innovation AB arbetar kontinuerligt för att minska miljöpåverkan och förbättra produkternas hållbarhet.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </details>

                {/* Reviews */}
                <details className="group">
                  <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-medium text-gray-900">Recensioner (1)</span>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-4 px-4 -mx-4 text-sm text-gray-600">
                    <div className="space-y-4">
                      <div className="border-b border-gray-200 pb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="font-medium text-gray-900">Paul W.</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-500">Verifierat köp</span>
                        </div>
                        <p className="text-gray-700 mb-2">
                          "Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!"
                        </p>
                        <p className="text-xs text-gray-500">Publicerad för 2 månader sedan</p>
                      </div>
                      
                      <div className="text-center space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2 justify-center">
                          <a 
                            href="https://www.trustpilot.com/review/shop.b8shield.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Läs alla recensioner
                          </a>
                          <span className="hidden sm:inline text-gray-400">•</span>
                          <a 
                            href="https://www.trustpilot.com/evaluate/shop.b8shield.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Skriv en recension
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Additional Product Info */}
              {currentProduct.descriptions?.b2cMoreInfo && (
                  <details className="group">
                    <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                      <span className="text-base font-medium text-gray-900">Mer produktinformation</span>
                      <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="pb-4 px-4 -mx-4 text-sm text-gray-600">
                      <div 
                        className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentProduct.descriptions.b2cMoreInfo }}
                    />
                  </div>
                  </details>
                )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal 
        isOpen={sizeGuideModalOpen}
        onClose={() => setSizeGuideModalOpen(false)}
        sizeGuideContent={getGroupContentValue('sizeGuide')}
        productName={currentProduct.name}
      />
    </>
  );
};

export default PublicProductPage; 