// B2BCatalog — the wholesale product catalog for an active B2B customer. Lists
// the CURRENT shop's products (where shopId == current) that are active and B2B-
// available (availability.b2b !== false), showing the wholesale price (b2bPrice,
// ex moms) — NOT the consumer price. Read-only browse for now; ordering lands in
// Phase 4. No hardcoded product grid (the old portal's 4×5 colour/size grid is
// gone) — it renders whatever products the shop actually has.
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { useTranslation } from '../../contexts/TranslationContext';

// Product name may be a plain string or a legacy per-locale object.
const productName = (n) => {
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') return n['sv-SE'] || Object.values(n).find((v) => typeof v === 'string') || '';
  return '';
};
const sek = (n) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2 }).format(n || 0);

export default function B2BCatalog() {
  const shopId = useShopId();
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Scope to the shop; filter availability + active client-side so a
        // product missing the b2b key (default-ON) is still included.
        const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
        const list = [];
        snap.forEach((d) => {
          const p = { id: d.id, ...d.data() };
          const active = p.isActive !== false;
          const b2bAvailable = p.availability?.b2b !== false;
          if (active && b2bAvailable) list.push(p);
        });
        list.sort((a, b) => productName(a.name).localeCompare(productName(b.name)));
        if (!cancelled) setProducts(list);
      } catch (err) {
        console.warn('B2BCatalog: load failed:', err?.message);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('b2b_nav_catalog', 'Grossistkatalog')}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {t('b2b_catalog_intro', 'Alla priser är grossistpriser, exklusive moms.')}
      </p>

      {products.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {t('b2b_catalog_empty', 'Inga produkter är tillgängliga för grossist just nu.')}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.imageUrl || p.b2cImageUrl;
            const hasWholesale = typeof p.b2bPrice === 'number' && p.b2bPrice > 0;
            return (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="aspect-square bg-gray-50">
                  {img ? (
                    <img src={img} alt={productName(p.name)} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-300">
                      {t('b2b_catalog_no_image', 'Ingen bild')}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="font-medium text-gray-900">{productName(p.name) || t('b2b_catalog_unnamed', 'Namnlös')}</div>
                  {p.sku && <div className="mt-0.5 text-xs text-gray-400">{p.sku}</div>}
                  <div className="mt-auto pt-3">
                    {hasWholesale ? (
                      <>
                        <div className="text-lg font-semibold tabular-nums text-gray-900">{sek(p.b2bPrice)}</div>
                        <div className="text-xs text-gray-500">{t('b2b_catalog_ex_vat', 'exkl. moms')}</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">{t('b2b_catalog_no_price', 'Pris på förfrågan')}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
