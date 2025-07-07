import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import { getProductUrl } from '../../utils/productUrls';
import toast from 'react-hot-toast';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ReviewsSection from '../../components/ReviewsSection';
import { getAllReviews } from '../../utils/trustpilotAPI';
import SeoHreflang from '../../components/shop/SeoHreflang';

const PublicStorefront = () => {
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroReview, setHeroReview] = useState(null);

  useEffect(() => {
    loadProducts();
    loadHeroReview();
  }, []);

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
      
      // Sort products alphabetically using the translated name
      productList.sort((a, b) => {
        const nameA = getContentValue(a.name, 'sv-SE');
        const nameB = getContentValue(b.name, 'sv-SE');
        return nameA.localeCompare(nameB, currentLanguage);
      });
      setProducts(productList);
      
      // Group products dynamically by their group field
      const grouped = groupProductsByGroup(productList);
      setGroupedProducts(grouped);
      
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('error_loading_products', 'Kunde inte ladda produkter'));
    } finally {
      setLoading(false);
    }
  };

  // Dynamically group products by their group field
  const groupProductsByGroup = (products) => {
    const productGroups = {};
    
    products.forEach(product => {
      // Use the group field, skip products without groups
      const groupName = getContentValue(product.group);
      if (!groupName) return;
      
      if (!productGroups[groupName]) {
        productGroups[groupName] = {
          groupName: groupName,
          products: [],
          representativeProduct: product,
          isMultipack: groupName.includes('multipack') || groupName.includes('3-pack')
        };
      }
      
      productGroups[groupName].products.push(product);
    });
    
    // Return array of product groups with their variants
    return Object.values(productGroups).map(group => {
      if (group.isMultipack) {
        // For multipacks: group by color, show one card per color
        const colorVariants = {};
        
        group.products.forEach(product => {
          const color = product.color || 'Standard';
          if (!colorVariants[color]) {
            colorVariants[color] = {
              color: color,
              products: [],
              representativeProduct: product
            };
          }
          colorVariants[color].products.push(product);
        });
        
        // Return the group with color variants (one card per color)
        return {
          ...group.representativeProduct,
          groupName: group.groupName,
          isMultipack: true,
          colorVariants: Object.values(colorVariants).map(colorGroup => ({
            ...colorGroup.representativeProduct,
            colorVariant: colorGroup.color,
            variants: colorGroup.products,
            availableColors: [colorGroup.color], // Single color for multipack
            availableSizes: colorGroup.products.map(p => ({
              id: p.id,
              size: p.size || 'Standard',
              price: p.b2cPrice || p.basePrice,
              name: getContentValue(p.name)
            }))
          }))
        };
      } else {
        // For individual products: group by color, then show size variants
        const colorVariants = {};
        
        group.products.forEach(product => {
          const color = product.color || 'Standard';
          if (!colorVariants[color]) {
            colorVariants[color] = {
              color: color,
              products: [],
              representativeProduct: product
            };
          }
          colorVariants[color].products.push(product);
        });
        
        // Return the group with color variants
        return {
          ...group.representativeProduct,
          groupName: group.groupName,
          isMultipack: false,
          colorVariants: Object.values(colorVariants).map(colorGroup => ({
            ...colorGroup.representativeProduct,
            colorVariant: colorGroup.color,
            variants: colorGroup.products,
            availableSizes: colorGroup.products.map(p => ({
              id: p.id,
              size: p.size || 'Standard',
              price: p.b2cPrice || p.basePrice,
              name: getContentValue(p.name)
            }))
          }))
        };
      }
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(price);
  };

  const addToCart = (product) => {
    // TODO: Implement cart functionality
    const productName = getContentValue(product.name);
    toast.success(t('product_added_to_cart', '{{name}} tillagd i varukorgen!', { name: productName }));
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
    if (product.descriptions?.b2c) return product.descriptions.b2c;
    if (product.description) return product.description;
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
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-blue-600 border border-blue-200/50 mb-8">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                {t('hero_innovation_badge', 'Ny innovation från Sverige')}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
                {t('hero_title_start', 'Fastna')}
                <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent"> {t('hero_title_middle', 'aldrig')} </span>
                {t('hero_title_end', 'mer!')}
              </h1>
              
              <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
                {t('hero_subtitle', 'B8Shield™ – Vasskydd som förhindrar att dina fiskedrag fastnar i vassen utan att påverka ditt fiske.')}
              </p>

              {/* Social Proof - Dynamic Review */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-12 max-w-2xl mx-auto border border-white/20 shadow-xl">
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
                <blockquote className="text-gray-700 italic text-lg">
                  "{heroReview?.text || 'Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!'}"
                </blockquote>
                <cite className="text-sm text-gray-500 mt-2 block">
                  — {heroReview?.author || 'Paul W.'}{heroReview?.location ? `, ${heroReview.location}` : ', Sportfiskarna Sverige'}
                </cite>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {t('hero_shop_now_button', 'Handla nu')}
                </button>
                <button className="border-2 border-white/70 text-white px-8 py-4 rounded-full text-lg font-semibold hover:border-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                  {t('hero_read_more_button', 'Läs mer')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedProducts.map((productGroup, groupIndex) => {
                  if (productGroup.isMultipack) {
                    // For multipacks: show only ONE card representing the entire group
                    const representativeVariant = productGroup.colorVariants[0]; // Use first color as representative
                    const productUrl = getProductUrl(representativeVariant);
                    return (
                      <Link
                        key={`${productGroup.groupName}-multipack-${groupIndex}`}
                        to={productUrl}
                        className="group block"
                      >
                        <div className="bg-white">
                          {/* Product Image */}
                          <div className="relative aspect-square bg-gray-50 mb-4 overflow-hidden">
                            <img
                              src={getB2cProductImage(representativeVariant)}
                              alt={`B8Shield 3-pack`}
                              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                            />
                            
                            {/* Sustainable Material Badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded text-[11px]">
                                {t('sustainable_materials_badge', 'Hållbara material')}
                              </span>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="space-y-1">
                            {/* Product Name */}
                            <h3 className="text-base font-medium text-gray-900 leading-tight">
                              {t('product_name_3pack', 'B8Shield 3-pack')}
                            </h3>
                            
                            {/* Product Description */}
                            <p className="text-sm text-gray-600 leading-tight">
                              {t('product_description_3pack', 'Vasskydd 3-pack för olika fiskemiljöer')}
                            </p>
                            
                            {/* Variant Info */}
                            <p className="text-sm text-gray-500">
                              {t('product_3pack_info', 'Innehåller alla storlekar (2mm, 4mm, 6mm) • {{count}} färger', { count: productGroup.colorVariants.length })}
                            </p>
                            
                            {/* Price */}
                            <p className="text-base font-medium text-gray-900 pt-1">
                              {formatPrice(representativeVariant.b2cPrice || representativeVariant.basePrice)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  } else {
                    // For individual products: show one card per color variant
                    return productGroup.colorVariants?.map((colorVariant, colorIndex) => {
                      const productUrl = getProductUrl(colorVariant);
                      return (
                      <Link
                        key={`${productGroup.groupName}-${colorVariant.colorVariant}-${colorIndex}`}
                        to={productUrl}
                        className="group block"
                      >
                        <div className="bg-white">
                          {/* Product Image */}
                          <div className="relative aspect-square bg-gray-50 mb-4 overflow-hidden">
                            <img
                              src={getB2cProductImage(colorVariant)}
                              alt={`B8Shield ${colorVariant.colorVariant}`}
                              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                            />
                            
                            {/* Sustainable Material Badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded text-[11px]">
                                {t('sustainable_materials_badge', 'Hållbara material')}
                              </span>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="space-y-1">
                            {/* Product Name */}
                            <h3 className="text-base font-medium text-gray-900 leading-tight">
                              {t('product_name_individual', 'B8Shield {{color}}', { color: colorVariant.colorVariant })}
                            </h3>
                            
                            {/* Product Description */}
                            <p className="text-sm text-gray-600 leading-tight">
                              {t('product_description_individual', 'Vasskydd som förhindrar fastnade fiskedrag')}
                            </p>
                            
                            {/* Variant Info */}
                            <p className="text-sm text-gray-500">
                              {colorVariant.availableSizes?.length > 1 
                                ? t('product_multiple_sizes', '{{count}} storlekar', { count: colorVariant.availableSizes.length })
                                : t('product_single_size', '1 storlek')}
                            </p>
                            
                            {/* Price */}
                            <p className="text-base font-medium text-gray-900 pt-1">
                              {formatPrice(colorVariant.b2cPrice || colorVariant.basePrice)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}) || [];
                  }
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
      </div>
    </>
  );
};

export default PublicStorefront; 