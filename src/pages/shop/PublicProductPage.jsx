import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import { 
  getSkuFromSlug, 
  getProductUrl, 
  getProductSeoTitle, 
  getProductSeoDescription, 
  getCountryAwareUrl 
} from '../../utils/productUrls';
// Toast notifications removed - using AddedToCartModal for user feedback
import { generateProductSchema } from '../../utils/productFeed';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { getProductGroupContent } from '../../utils/productGroups';
import { translateColor } from '../../utils/colorTranslations';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import SizeGuideModal from '../../components/SizeGuideModal';
import ReviewsSection from '../../components/ReviewsSection';
import { getReviewStats } from '../../utils/trustpilotAPI';
import SeoHreflang from '../../components/shop/SeoHreflang';
import { Helmet } from 'react-helmet';
import SocialShare from '../../components/shop/SocialShare';
import SmartPrice from '../../components/shop/SmartPrice';
import AddedToCartModal from '../../components/shop/AddedToCartModal';

const PublicProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [groupContent, setGroupContent] = useState(null);
  const [groupContentLoading, setGroupContentLoading] = useState(false);
  const [sizeGuideModalOpen, setSizeGuideModalOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState(16);
  const { 
    addToCart,
    isAddedToCartModalVisible, 
    hideAddedToCartModal, 
    lastAddedItem,
    getTotalItems 
  } = useCart();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProductAndVariants();
    }
  }, [slug]);

  const loadProductAndVariants = async () => {
    try {
      setLoading(true);
      
      const sku = getSkuFromSlug(slug);
      if (!sku) {
        console.error('Product not found: invalid slug', slug);
        navigate(getCountryAwareUrl(''));
        return;
      }
      
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('sku', '==', sku), where('isActive', '==', true), where('availability.b2c', '==', true));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('Product not found: no matching documents', sku);
        navigate(getCountryAwareUrl(''));
        return;
      }

      const mainProduct = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      setProduct(mainProduct);

      // Load group content if product has a group
      if (mainProduct.group) {
        loadGroupContent(mainProduct.group);
      }
      
      // Load all other variants in the same group for the selection UI
      const productGroup = mainProduct.group;
      if (productGroup) {
        const variantsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('availability.b2c', '==', true),
          where('group', '==', productGroup)
        );
        
        const variantsSnapshot = await getDocs(variantsQuery);
        const groupVariants = variantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort variants
        const isMultipack = productGroup.includes('multipack') || productGroup.includes('3-pack');
        if (isMultipack) {
            groupVariants.sort((a, b) => {
                const colorOrder = ['Transparent', 'Röd', 'Fluorescerande', 'Glitter'];
                return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
            });
        } else {
            groupVariants.sort((a, b) => (parseInt(a.size) || 0) - (parseInt(b.size) || 0));
        }
        setVariants(groupVariants);
      } else {
        setVariants([mainProduct]);
      }
      
    } catch (error) {
      console.error('Error loading product:', error);
      // Navigation error - handled by redirecting to home
    } finally {
      setLoading(false);
    }
  };

  const loadGroupContent = async (groupId) => {
    if (!groupId) return;
    try {
      setGroupContentLoading(true);
      const content = await getProductGroupContent(groupId);
      setGroupContent(content);
    } catch (error) {
      console.error('Error loading group content:', error);
    } finally {
      setGroupContentLoading(false);
    }
  };

  useEffect(() => {
    const fetchReviewCount = async () => {
      try {
        const stats = await getReviewStats();
        setReviewCount(stats.totalReviews);
      } catch (error) {
        console.error('Error loading review count:', error);
      }
    };
    fetchReviewCount();
  }, []);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    // Success feedback now handled by AddedToCartModal
  };
  
  // SEO and rendering helpers
  const getB2cDescription = (p) => getContentValue(p?.descriptions?.b2c) || '';
  const getProductColor = (p) => translateColor(p?.color, t) || 'Standard';
  const getProductImages = (p) => {
      if (!p) return [];
      const images = [];
      if (p.b2cImageUrl) images.push(p.b2cImageUrl);
      if (p.b2cImageGallery?.length) images.push(...p.b2cImageGallery);
      if (images.length === 0) images.push(getProductImage(p));
      return images;
  };
  
  useEffect(() => {
    // After group content and product are loaded, redirect if needed
    if (!redirected && !location.state?.skipPreferredRedirect && groupContent?.defaultProductId && product && product.id !== groupContent.defaultProductId) {
      const preferredId = groupContent.defaultProductId;
      const preferredVariant = variants.find(v => v.id === preferredId);
      const handleRedirect = async () => {
        let preferredProductData = preferredVariant;
        if (!preferredProductData) {
          // Fetch from Firestore if not in variants yet
          try {
            const docSnap = await getDoc(doc(db, 'products', preferredId));
            if (docSnap.exists()) {
              preferredProductData = { id: docSnap.id, ...docSnap.data() };
            }
          } catch (err) {
            console.error('Failed to fetch preferred product variant', err);
          }
        }
        if (preferredProductData) {
          const url = getProductUrl(preferredProductData);
          setRedirected(true);
          navigate(url, { replace: true });
        }
      };
      handleRedirect();
    }
  }, [groupContent, product, variants, redirected, navigate, location.state]);
  
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
          <Link to={getCountryAwareUrl('')} className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors">
            {t('back_to_shop', 'Tillbaka till butiken')}
          </Link>
        </div>
      </div>
    );
  }

  const productImages = getProductImages(product);
  const isMultipack = product?.group?.includes('multipack') || product?.group?.includes('3-pack');

  return (
    <>
      <Helmet>
        <title>{getProductSeoTitle(product)}</title>
        <meta name="description" content={getProductSeoDescription(product)} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={getProductSeoTitle(product)} />
        <meta property="og:description" content={getProductSeoDescription(product)} />
        <meta property="og:image" content={productImages[0]} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getProductSeoTitle(product)} />
        <meta name="twitter:description" content={getProductSeoDescription(product)} />
        <meta name="twitter:image" content={productImages[0]} />
        <script type="application/ld+json">{JSON.stringify(generateProductSchema(product))}</script>
      </Helmet>
      <SeoHreflang />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={getContentValue(product?.name)} />
        
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
                          alt={`${getContentValue(product.name)} ${index + 1}`}
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
                      alt={getContentValue(product.name)}
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
                  {getContentValue(product.name)}
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  {getB2cDescription(product) || `B8Shield ${getProductColor(product)} - ${product.size || 'Standard'}`}
                </p>

              {/* Price */}
                <div className="text-2xl font-medium text-gray-900 mb-6">
                  <SmartPrice 
                    sekPrice={product.b2cPrice || product.basePrice} 
                    variant="large"
                    showOriginal={false}
                    className="text-2xl font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* Size/Color Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">
                    {isMultipack ? t('select_color', 'Välj färg') : t('select_size', 'Välj storlek')}
                  </h3>
                  {!isMultipack && (
                    <button onClick={() => setSizeGuideModalOpen(true)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                      {t('size_guide_link', 'Storleksguide')}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {variants.map((variant) => (
                    <Link
                      key={variant.id}
                      to={getProductUrl(variant)}
                      state={{ skipPreferredRedirect: true }}
                      className={`py-4 px-4 text-center border rounded-md transition-all ${
                        product.id === variant.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {isMultipack ? translateColor(variant.color, t) || 'Standard' : (variant.size || 'Standard')}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
                
              {/* Add to Cart */}
              <div className="space-y-4">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-black text-white py-4 px-8 rounded-full text-base font-medium hover:bg-gray-800 transition-colors"
                >
                  {t('add_to_shopping_bag', 'Lägg i shoppingbagen')}
                </button>
                
                <button className="w-full border border-gray-300 py-4 px-8 rounded-full text-base font-medium hover:border-gray-400 transition-colors">
                  {t('favorite_button', 'Favorit ♡')}
                </button>
              </div>

              {/* Social Share */}
              <SocialShare
                url={window.location.href}
                title={getContentValue(product?.name)}
                image={getProductImages(product)[0]}
              />

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
                    {getB2cDescription(product) || 
                     t('product_detailed_description', 'B8Shield {{color}} i storlek {{size}} ger dig det ultimata skyddet för dina fiskedrag. Denna högkvalitativa produkt är utvecklad för att hålla i många år av intensivt fiske, oavsett väderförhållanden. Perfekt för både nybörjare och erfarna fiskare som vill skydda sina värdefulla fiskedrag från skador.', { color: getProductColor(product), size: product.size || 'Standard' })}
                  </p>
                  
                  <ul className="mt-4 space-y-2">
                    <li>• {t('product_color_shown', 'Färg som visas: {{color}}', { color: getProductColor(product) })}</li>
                    <li>• {t('product_size_spec', 'Storlek: {{size}}', { size: product.size || 'Standard' })}</li>
                    <li>• {t('product_style_spec', 'Stil: {{sku}}', { sku: product.sku || 'B8S-001' })}</li>
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
                      groupContent?.sizeAndFit ? (
                        <div 
                          className="prose prose-sm text-gray-700"
                          dangerouslySetInnerHTML={{ __html: getContentValue(groupContent.sizeAndFit) }}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">{t('no_group_content', 'No information available')}</p>
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
                      groupContent?.shippingReturns ? (
                        <div 
                          className="prose prose-sm text-gray-700"
                          dangerouslySetInnerHTML={{ __html: getContentValue(groupContent.shippingReturns) }}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">{t('no_group_content', 'No information available')}</p>
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
                      groupContent?.howItsMade ? (
                        <div 
                          className="prose prose-sm text-gray-700"
                          dangerouslySetInnerHTML={{ __html: getContentValue(groupContent.howItsMade) }}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">{t('no_group_content', 'No information available')}</p>
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
                {product.descriptions?.b2cMoreInfo && (
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
                        dangerouslySetInnerHTML={{ __html: getContentValue(product.descriptions.b2cMoreInfo) }}
                    />
                  </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <ShopFooter />
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal 
        isOpen={sizeGuideModalOpen}
        onClose={() => setSizeGuideModalOpen(false)}
        sizeGuideContent={groupContent?.sizeGuide ? getContentValue(groupContent.sizeGuide) : ''}
        productName={getContentValue(product?.name)}
      />

      {/* Added to Cart Modal */}
      <AddedToCartModal 
        isVisible={isAddedToCartModalVisible}
        onClose={hideAddedToCartModal}
        addedItem={lastAddedItem}
        cartCount={getTotalItems()}
      />
    </>
  );
};

export default PublicProductPage; 