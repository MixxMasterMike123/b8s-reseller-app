// CollectionPage — a reusable storefront browse listing for a TAG (category) or
// a product GROUP. Routes: /{shopId}/kategori/:tag and /{shopId}/grupp/:group.
// Tags act as categories; groups are size/colour variants of one item.
//
// Same layout/query as the front page; only the filter differs:
//   - tag mode:   products whose `tags` (slugified) includes the route slug.
//                 Same-group products collapse to one representative card (like
//                 the front page) so a tagged T-shirt shows once.
//   - group mode: products whose `group` (slugified) matches the route slug —
//                 shown individually (the page IS the group's members).
// The route param is a SLUG; we match by slugify(productValue) === slug and
// derive the human title from the first matching product's real tag/group.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { useShopId } from '../../contexts/ShopContext';
import { getProductUrl, slugify } from '../../utils/productUrls';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import NordProductCard from '../../components/shop/NordProductCard';
import { getProductImage } from '../../utils/productImages';
import { Helmet } from 'react-helmet-async';

const CollectionPage = ({ mode }) => {
  const { tag: tagSlug, group: groupSlug } = useParams();
  const slug = mode === 'group' ? groupSlug : tagSlug;
  const { t, currentLanguage } = useTranslation();
  const store = useStoreSettings();
  const shopId = useShopId();
  const { getContentValue } = useContentTranslation();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'products'),
          where('shopId', '==', shopId),
          where('isActive', '==', true),
          where('availability.b2c', '==', true)
        ));
        if (cancelled) return;
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading collection:', err);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId, mode, slug, currentLanguage]);

  const productTags = (p) => (Array.isArray(p.tags) ? p.tags : []);
  const nameOf = (p) => {
    const n = getContentValue(p.name);
    return typeof n === 'string' && n ? n : (p.group || 'Produkt');
  };
  const imageOf = (p) => p.b2cImageUrl || p.imageUrl || getProductImage(p) || '';

  // Filter to the requested collection.
  const matched = products.filter((p) =>
    mode === 'group'
      ? slugify((p.group || '').trim()) === slug
      : productTags(p).some((tg) => slugify(tg) === slug)
  );

  // Human title from the first match's real value (falls back to the slug).
  const title = (() => {
    if (!matched.length) return slug;
    if (mode === 'group') return (matched[0].group || slug);
    const first = matched[0];
    return productTags(first).find((tg) => slugify(tg) === slug) || slug;
  })();

  // A collection page (category OR group) lists EVERY matching product — the
  // user has already drilled into the category/group, so show all of it. (Group-
  // collapse happens only on the front page, not here.)
  const cards = matched;

  return (
    <>
      <Helmet>
        <title>{title} | {store.shopName || 'Butik'}</title>
      </Helmet>
      <div className="min-h-screen bg-canvas">
        <ShopNavigation breadcrumb={title} />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="mb-8">
            <p className="text-sm text-ink-muted">
              {mode === 'group' ? t('collection_group', 'Produktgrupp') : t('collection_category', 'Kategori')}
            </p>
            <h1 className="font-display font-bold text-3xl lg:text-4xl tracking-tight text-ink mt-1">{title}</h1>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-accent" />
            </div>
          ) : cards.length === 0 ? (
            <p className="text-ink-muted py-16 text-center">{t('collection_empty', 'Inga produkter i den här samlingen.')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {cards.map((p) => (
                <NordProductCard
                  key={p.id}
                  to={getProductUrl(p)}
                  // On a GROUP page the point is to pick a specific member, so
                  // suppress the product page's redirect-to-default-variant.
                  linkState={mode === 'group' ? { skipPreferredRedirect: true } : undefined}
                  image={imageOf(p)}
                  imageAlt={nameOf(p)}
                  name={nameOf(p)}
                  description=""
                  priceSek={p.b2cPrice || p.basePrice}
                  ctaLabel={t('product_choose_button', 'Välj')}
                />
              ))}
            </div>
          )}
        </section>

        <ShopFooter />
      </div>
    </>
  );
};

export default CollectionPage;
