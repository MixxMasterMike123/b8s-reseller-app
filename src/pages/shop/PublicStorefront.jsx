import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getProductImage } from '../../utils/productImages';
import { getProductUrl, getShopSeoTitle, getShopSeoDescription, generateShopStructuredData } from '../../utils/productUrls';
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
import NordProductCard from '../../components/shop/NordProductCard';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { Helmet } from 'react-helmet-async';

const PublicStorefront = () => {
  const { t, currentLanguage } = useTranslation();
  const store = useStoreSettings();
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
  const [specialEditionProducts, setSpecialEditionProducts] = useState([]);
  const [clothingProducts, setClothingProducts] = useState([]);
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
      
      // Separate products by category
      const specialEditions = productList.filter(product => 
        product.group === 'B8Shield-special-edition'
      );
      const clothingItems = productList.filter(product => 
        product.group === 'Clothing'
      );
      const regularProducts = productList.filter(product => 
        product.group !== 'B8Shield-special-edition' && product.group !== 'Clothing'
      );
      
      // Group regular products dynamically by their group field and load representative products
      const grouped = await groupProductsByGroup(regularProducts);
      setGroupedProducts(grouped);
      
      // Set special categories separately
      setSpecialEditionProducts(specialEditions);
      setClothingProducts(clothingItems);
      
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

  // NORD hero copy: shop config wins, translation layer is the fallback so
  // the current B8Shield copy keeps working until a shop overrides it.
  const heroHeadline = store.heroHeadline ||
    `${t('hero_title_start', 'Fastna')} ${t('hero_title_middle', 'aldrig')} ${t('hero_title_end', 'mer!')}`;
  const heroSubtitle = store.heroSubtitle ||
    t('hero_subtitle', 'B8Shield™ – Vasskydd som förhindrar att dina fiskedrag fastnar i vassen utan att påverka ditt fiske.');

  const bestseller = specialEditionProducts[0] || groupedProducts[0]?.representativeProduct || clothingProducts[0] || null;

  const scrollToProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      <Helmet>
        <title>{getShopSeoTitle(currentLanguage)}</title>
        <meta name="description" content={getShopSeoDescription(currentLanguage)} />
        <meta name="google-site-verification" content="VdZaHTh4JwiHjxpsc_h3u8TMRxLZ1Tg2jU62SN-5fLo" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getShopSeoTitle(currentLanguage)} />
        <meta property="og:description" content={getShopSeoDescription(currentLanguage)} />
        <meta property="og:image" content="https://shop.b8shield.com/images/b8s_top.webp" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getShopSeoTitle(currentLanguage)} />
        <meta name="twitter:description" content={getShopSeoDescription(currentLanguage)} />
        <meta name="twitter:image" content="https://shop.b8shield.com/images/b8s_top.webp" />
        <script type="application/ld+json">{JSON.stringify(generateShopStructuredData(currentLanguage))}</script>
      </Helmet>
      <SeoHreflang />
      <div className="min-h-screen bg-canvas font-body text-ink">
        <ShopNavigation />

        {/* ===== Bento hero (NORD, DESIGN.md §4) ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="grid lg:grid-cols-[1.55fr_1fr] gap-4">
            {/* Hero tile — the one dominant element on the screen */}
            <div className="relative min-h-[440px] lg:min-h-[560px] rounded-tile overflow-hidden bg-ink shadow-tile flex items-end animate-rise">
              <div className="absolute inset-0">
                {store.heroImageUrl ? (
                  <img
                    src={store.heroImageUrl}
                    alt=""
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  /* No-photo fallback: accent color field, looks intentional */
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        'radial-gradient(900px 480px at 85% -10%, color-mix(in srgb, var(--color-accent) 70%, #1A1C1E), transparent 65%), ' +
                        'radial-gradient(700px 500px at -10% 110%, color-mix(in srgb, var(--color-accent) 35%, #1A1C1E), #1A1C1E 70%)',
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-b from-ink/0 via-ink/30 to-ink/75" />
              </div>

              <div className="relative w-full p-7 lg:p-11 text-white">
                {store.tagline && (
                  <div className="inline-flex items-center gap-2.5 bg-white/20 backdrop-blur-md text-[13px] font-semibold px-4 py-2 rounded-full mb-5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {store.tagline}
                  </div>
                )}
                <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight max-w-2xl">
                  {heroHeadline}
                </h1>
                <p className="mt-3 text-base lg:text-lg text-white/85 max-w-xl leading-relaxed">
                  {heroSubtitle}
                </p>
                <div className="mt-7 flex items-center gap-6">
                  <button
                    onClick={scrollToProducts}
                    className="bg-white text-ink font-bold text-base lg:text-lg px-8 py-4 rounded-full transition-all duration-300 ease-nord hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    {t('hero_shop_now_button', 'Handla nu')}
                  </button>
                  <button
                    onClick={scrollToProducts}
                    className="text-white/90 font-semibold text-sm border-b-2 border-white/40 pb-0.5 hover:border-white transition-colors"
                  >
                    {t('hero_see_products', 'Se sortimentet ↓')}
                  </button>
                </div>
              </div>
            </div>

            {/* Supporting tiles */}
            <div className="flex flex-col gap-4">
              {/* Bestseller tile */}
              {bestseller ? (
                <Link
                  to={getProductUrl(bestseller)}
                  className="group block bg-white rounded-tile shadow-tile overflow-hidden transition-all duration-300 ease-nord hover:-translate-y-1 hover:shadow-lift animate-rise"
                  style={{ animationDelay: '0.1s' }}
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#F7F5F2]">
                    <img
                      src={getB2cProductImage(bestseller)}
                      alt={getContentValue(bestseller.name)}
                      className="w-full h-full object-cover transition-transform duration-700 ease-nord group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
                        {t('hero_bestseller_label', 'Mest älskad')}
                      </div>
                      <div className="font-display font-bold text-lg text-ink mt-0.5 truncate">
                        {getContentValue(bestseller.name)}
                      </div>
                    </div>
                    <SmartPrice sekPrice={bestseller.b2cPrice || bestseller.basePrice} showOriginal={false} />
                  </div>
                </Link>
              ) : (
                <div className="bg-white rounded-tile shadow-tile overflow-hidden animate-rise" style={{ animationDelay: '0.1s' }}>
                  <div className="aspect-[16/9] bg-[#F7F5F2] animate-pulse" />
                  <div className="p-5">
                    <div className="h-3 w-24 bg-canvas rounded-full animate-pulse" />
                    <div className="h-5 w-40 bg-canvas rounded-full animate-pulse mt-3" />
                  </div>
                </div>
              )}

              {/* Duo minis: social proof + payment trust */}
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-white rounded-tile shadow-tile p-5 flex flex-col animate-rise" style={{ animationDelay: '0.18s' }}>
                  <div className="text-accent text-base tracking-[2px]" aria-label={`${heroReview?.rating || 5}/5`}>
                    ★★★★★
                  </div>
                  <p className="text-sm text-ink mt-2.5 leading-snug line-clamp-4 flex-1">
                    “{heroReview?.text || t('hero_testimonial_fallback', 'Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!')}”
                  </p>
                  <div className="text-xs text-ink-muted mt-2.5">
                    — {heroReview?.author || t('hero_testimonial_author_fallback', 'Paul W., Sportfiskarna Sverige').split(',')[0]}
                  </div>
                </div>

                <div className="bg-white rounded-tile shadow-tile p-5 flex flex-col animate-rise" style={{ animationDelay: '0.26s' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
                    {t('payments_tile_label', 'Betala tryggt')}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Klarna', 'Kort', 'Apple Pay', 'Google Pay'].map((method) => (
                      <span key={method} className="bg-canvas text-ink-muted text-xs font-semibold px-3 py-1.5 rounded-full">
                        {method}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-ink-muted mt-auto pt-3">
                    🔒 {t('payments_tile_note', 'Säker betalning')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Gallery band (brand imagery; becomes a config block later) ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {/* Desktop: 4-up grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {[
              { src: '/images/b8s_transp_nature.webp', colorKey: 'color_transparent', sku: 'B8S-4-tr' },
              { src: '/images/b8s_red_nature_new.webp', colorKey: 'color_red', sku: 'B8S-4-re' },
              { src: '/images/b8s_flour_nature_new.webp', colorKey: 'color_fluorescent', sku: 'B8S-4-fl' },
              { src: '/images/b8s_glitter_nature.webp', colorKey: 'color_glitter', sku: 'B8S-4-gl' }
            ].map((image, index) => {
              const productObj = {
                name: { 'sv-SE': `B8Shield ${t(image.colorKey)}`, 'en-GB': `B8Shield ${t(image.colorKey)}`, 'en-US': `B8Shield ${t(image.colorKey)}` },
                size: '4',
                sku: image.sku
              };
              const productUrl = getProductUrl(productObj);

              return (
                <Link key={index} to={productUrl} className="relative aspect-square rounded-tile shadow-tile overflow-hidden group block">
                  <img
                    src={image.src}
                    alt={`B8Shield ${t(image.colorKey)} i naturen`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-nord group-hover:scale-105"
                  />
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-ink text-sm font-semibold px-3.5 py-1.5 rounded-full">
                      {t(image.colorKey)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile: horizontal snap scroll */}
          <div className="md:hidden">
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide">
              {[
                { src: '/images/b8s_transp_nature.webp', colorKey: 'color_transparent', sku: 'B8S-4-tr' },
                { src: '/images/b8s_red_nature_new.webp', colorKey: 'color_red', sku: 'B8S-4-re' },
                { src: '/images/b8s_flour_nature_new.webp', colorKey: 'color_fluorescent', sku: 'B8S-4-fl' },
                { src: '/images/b8s_glitter_nature.webp', colorKey: 'color_glitter', sku: 'B8S-4-gl' }
              ].map((image, index) => {
                const productObj = {
                  name: { 'sv-SE': `B8Shield ${t(image.colorKey)}`, 'en-GB': `B8Shield ${t(image.colorKey)}`, 'en-US': `B8Shield ${t(image.colorKey)}` },
                  size: '4',
                  sku: image.sku
                };
                const productUrl = getProductUrl(productObj);

                return (
                  <Link key={index} to={productUrl} className="relative shrink-0 w-4/5 aspect-square rounded-tile shadow-tile overflow-hidden group snap-start block">
                    <img
                      src={image.src}
                      alt={`B8Shield ${t(image.colorKey)} i naturen`}
                      className="w-full h-full object-cover transition-transform duration-700 ease-nord group-hover:scale-105"
                    />
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-white/90 backdrop-blur-sm text-ink text-sm font-semibold px-3.5 py-1.5 rounded-full">
                        {t(image.colorKey)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== Products ===== */}
        <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="mb-10">
            <h2 className="font-display font-bold text-3xl lg:text-4xl tracking-tight text-ink">
              {t('products_section_title', 'Våra Produkter')}
            </h2>
            <p className="text-ink-muted mt-2 max-w-2xl">
              {t('products_section_subtitle', 'Välj mellan olika färger och storlekar för att passa ditt fiske')}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-accent" />
            </div>
          ) : (
            <>
              {/* Special editions */}
              {specialEditionProducts.length > 0 && (
                <div className="mb-14">
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-2xl tracking-tight text-ink">
                      {t('special_editions_title', 'Special Editions')}
                    </h3>
                    <p className="text-ink-muted text-sm mt-1 max-w-2xl">
                      {t('special_editions_description', 'Exklusiva B8Shield-produkter framtagna i samarbete med våra partners')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {specialEditionProducts.map((product, index) => (
                      <NordProductCard
                        key={`special-${product.id}-${index}`}
                        to={getProductUrl(product)}
                        image={getB2cProductImage(product)}
                        tag={t('special_edition_badge', 'SPECIAL EDITION')}
                        name={getContentValue(product.name) || t('product_name_fallback', 'B8Shield Special Edition')}
                        description={getB2cProductDescription(product)}
                        priceSek={product.b2cPrice || product.basePrice}
                        ctaLabel={t('special_edition_cta', 'Se Special Edition')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular product groups */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {groupedProducts.map((productGroup, groupIndex) => {
                  const representativeProduct = productGroup.representativeProduct;
                  if (!representativeProduct) {
                    console.warn(`⚠️ No representative product found for group ${productGroup.groupName}`);
                    return null;
                  }

                  const isMultipack = productGroup.isMultipack;
                  const variantCount = productGroup.allProducts.length;

                  const name = isMultipack
                    ? t('product_name_3pack', 'B8Shield 3-pack')
                    : (() => {
                        // 🚨 CRITICAL: Ensure we never render an object - prevent React Error #31
                        const productName = getContentValue(representativeProduct.name);
                        return typeof productName === 'string' && productName
                          ? productName
                          : t('product_name_fallback', 'B8Shield {{group}}', { group: productGroup.groupName });
                      })();

                  const description = isMultipack
                    ? t('product_description_3pack', 'Vasskydd 3-pack för olika fiskemiljöer')
                    : (() => {
                        const desc = getB2cProductDescription(representativeProduct);
                        return typeof desc === 'string' ? desc : t('product_description_fallback', 'B8Shield vasskydd');
                      })();

                  const meta = isMultipack
                    ? t('product_3pack_info', 'Innehåller alla storlekar (2mm, 4mm, 6mm) • {{count}} färger', { count: variantCount })
                    : variantCount > 1
                      ? t('product_group_variants', '{{count}} färger och storlekar', { count: variantCount })
                      : t('product_single_variant', 'En variant tillgänglig');

                  return (
                    <NordProductCard
                      key={`${productGroup.groupName}-${groupIndex}`}
                      to={getProductUrl(representativeProduct)}
                      image={getB2cProductImage(representativeProduct)}
                      imageAlt={`B8Shield ${isMultipack ? '3-pack' : productGroup.groupName}`}
                      name={name}
                      description={description}
                      meta={meta}
                      priceSek={representativeProduct.b2cPrice || representativeProduct.basePrice}
                      ctaLabel={t('product_choose_button', 'Välj')}
                    />
                  );
                })}
              </div>

              {groupedProducts.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-white rounded-full shadow-tile flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-ink-muted text-lg">{t('no_products_available', 'Inga produkter tillgängliga för tillfället.')}</p>
                </div>
              )}

              {/* Clothing */}
              {clothingProducts.length > 0 && (
                <div className="mt-14">
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-2xl tracking-tight text-ink">
                      {t('clothing_section_title', 'Kläder & Accessoarer')}
                    </h3>
                    <p className="text-ink-muted text-sm mt-1 max-w-2xl">
                      {t('clothing_section_description', 'Stilfulla kläder och accessoarer för den passionerade fiskaren')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {clothingProducts.map((product, index) => (
                      <NordProductCard
                        key={`clothing-${product.id}-${index}`}
                        to={getProductUrl(product)}
                        image={getB2cProductImage(product)}
                        tag={t('clothing_badge', 'KLÄDER')}
                        name={getContentValue(product.name) || t('product_name_fallback', 'B8Shield Kläder')}
                        description={getB2cProductDescription(product)}
                        priceSek={product.b2cPrice || product.basePrice}
                        ctaLabel={t('clothing_cta', 'Se Produkt')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ===== Story band (DESIGN.md §4 — storytelling) ===== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-20">
          <div className="bg-white rounded-tile shadow-tile overflow-hidden">
            <div className="h-1.5 bg-accent" />
            <div className="p-8 lg:p-12">
              <h2 className="font-display font-bold text-2xl lg:text-3xl tracking-tight text-ink mb-8 lg:mb-10">
                {t('features_section_title', 'Varför välja B8Shield™?')}
              </h2>
              <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
                {[
                  { n: '01', titleKey: 'feature_proven_effective_title', titleDefault: 'Bevisat Effektivt', textKey: 'feature_proven_effective_description', textDefault: 'Minska förlusten av beten med upp till 90% enligt våra tester' },
                  { n: '02', titleKey: 'feature_easy_to_use_title', titleDefault: 'Enkelt att Använda', textKey: 'feature_easy_to_use_description', textDefault: 'Fäst enkelt på ditt fiskedrag på några sekunder' },
                  { n: '03', titleKey: 'feature_eco_friendly_title', titleDefault: 'Miljövänligt', textKey: 'feature_eco_friendly_description', textDefault: 'Återvinningsbart material som skyddar våra vattenmiljöer' },
                ].map((step) => (
                  <div key={step.n}>
                    <div className="font-display font-bold text-sm text-accent">{step.n}</div>
                    <h3 className="font-display font-bold text-xl text-ink mt-2 tracking-tight">
                      {t(step.titleKey, step.titleDefault)}
                    </h3>
                    <p className="text-ink-muted text-[15px] leading-relaxed mt-1.5">
                      {t(step.textKey, step.textDefault)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Reviews ===== */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl tracking-tight text-ink mb-3">
              {t('reviews_section_title', 'Vad våra kunder säger')}
            </h2>
            <p className="text-lg text-ink-muted">
              {t('reviews_section_subtitle', 'Äkta recensioner från nöjda sportfiskare')}
            </p>
          </div>

          <ReviewsSection
            businessId="" // Will be set when Trustpilot profile is ready
            domain="" // Set per-shop when a live Trustpilot profile is configured (was shop.b8shield.com)
            showTrustpilot={false} // Start with manual reviews, enable when Trustpilot is set up
            showManualReviews={true}
            className="w-full"
          />
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
