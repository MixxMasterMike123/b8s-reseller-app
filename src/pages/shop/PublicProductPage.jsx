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
import ReviewsSection from '../../components/ReviewsSection';
import { getReviewStats } from '../../utils/trustpilotAPI';
import SeoHreflang from '../../components/shop/SeoHreflang';

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
  const [reviewCount, setReviewCount] = useState(16); // Default fallback
  const { addToCart, cart } = useCart();

  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  // Load review count
  useEffect(() => {
    const loadReviewCount = async () => {
      try {
        const stats = await getReviewStats();
        setReviewCount(stats.totalReviews);
      } catch (error) {
        console.error('Error loading review count:', error);
        // Keep default fallback value of 16
      }
    };

    loadReviewCount();
  }, []);

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
        toast.error(t('product_not_found', 'Produkten hittades inte'));
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
        toast.error(t('product_not_found', 'Produkten hittades inte'));
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
      toast.error(t('error_loading_product', 'Kunde inte ladda produkten'));
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
      toast.error(isMultipack ? t('please_select_color', 'Vänligen välj en färg') : t('please_select_size', 'Vänligen välj en storlek'));
      return;
    }

    const selectedVariant = variants.find(v => v.id === selectedSize);
    if (!selectedVariant) {
      toast.error(isMultipack ? t('invalid_color_selected', 'Ogiltig färg vald') : t('invalid_size_selected', 'Ogiltig storlek vald'));
      return;
    }

    addToCart(selectedVariant, quantity, isMultipack ? selectedVariant.color : selectedVariant.size);
    toast.success(t('product_added_to_cart_product_page', 'Produkt tillagd i varukorgen'));
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
    
    // CRITICAL: Triple safety checks to prevent React Error #31
    // Check if content is null or undefined
    if (content === null || content === undefined) return '';
    
    // If it's a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object (multilingual), get the appropriate language
    if (typeof content === 'object' && content !== null) {
      // Try to get Swedish first, then English UK, then English US
      const swedishValue = content['sv-SE'];
      const englishGBValue = content['en-GB'];
      const englishUSValue = content['en-US'];
      
      // Ensure we return a string, never an object
      if (typeof swedishValue === 'string') return swedishValue;
      if (typeof englishGBValue === 'string') return englishGBValue;
      if (typeof englishUSValue === 'string') return englishUSValue;
      
      // Find any available string value
      const stringValue = Object.values(content).find(val => typeof val === 'string' && val && val.length > 0);
      
      // Final safety: convert to string and fallback to empty string
      return String(stringValue || '');
    }
    
    // Final safety: convert anything else to string
    return String(content || '');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('product_not_found_page_title', 'Produkten hittades inte')}</h1>
          <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors">
            {t('back_to_shop_button', 'Tillbaka till butiken')}
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
      <SeoHreflang />
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
                    {isMultipack ? t('select_color', 'Välj färg') : t('select_size', 'Välj storlek')}
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
                  {t('add_to_shopping_bag', 'Lägg i shoppingbagen')}
                </button>
                
                <button className="w-full border border-gray-300 py-4 px-8 rounded-full text-base font-medium hover:border-gray-400 transition-colors">
                  {t('favorite_button', 'Favorit ♡')}
                </button>
              </div>

              {/* Payment Options */}
              <div className="border-t pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Klarna.</span> {t('klarna_available_at_checkout', 'är tillgängligt i kassan.')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('click_and_collect_available', 'Tillgängligt för Click and Collect i kassan')}
                </p>
              </div>

              {/* Product Description */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {t('show_product_information', 'Visa produktinformation')}
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600">
                  <p>
                    {getB2cDescription(currentProduct) || 
                     t('product_detailed_description', 'B8Shield {{color}} i storlek {{size}} ger dig det ultimata skyddet för dina fiskedrag. Denna högkvalitativa produkt är utvecklad för att hålla i många år av intensivt fiske, oavsett väderförhållanden. Perfekt för både nybörjare och erfarna fiskare som vill skydda sina värdefulla fiskedrag från skador.', { color: productColor, size: currentProduct.size || 'Standard' })}
                  </p>
                  
                  <ul className="mt-4 space-y-2">
                    <li>• {t('product_color_shown', 'Färg som visas: {{color}}', { color: productColor })}</li>
                    <li>• {t('product_size_spec', 'Storlek: {{size}}', { size: currentProduct.size || 'Standard' })}</li>
                    <li>• {t('product_style_spec', 'Stil: {{sku}}', { sku: currentProduct.sku || 'B8S-001' })}</li>
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
                    <span className="text-base font-medium text-gray-900">
                      {t('product_reviews_section_with_count', 'Recensioner ({{count}})', {count: reviewCount})}
                    </span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pb-4 px-4 -mx-4">
                    <ReviewsSection 
                      businessId="shop.b8shield.com"
                      domain="shop.b8shield.com"
                      showTrustpilot={false}
                      showManualReviews={true}
                      className="border-none shadow-none"
                    />
                  </div>
                </details>

                {/* Additional Product Info */}
              {currentProduct.descriptions?.b2cMoreInfo && (
                  <details className="group">
                    <summary className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4 rounded-lg">
                      <span className="text-base font-medium text-gray-900">{t('more_product_information', 'Mer produktinformation')}</span>
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