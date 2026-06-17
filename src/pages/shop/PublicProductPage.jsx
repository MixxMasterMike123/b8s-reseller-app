import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import {
  getSkuFromSlug,
  getProductSeoTitle,
  getProductSeoDescription,
  getCountryAwareUrl
} from '../../utils/productUrls';
// Toast notifications removed - using AddedToCartModal for user feedback
import { generateProductSchema } from '../../utils/productFeed';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useShopId } from '../../contexts/ShopContext';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import ReviewsSection from '../../components/ReviewsSection';
import { getReviewStats } from '../../utils/trustpilotAPI';
import SeoHreflang from '../../components/shop/SeoHreflang';
import { Helmet } from 'react-helmet-async';
import SmartPrice from '../../components/shop/SmartPrice';
import AddedToCartModal from '../../components/shop/AddedToCartModal';
import ProductSocialShare from '../../components/ProductSocialShare';
import DOMPurify from 'dompurify';

// Sanitize Firestore-authored HTML before rendering to prevent stored XSS
const sanitize = (html) => DOMPurify.sanitize(html || '');

// Helper function to determine button state based on launch date
const getButtonState = (product, t) => {
  // No launch date = normal product
  if (!product.launchDate) {
    return { 
      text: t('add_to_shopping_bag', 'Lägg i shoppingbagen'),
      disabled: false,
      isComingSoon: false
    };
  }
  
  // Has launch date - check if it's future or past
  const now = new Date();
  const launchDate = new Date(product.launchDate.toDate ? product.launchDate.toDate() : product.launchDate);
  
  if (launchDate > now) {
    // Still coming soon
    return {
      text: t('coming_soon_button', 'Kommer snart'),
      disabled: true,
      isComingSoon: true
    };
  } else {
    // Launch date has passed - now available
    return {
      text: t('add_to_shopping_bag', 'Lägg i shoppingbagen'),
      disabled: false,
      isComingSoon: false
    };
  }
};

const PublicProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shopId = useShopId();
  const { getContentValue } = useContentTranslation();
  const store = useStoreSettings();
  
  const [product, setProduct] = useState(null);
  // Product model v2: variants are EMBEDDED on the product ({sku,label,price,image}).
  // Selecting a variant is in-page state — no navigation between docs, no
  // same-group query. `selectedVariant` is null for a product with no variants.
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewCount, setReviewCount] = useState(16);
  
  // Nike mobile UX: Fixed button visibility state
  const [showFixedButton, setShowFixedButton] = useState(true);
  const regularButtonRef = useRef(null);
  
  const { 
    addToCart,
    isAddedToCartModalVisible, 
    hideAddedToCartModal, 
    lastAddedItem,
    getTotalItems
  } = useCart();

  // Helper function - declared early to avoid temporal dead zone
  const getProductImages = (p) => {
    if (!p) return [];
    const images = [];
    if (p.b2cImageUrl) images.push(p.b2cImageUrl);
    if (p.b2cImageGallery?.length) images.push(...p.b2cImageGallery);
    if (images.length === 0) images.push(getProductImage(p));
    return images;
  };

  // Calculate productImages early to avoid temporal dead zone issues
  const productImages = getProductImages(product);
  
  // Calculate button state based on launch date
  const buttonState = product ? getButtonState(product, t) : { text: '', disabled: true, isComingSoon: false };

  useEffect(() => {
    if (slug) {
      loadProductAndVariants();
    }
  }, [slug, shopId]);

  // Nike mobile UX: Scroll detection for fixed button
  useEffect(() => {
    const handleScroll = () => {
      if (regularButtonRef.current) {
        const rect = regularButtonRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        setShowFixedButton(!isVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Nike mobile UX: Track image scroll position
  useEffect(() => {
    const handleImageScroll = () => {
      const container = document.querySelector('.overflow-x-auto');
      if (container) {
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.offsetWidth;
        const newIndex = Math.round(scrollLeft / containerWidth);
        setActiveImageIndex(Math.max(0, Math.min(newIndex, productImages.length - 1)));
      }
    };

    const container = document.querySelector('.overflow-x-auto');
    if (container) {
      container.addEventListener('scroll', handleImageScroll);
      return () => container.removeEventListener('scroll', handleImageScroll);
    }
  }, [productImages.length, product]);

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
      const productQuery = query(productsRef, where('shopId', '==', shopId), where('sku', '==', sku), where('isActive', '==', true), where('availability.b2c', '==', true));
      const querySnapshot = await getDocs(productQuery);

      if (querySnapshot.empty) {
        console.error('Product not found: no matching documents', sku);
        navigate(getCountryAwareUrl(''));
        return;
      }

      const mainProduct = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      setProduct(mainProduct);

      // Variants are embedded on the product. Default-select the first.
      const embedded = (mainProduct.hasVariants && Array.isArray(mainProduct.variants))
        ? mainProduct.variants.filter((v) => v && (v.sku || '').trim())
        : [];
      setVariants(embedded);
      setSelectedVariant(embedded.length > 0 ? embedded[0] : null);

    } catch (error) {
      console.error('Error loading product:', error);
      // Navigation error - handled by redirecting to home
    } finally {
      setLoading(false);
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
    // Pass the chosen variant (or null). CartContext stamps the variant's sku/
    // label/price onto the line item; the server reprices from the parent doc.
    addToCart(product, quantity, selectedVariant);
    // Success feedback now handled by AddedToCartModal
  };

  // SEO and rendering helpers
  const getB2cDescription = (p) => getContentValue(p?.descriptions?.b2c) || '';

  // The price to display/charge: the selected variant's, else the product's.
  const currentPrice = selectedVariant?.price ?? (product?.b2cPrice || product?.basePrice);

  // Delivery & Pickup v2: what delivery the customer can actually use for THIS
  // product, cross-checked against the shop's configuration.
  //  • product.delivery flags (default-ON: a product without the field is both).
  //  • shopOffersPickup: the shop must actually have pickup locations, else a
  //    "pickup available" hint would be a lie (admin↔shop cross-check).
  // The same product flags drive the checkout method restriction (Slice 4) and
  // the server enforcement, so this hint matches the real options at checkout.
  const productAllowsShipping = product?.delivery?.shipping !== false;
  const productAllowsPickup = product?.delivery?.pickup !== false;
  const shopOffersPickup = Array.isArray(store?.pickupLocations) && store.pickupLocations.length > 0;
  const canShip = productAllowsShipping;
  const canPickup = productAllowsPickup && shopOffersPickup;

  // A single truthful delivery line, reused by both layouts. Renders nothing
  // when neither mode is available (defensive — Slice 4 blocks such carts).
  const DeliveryInfo = () => {
    if (canShip && canPickup) {
      return (
        <p className="text-sm text-ink-muted">
          {t('product_delivery_both', 'Hemleverans eller upphämtning (Click & Collect) i kassan.')}
        </p>
      );
    }
    if (canPickup && !canShip) {
      return (
        <p className="text-sm text-ink-muted">
          {t('product_delivery_pickup_only', 'Endast upphämtning (Click & Collect) i kassan.')}
        </p>
      );
    }
    if (canShip && !canPickup) {
      return (
        <p className="text-sm text-ink-muted">
          {t('product_delivery_shipping_only', 'Endast hemleverans.')}
        </p>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas font-body flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-b-2 border-accent opacity-20"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-canvas font-body flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink mb-4">{t('product_not_found_page_title', 'Produkten hittades inte')}</h1>
          <Link to={getCountryAwareUrl('')} className="bg-accent text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
            {t('back_to_shop', 'Tillbaka till butiken')}
          </Link>
        </div>
      </div>
    );
  }

  // Show the variant picker only when the product actually has variants. A
  // simple product (no variants) shows no picker — model-level fix for the old
  // "8× Standard" bug.
  const showVariantPicker = variants.length > 0;

  return (
    <>
      <Helmet>
        <title>{getProductSeoTitle(product)}</title>
        <meta name="description" content={getProductSeoDescription(product)} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={getProductSeoTitle(product)} />
        <meta property="og:description" content={getProductSeoDescription(product)} />
        {productImages[0] && <meta property="og:image" content={productImages[0]} />}
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getProductSeoTitle(product)} />
        <meta name="twitter:description" content={getProductSeoDescription(product)} />
        {productImages[0] && <meta name="twitter:image" content={productImages[0]} />}
        <script type="application/ld+json">{JSON.stringify(generateProductSchema(product))}</script>
      </Helmet>
      <SeoHreflang />
      
      <div className="min-h-screen bg-canvas font-body text-ink">
        <ShopNavigation breadcrumb={getContentValue(product?.name)} breadcrumbCategory={product?.category || null} />
        
        {/* Nike Mobile Layout: Product info ABOVE images */}
        <div className="lg:hidden">
          <div className="px-4 py-6">
            {/* Nike Mobile: Product info first */}
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink mb-2">
                {getContentValue(product.name)}
              </h1>
              {/* Short description — only when set; no name fallback (would dupe the title). */}
              {getB2cDescription(product) && (
                <p className="text-base text-ink-muted mb-4">
                  {getB2cDescription(product)}
                </p>
              )}
              {/* More information (admin "Mer information") — above the price. */}
              {product?.descriptions?.b2cMoreInfo && (
                <div
                  className="prose prose-sm max-w-none text-ink-muted mb-4"
                  dangerouslySetInnerHTML={{ __html: sanitize(getContentValue(product.descriptions.b2cMoreInfo)) }}
                />
              )}
              <div className="font-display">
                <SmartPrice
                  sekPrice={currentPrice}
                  size="large"
                  showOriginal={false}
                />
              </div>
            </div>
          </div>

          {/* Nike Mobile: Touch scrollable images */}
          <div className="w-full">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {productImages.map((image, index) => (
                <div key={index} className="w-full shrink-0 snap-center">
                  <div className="aspect-square bg-white">
                    <img
                      src={image}
                      alt={`${getContentValue(product.name)} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Nike Mobile: Image indicators */}
            {productImages.length > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {productImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const container = document.querySelector('.overflow-x-auto');
                      container.scrollTo({ left: index * container.offsetWidth, behavior: 'smooth' });
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === activeImageIndex ? 'bg-ink' : 'bg-ink/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Nike Mobile: Product details below images */}
          <div className="px-4 py-6 space-y-4">
            {/* Variant Selection — only when the product has variants */}
            {showVariantPicker && (
            <div>
              <h3 className="text-base font-semibold text-ink mb-2">
                {t('select_variant', 'Välj')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.sku}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`py-2 px-3 text-center border rounded-el transition-all ${
                      selectedVariant?.sku === variant.sku
                        ? 'border-ink bg-ink text-white'
                        : 'border-ink/15 bg-white hover:border-ink/40'
                    }`}
                  >
                    <div className="text-sm font-medium">{variant.label || variant.sku}</div>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Nike Mobile: Quantity Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-ink">
                  {t('quantity_label', 'Antal')}
                </label>
                <div className="flex items-center border border-ink/15 bg-white rounded-full">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-ink-muted hover:text-ink transition-colors"
                    disabled={quantity <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="px-4 py-2 text-sm font-bold text-ink min-w-12 text-center tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-ink-muted hover:text-ink transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Nike Mobile: Regular Add to Cart button (tracked for visibility) */}
            <div className="space-y-3" ref={regularButtonRef}>
              <button
                onClick={buttonState.disabled ? undefined : handleAddToCart}
                disabled={buttonState.disabled}
                className={`w-full py-3 px-6 rounded-full text-base font-bold transition-colors ${
                  buttonState.isComingSoon 
                    ? 'bg-ink-faint text-white cursor-not-allowed' 
                    : 'bg-accent text-white hover:opacity-90'
                }`}
              >
                {buttonState.text}
              </button>
              
              <button className="w-full border border-ink/15 bg-white py-3 px-6 rounded-full text-base font-medium hover:border-ink/40 transition-colors">
                {t('favorite_button', 'Favorit ♡')}
              </button>
            </div>

            {/* Additional product info — Klarna + product-aware delivery line */}
            <div className="border-t pt-6 space-y-2">
              <p className="text-sm text-ink-muted">
                <span className="font-medium">Klarna.</span> {t('klarna_available_at_checkout', 'är tillgängligt i kassan.')}
              </p>
              <DeliveryInfo />
            </div>
          </div>
        </div>

        {/* Desktop Layout: Keep original design */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-16">
              {/* Desktop Product Images */}
              <div className="lg:w-1/2">
                <div className="flex gap-4 sticky top-24">
                  {/* Thumbnail Images - Left Side */}
                  {productImages.length > 1 && (
                    <div className="flex flex-col gap-2 w-20">
                      {productImages.map((image, index) => (
                        <button
                          key={index}
                          onMouseEnter={() => setActiveImageIndex(index)}
                          className={`aspect-square bg-white rounded-el overflow-hidden border-2 transition-all ${
                            activeImageIndex === index 
                              ? 'border-ink' 
                              : 'border-transparent hover:border-ink/30'
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
                    <div className="aspect-square bg-white rounded-tile shadow-tile overflow-hidden">
                      <img
                        src={productImages[activeImageIndex]}
                        alt={getContentValue(product.name)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Product Details */}
              <div className="lg:w-1/2 space-y-8">
                {/* Product Title */}
                <div>
                  <h1 className="font-display text-4xl font-bold tracking-tight text-ink mb-2">
                    {getContentValue(product.name)}
                  </h1>
                  {/* Short description — only when set; no name fallback (would dupe the title). */}
                  {getB2cDescription(product) && (
                    <p className="text-lg text-ink-muted mb-4">
                      {getB2cDescription(product)}
                    </p>
                  )}

                {/* More information (admin "Mer information" / b2cMoreInfo) —
                    shown above the price per the storefront content order. */}
                  {product?.descriptions?.b2cMoreInfo && (
                    <div
                      className="prose prose-sm max-w-none text-ink-muted mb-6"
                      dangerouslySetInnerHTML={{ __html: sanitize(getContentValue(product.descriptions.b2cMoreInfo)) }}
                    />
                  )}

                {/* Price */}
                  <div className="font-display mb-6">
                    <SmartPrice
                      sekPrice={currentPrice}
                      size="large"
                      showOriginal={false}
                      className="font-display"
                    />
                  </div>
                </div>

                {/* Variant Selection — only when the product has variants */}
                {showVariantPicker && (
                <div>
                  <h3 className="text-base font-semibold text-ink mb-4">
                    {t('select_variant', 'Välj')}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.sku}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`py-4 px-4 text-center border rounded-el transition-all ${
                          selectedVariant?.sku === variant.sku
                            ? 'border-ink bg-ink text-white'
                            : 'border-ink/15 bg-white hover:border-ink/40'
                        }`}
                      >
                        <div className="text-sm font-medium">{variant.label || variant.sku}</div>
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* Quantity Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-ink">
                      {t('quantity_label', 'Antal')}
                    </label>
                    <div className="flex items-center border border-ink/15 bg-white rounded-full">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 text-ink-muted hover:text-ink transition-colors"
                        disabled={quantity <= 1}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="px-4 py-2 text-sm font-bold text-ink min-w-12 text-center tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-2 text-ink-muted hover:text-ink transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add to Cart */}
                <div className="space-y-4">
                  <button
                    onClick={buttonState.disabled ? undefined : handleAddToCart}
                    disabled={buttonState.disabled}
                    className={`w-full py-4 px-8 rounded-full text-base font-bold transition-colors ${
                      buttonState.isComingSoon 
                        ? 'bg-ink-faint text-white cursor-not-allowed' 
                        : 'bg-accent text-white hover:opacity-90'
                    }`}
                  >
                    {buttonState.text}
                  </button>
                  
                  <button className="w-full border border-ink/15 bg-white py-4 px-8 rounded-full text-base font-medium hover:border-ink/40 transition-colors">
                    {t('favorite_button', 'Favorit ♡')}
                  </button>
                </div>

                {/* Social Share - Streamlined with working platforms only */}
                <ProductSocialShare 
                  product={product}
                  compact={true}
                />

                {/* Payment + delivery options. The delivery line is product-aware
                    (per-product delivery modes + whether the shop offers pickup),
                    replacing the old unconditional "Click & Collect" claim. */}
                <div className="border-t pt-6 space-y-2">
                  <p className="text-sm text-ink-muted">
                    <span className="font-medium">Klarna.</span> {t('klarna_available_at_checkout', 'är tillgängligt i kassan.')}
                  </p>
                  <DeliveryInfo />
                </div>

                {/* Product Description */}
                <div className="border-t pt-6">
                  <h2 className="font-display text-lg font-bold text-ink mb-4">
                    {t('show_product_information', 'Visa produktinformation')}
                  </h2>
                  <div className="prose prose-sm max-w-none text-ink-muted">
                    <p>{getB2cDescription(product) || getContentValue(product.name)}</p>
                    <ul className="mt-4 space-y-2">
                      {selectedVariant?.label && <li>• {t('product_variant_spec', 'Variant: {{label}}', { label: selectedVariant.label })}</li>}
                      <li>• {t('product_style_spec', 'Art.nr: {{sku}}', { sku: selectedVariant?.sku || product.sku || '' })}</li>
                    </ul>
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="border-t pt-6">
                  <ReviewsSection 
                    productId={product.id}
                    productName={getContentValue(product.name)}
                    reviewCount={reviewCount}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nike Mobile: Fixed bottom "Add to cart" button */}
        <div className={`
          lg:hidden fixed bottom-0 left-0 right-0 z-40
          transition-all duration-300 ease-out
          ${showFixedButton ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}>
          <div className="bg-white/95 backdrop-blur-md border-t border-ink/10 px-4 py-4 safe-area-inset-bottom">
            <button
              onClick={buttonState.disabled ? undefined : handleAddToCart}
              disabled={buttonState.disabled}
              className={`w-full py-4 px-8 rounded-full text-base font-bold transition-colors ${
                buttonState.isComingSoon 
                  ? 'bg-ink-faint text-white cursor-not-allowed' 
                  : 'bg-accent text-white hover:opacity-90'
              }`}
            >
              {buttonState.text}
            </button>
          </div>
        </div>

        {/* Added to Cart Modal */}
        <AddedToCartModal 
          isVisible={isAddedToCartModalVisible}
          onClose={hideAddedToCartModal}
          addedItem={lastAddedItem}
          cartCount={getTotalItems()}
        />
      </div>
      
      <ShopFooter />
    </>
  );
};

export default PublicProductPage; 