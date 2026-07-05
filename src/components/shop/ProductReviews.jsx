import React, { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../../contexts/TranslationContext';

/**
 * ProductReviews — the native product-review block on the storefront product page
 * (NORD design system). Shows the aggregate (average + star + count), the Omnibus
 * verified-purchase disclosure, and the list of approved reviews with pagination.
 *
 * Reads only approved reviews (rules enforce read: status == 'approved'). The
 * aggregate numbers come from the product prop (reviewCount / ratingSum — the
 * server maintains them), so no extra aggregate query is needed.
 */
const PAGE_SIZE = 10;

// A row of five stars for a given rating (1–5). Filled = accent, empty = faint.
const Stars = ({ rating, size = 'text-base' }) => {
  const r = Math.round(Number(rating) || 0);
  return (
    <span className={`inline-flex ${size} leading-none`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= r ? 'text-accent' : 'text-ink/20'}>
          ★
        </span>
      ))}
    </span>
  );
};

const fmtDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '';
  return d.toLocaleDateString('sv-SE');
};

const ProductReviews = ({ shopId, productId, product }) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reviewCount = Number(product?.reviewCount) || 0;
  const ratingSum = Number(product?.ratingSum) || 0;
  const avg = reviewCount > 0 ? (ratingSum / reviewCount).toFixed(1) : null;

  const fetchPage = useCallback(
    async (after) => {
      const constraints = [
        where('shopId', '==', shopId),
        where('productId', '==', productId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      ];
      if (after) constraints.push(startAfter(after));
      const q = query(collection(db, 'productReviews'), ...constraints);
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const last = snap.docs[snap.docs.length - 1] || null;
      return { rows, last, more: snap.docs.length === PAGE_SIZE };
    },
    [shopId, productId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { rows, last, more } = await fetchPage(null);
        if (cancelled) return;
        setReviews(rows);
        setLastDoc(last);
        setHasMore(more);
      } catch (err) {
        console.error('ProductReviews: failed to load reviews', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { rows, last, more } = await fetchPage(lastDoc);
      setReviews((prev) => [...prev, ...rows]);
      setLastDoc(last);
      setHasMore(more);
    } catch (err) {
      console.error('ProductReviews: failed to load more', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="bg-canvas">
      <h2 className="font-display text-2xl font-bold text-ink tracking-tight mb-4">
        {t('product_reviews_title', 'Omdömen')}
      </h2>

      {/* Aggregate header */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-3xl font-bold text-ink leading-none tabular-nums">
            {avg}
          </span>
          <div className="flex flex-col">
            <Stars rating={avg} size="text-lg" />
            <span className="text-sm text-ink-muted mt-0.5">
              {t('product_reviews_count', '{{count}} omdömen', { count: reviewCount })}
            </span>
          </div>
        </div>
      )}

      {/* Omnibus / verified-purchase disclosure */}
      <p className="text-xs text-ink-faint leading-relaxed mb-6 max-w-2xl">
        {t(
          'product_reviews_disclosure',
          'Alla omdömen kommer från verifierade köp — kunder får en personlig länk via e-post efter genomfört köp. Vi publicerar både positiva och negativa omdömen.'
        )}
      </p>

      {loading ? (
        <div className="py-8 text-center">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-accent" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-muted py-4">
          {t('product_reviews_empty', 'Inga omdömen ännu. Bli den första att lämna ett omdöme efter ditt köp.')}
        </p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((rev) => (
            <li key={rev.id} className="border-b border-ink/5 pb-5 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <Stars rating={rev.rating} />
                <span className="text-xs text-ink-faint">{fmtDate(rev.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-ink mt-1.5">
                {rev.displayName || t('product_reviews_anonymous', 'Anonym')}
              </p>
              {rev.text && (
                <p className="text-sm text-ink-muted leading-relaxed mt-1 whitespace-pre-line">
                  {rev.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <div className="mt-6">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm font-bold text-ink border border-ink/15 rounded-full px-5 py-2.5 hover:bg-ink/5 transition-colors disabled:opacity-60"
          >
            {loadingMore
              ? t('product_reviews_loading_more', 'Laddar…')
              : t('product_reviews_show_more', 'Visa fler')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
