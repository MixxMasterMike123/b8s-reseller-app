import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import { getProductUrl } from '../../utils/productUrls';
import { translateColor } from '../../utils/colorTranslations';
// Toast notifications removed - using AddedToCartModal for user feedback
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ReviewsSection from '../../components/ReviewsSection';
import { getAllReviews } from '../../utils/trustpilotAPI';
import SeoHreflang from '../../components/shop/SeoHreflang';
import SmartPrice from '../../components/shop/SmartPrice';
import { getProductGroupContent } from '../../utils/productGroups';
import AddedToCartModal from '../../components/shop/AddedToCartModal';

const PublicStorefront = () => {
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const { 
    addToCart: addToCartContext, 
    isAddedToCartModalVisible, 
    hideAddedToCartModal, 
    lastAddedItem,
    getTotalItems 
  } = useCart();
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroReview, setHeroReview] = useState(null);

  useEffect(() => {
    loadProducts();
    loadHeroReview();
  }, [currentLanguage]); // Reload when language changes

  const loadHeroReview = async () => {
    try {
      const allReviews = await getAllReviews();
      // Exclude Paul W. to avoid duplicate testimonial
      const filteredReviews = allReviews.filter(r => r.author !== 'Paul W.');
      
      if (filteredReviews.length > 0) {
        const randomIndex = Math.floor(Math.random() * filteredReviews.length);
        const selectedReview = filteredReviews[randomIndex];
        setHeroReview(selectedReview);
      }
    } catch (err) {
      console.error('Error loading hero review:', err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true),
        where('availability.b2c', '==', true) // Only show B2C available products
      );
      const querySnapshot = await getDocs(productsQuery);
      
      const productList = [];
      querySnapshot.forEach((doc) => {
        productList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort products alphabetically using the translated name
      productList.sort((a, b) => {
        // Use current language for content retrieval, with multiple fallbacks
        let nameA, nameB;
        
        try {
          nameA = getContentValue(a.name, currentLanguage) || getContentValue(a.name) || getContentValue(a.name || '') || '';
          nameB = getContentValue(b.name, currentLanguage) || getContentValue(b.name) || getContentValue(b.name || '') || '';
        } catch (error) {
          // If getContentValue fails, use safe string conversion
          nameA = String(a.name || '');
          nameB = String(b.name || '');
        }
        
        // Ensure we have strings for comparison
        const safeNameA = typeof nameA === 'string' ? nameA : String(nameA || '');
        const safeNameB = typeof nameB === 'string' ? nameB : String(nameB || '');
        
        return safeNameA.localeCompare(safeNameB, currentLanguage || 'en');
      });
      setProducts(productList);
      
      // Group products dynamically by their group field and load representative products
      const grouped = await groupProductsByGroup(productList);
      setGroupedProducts(grouped);
      
    } catch (error) {
      console.error('Error loading products:', error);
      // Product loading error - handled by showing empty state
    } finally {
      setLoading(false);
    }
  };

  // Dynamically group products by their group field and load representative products
  const groupProductsByGroup = async (products) => {
    const grouped = {};
    
    // First, group all products by their group field
    products.forEach(product => {
      const groupKey = product.group || 'default';
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupName: groupKey,
          allProducts: [],
          representativeProduct: null,
          isMultipack: false
        };
      }
      grouped[groupKey].allProducts.push(product);
    });

    // For each group, determine the representative product
    const groupPromises = Object.keys(grouped).map(async (groupKey) => {
      const group = grouped[groupKey];
      
      // Mark multipack groups
      if (groupKey.toLowerCase().includes('3pack') || groupKey.toLowerCase().includes('pack')) {
        group.isMultipack = true;
      }

      try {
        // Load group content to get defaultProductId
        const groupContent = await getProductGroupContent(groupKey);
        
        if (groupContent && groupContent.defaultProductId) {
          // Use the admin-selected default product
          const defaultProduct = group.allProducts.find(p => p.id === groupContent.defaultProductId);
          if (defaultProduct) {
            group.representativeProduct = defaultProduct;
            console.log(`✅ Using admin-selected default for group ${groupKey}:`, defaultProduct.id);
          } else {
            console.warn(`⚠️ Admin-selected default product ${groupContent.defaultProductId} not found in group ${groupKey}, using first product`);
            group.representativeProduct = group.allProducts[0];
          }
        } else {
          // No default set, use first product in group
          group.representativeProduct = group.allProducts[0];
          console.log(`🔄 No default set for group ${groupKey}, using first product:`, group.allProducts[0]?.id);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load group content for ${groupKey}, using first product:`, error);
        group.representativeProduct = group.allProducts[0];
      }

      return group;
    });

    // Wait for all group content to load
    await Promise.all(groupPromises);

    return Object.values(grouped);
  };

  const addToCart = (product) => {
    addToCartContext(product);
    // Success feedback now handled by AddedToCartModal
  };

  // Get the best available image for B2C display
  const getB2cProductImage = (product) => {
    // Priority: B2C main image > B2C gallery first image > generated image
    // NOTE: Do NOT fall back to B2B images in the consumer shop!
    if (product.b2cImageUrl) return product.b2cImageUrl;
    if (product.b2cImageGallery && product.b2cImageGallery.length > 0) return product.b2cImageGallery[0];
    
    // Generate consumer-focused image if no B2C images available
    return getProductImage(product); // Pass the product object to use color field
  };

  // Get product description - prefer B2C description
  const getB2cProductDescription = (product) => {
    // 🚨 CRITICAL: Always use getContentValue() for multilingual content to prevent React Error #31
    if (product.descriptions?.b2c) return getContentValue(product.descriptions.b2c);
    if (product.description) return getContentValue(product.description);
    return t('product_description_fallback', 'B8Shield {{color}} - Vasskydd som förhindrar att dina fiskedrag fastnar', { color: product.colorVariant || '' });
  };

  return (
    <>
      <SeoHreflang />
      <div className="min-h-screen bg-white">
        <ShopNavigation />
        
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
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            {/* Desktop: Column layout */}
            <div className="hidden lg:flex items-center justify-between">
              {/* Left Column: Badge and Title */}
              <div className="flex-1 text-left">
                <img
                  src="/images/badge_of_honor_b8s.svg"
                  alt={t('hero_innovation_badge_alt', 'Innovation from Sweden badge')}
                  className="h-16 w-auto mb-6 drop-shadow-lg"
                />
                
                <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                  {t('hero_title_start', 'Fastna')}
                  <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent"> {t('hero_title_middle', 'aldrig')} </span>
                  {t('hero_title_end', 'mer!')}
                </h1>
                
                <p className="text-xl text-white/90 mb-6 max-w-lg leading-relaxed drop-shadow-md">
                  {t('hero_subtitle', 'B8Shield™ – Vasskydd som förhindrar att dina fiskedrag fastnar i vassen utan att påverka ditt fiske.')}
                </p>

                <button 
                  onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {t('hero_shop_now_button', 'Handla nu')}
                </button>
              </div>

              {/* Right Column: Social Proof */}
              <div className="flex-1 flex justify-end">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md border border-white/20 shadow-xl">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          className={`w-5 h-5 fill-current ${
                            i < (heroReview?.rating || 5) ? 'text-yellow-400' : 'text-gray-300'
                          }`} 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {heroReview?.title && (
                    <h4 className="text-gray-900 font-semibold text-lg mb-2 text-center">
                      {heroReview.title}
                    </h4>
                  )}
                  <blockquote className="text-gray-700 italic text-lg">
                    "{heroReview?.text || 'Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!'}"
                  </blockquote>
                  <cite className="text-sm text-gray-500 mt-2 block">
                    — {heroReview?.author || 'Paul W.'}{heroReview?.location ? `, ${heroReview.location}` : ', Sportfiskarna Sverige'}
                  </cite>
                </div>
              </div>
            </div>

            {/* Mobile: Compact layout without review */}
            <div className="lg:hidden text-center">
              <img
                src="/images/badge_of_honor_b8s.svg"
                alt={t('hero_innovation_badge_alt', 'Innovation from Sweden badge')}
                className="h-16 w-auto mx-auto mb-4 drop-shadow-lg"
              />
              
              <h1 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">
                {t('hero_title_start', 'Fastna')}
                <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent"> {t('hero_title_middle', 'aldrig')} </span>
                {t('hero_title_end', 'mer!')}
              </h1>
              
              <p className="text-base text-white/90 mb-6 max-w-sm mx-auto leading-relaxed drop-shadow-md">
                {t('hero_subtitle', 'B8Shield™ – Vasskydd som förhindrar att dina fiskedrag fastnar i vassen utan att påverka ditt fiske.')}
              </p>

              <button 
                onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full text-base font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {t('hero_shop_now_button', 'Handla nu')}
              </button>
            </div>
          </div>
        </section>

        {/* B8Shields in Nature Section - Nike-inspired design */}
        <section className="py-16 bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop: 4 images in horizontal grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {[
                { src: '/images/b8s_transp_nature.webp', colorKey: 'color_transparent', productUrl: '/product/b8shield-transparent-4_B8S-4-tr' },
                { src: '/images/b8s_red_nature.webp', colorKey: 'color_red', productUrl: '/product/b8shield-rod-4_B8S-4-re' },
                { src: '/images/b8s_flour_nature.webp', colorKey: 'color_fluorescent', productUrl: '/product/b8shield-fluorescerande-4_B8S-4-fl' },
                { src: '/images/b8s_glitter_nature.webp', colorKey: 'color_glitter', productUrl: '/product/b8shield-glitter-4_B8S-4-gl' }
              ].map((image, index) => (
                <Link key={index} to={image.productUrl} className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden group block">
                  <img
                    src={image.src}
                    alt={`B8Shield ${t(image.colorKey)} i naturen`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Color name pill - Nike style */}
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white text-black text-sm font-medium px-3 py-1 rounded-full">
                      {t(image.colorKey)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Mobile: Horizontal scroll showing 1 and 1/3 images */}
            <div className="md:hidden">
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
                {[
                  { src: '/images/b8s_transp_nature.webp', colorKey: 'color_transparent', productUrl: '/product/b8shield-transparent-4_B8S-4-tr' },
                  { src: '/images/b8s_red_nature.webp', colorKey: 'color_red', productUrl: '/product/b8shield-rod-4_B8S-4-re' },
                  { src: '/images/b8s_flour_nature.webp', colorKey: 'color_fluorescent', productUrl: '/product/b8shield-fluorescerande-4_B8S-4-fl' },
                  { src: '/images/b8s_glitter_nature.webp', colorKey: 'color_glitter', productUrl: '/product/b8shield-glitter-4_B8S-4-gl' }
                ].map((image, index) => (
                  <Link key={index} to={image.productUrl} className="relative flex-shrink-0 w-4/5 aspect-square bg-gray-900 rounded-lg overflow-hidden group snap-start block">
                    <img
                      src={image.src}
                      alt={`B8Shield ${t(image.colorKey)} i naturen`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Color name pill - Nike style */}
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-white text-black text-sm font-medium px-3 py-1 rounded-full">
                        {t(image.colorKey)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {t('products_section_title', 'Våra Produkter')}
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t('products_section_subtitle', 'Välj mellan olika färger och storlekar för att passa ditt fiske')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {groupedProducts.map((productGroup, groupIndex) => {
                  // For ALL product groups: show only ONE card using the representative product
                  const representativeProduct = productGroup.representativeProduct;
                  if (!representativeProduct) {
                    console.warn(`⚠️ No representative product found for group ${productGroup.groupName}`);
                    return null;
                  }
                  
                  const productUrl = getProductUrl(representativeProduct);
                  const isMultipack = productGroup.isMultipack;
                  const variantCount = productGroup.allProducts.length;
                  
                  return (
                    <Link
                      key={`${productGroup.groupName}-${groupIndex}`}
                      to={productUrl}
                      className="group block"
                    >
                      <div className="bg-white h-full flex flex-col">
                        {/* Product Image */}
                        <div className="relative aspect-square bg-gray-50 overflow-hidden">
                          <img
                            src={getB2cProductImage(representativeProduct)}
                            alt={`B8Shield ${isMultipack ? '3-pack' : productGroup.groupName}`}
                            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          />
                          
                          {/* Sustainable Material Badge */}
                          <div className="absolute top-3 left-3">
                            <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded text-[11px]">
                              {t('sustainable_materials_badge', 'Hållbara material')}
                            </span>
                          </div>

                          {/* Variant Count Badge */}
                          {variantCount > 1 && (
                            <div className="absolute top-3 right-3">
                              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded text-[11px]">
                                {t('variant_count_badge', '{{count}} varianter', { count: variantCount })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info - Flex container for consistent height */}
                        <div className="flex flex-col flex-1 p-4">
                          {/* Product Name */}
                          <h3 className="text-base font-medium text-gray-900 leading-tight mb-2">
                            {isMultipack 
                              ? t('product_name_3pack', 'B8Shield 3-pack')
                              : (() => {
                                  // 🚨 CRITICAL: Ensure we never render an object - prevent React Error #31
                                  const productName = getContentValue(representativeProduct.name);
                                  return typeof productName === 'string' && productName 
                                    ? productName 
                                    : t('product_name_fallback', 'B8Shield {{group}}', { group: productGroup.groupName });
                                })()
                            }
                          </h3>
                          
                          {/* Product Description - Much smaller font */}
                          <p className="text-xs text-gray-600 leading-tight mb-2 flex-1">
                            {isMultipack 
                              ? t('product_description_3pack', 'Vasskydd 3-pack för olika fiskemiljöer')
                              : (() => {
                                  // 🚨 CRITICAL: Ensure we never render an object - prevent React Error #31
                                  const description = getB2cProductDescription(representativeProduct);
                                  return typeof description === 'string' ? description : t('product_description_fallback', 'B8Shield vasskydd');
                                })()
                            }
                          </p>
                          
                          {/* Bottom section with price, variants, and CTA */}
                          <div className="mt-auto space-y-2">
                            {/* Variant Info */}
                            <p className="text-xs text-gray-500">
                              {isMultipack 
                                ? t('product_3pack_info', 'Innehåller alla storlekar (2mm, 4mm, 6mm) • {{count}} färger', { count: variantCount })
                                : variantCount > 1 
                                  ? t('product_group_variants', '{{count}} färger och storlekar', { count: variantCount })
                                  : t('product_single_variant', 'En variant tillgänglig')
                              }
                            </p>
                            
                            {/* Price - Now with intelligent currency conversion */}
                            <div className="text-lg font-medium text-gray-900">
                              <SmartPrice 
                                sekPrice={representativeProduct.b2cPrice || representativeProduct.basePrice} 
                                variant="compact"
                                showOriginal={false}
                              />
                            </div>
                            
                            {/* CTA Button */}
                            <div className="pt-2">
                              <div className="bg-black text-white text-center py-2 px-4 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                                {t('product_choose_button', 'Välj')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {!loading && groupedProducts.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">{t('no_products_available', 'Inga produkter tillgängliga för tillfället.')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {t('features_section_title', 'Varför välja B8Shield™?')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('feature_proven_effective_title', 'Bevisat Effektivt')}</h3>
                <p className="text-gray-600">{t('feature_proven_effective_description', 'Minska förlusten av beten med upp till 90% enligt våra tester')}</p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('feature_easy_to_use_title', 'Enkelt att Använda')}</h3>
                <p className="text-gray-600">{t('feature_easy_to_use_description', 'Fäst enkelt på ditt fiskedrag på några sekunder')}</p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('feature_eco_friendly_title', 'Miljövänligt')}</h3>
                <p className="text-gray-600">{t('feature_eco_friendly_description', 'Återvinningsbart material som skyddar våra vattenmiljöer')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {t('reviews_section_title', 'Vad våra kunder säger')}
              </h2>
              <p className="text-xl text-gray-600">
                {t('reviews_section_subtitle', 'Äkta recensioner från nöjda sportfiskare')}
              </p>
            </div>
            
            <ReviewsSection 
              businessId="" // Will be set when Trustpilot profile is ready
              domain="shop.b8shield.com"
              showTrustpilot={false} // Start with manual reviews, enable when Trustpilot is set up
              showManualReviews={true}
              className="w-full"
            />
          </div>
        </section>

        {/* Footer */}
        <ShopFooter />

        {isAddedToCartModalVisible && lastAddedItem && (
          <AddedToCartModal 
            isVisible={isAddedToCartModalVisible}
            onClose={hideAddedToCartModal}
            addedItem={lastAddedItem}
            cartCount={getTotalItems()}
          />
        )}
      </div>
    </>
  );
};

export default PublicStorefront; 