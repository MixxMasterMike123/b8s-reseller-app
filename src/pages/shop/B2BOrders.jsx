// B2BOrders — an active B2B customer's order history.
//
// ⚠️ INTENTIONAL PLACEHOLDER (Phase 3, browse-only). The real order-history
// query (orders where shopId==current && userId==uid) is deliberately NOT run
// yet, for two reasons that both land in Phase 4 (ordering + Faktura):
//   1. No B2B orders exist until Phase 4 creates them.
//   2. The current `orders` list rule authorizes via isActiveUser(), which
//      requires a users/{uid} doc — but a B2B customer lives in b2bCustomers,
//      NOT users. So the query would be DENIED. Firing it now would silently
//      catch the permission error and render a misleading "no orders" — the
//      exact false-positive we refuse to ship.
// Phase 4 must: (a) extend the orders list rule to authorize an active
// b2bCustomers profile for its own rows (it can't key off users/{uid}.active),
// and (b) write orders.userId = firebaseAuthUid so the query returns rows.
// Until then this is an explicit "coming soon", not a broken table.
import React from 'react';
import { useTranslation } from '../../contexts/TranslationContext';

export default function B2BOrders() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('b2b_nav_orders', 'Mina ordrar')}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        {t('b2b_orders_coming_soon', 'Orderhistorik visas här när beställning via portalen är aktiverad.')}
      </div>
    </div>
  );
}
