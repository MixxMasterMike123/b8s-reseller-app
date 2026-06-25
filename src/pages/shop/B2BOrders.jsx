// B2BOrders — an active B2B customer's own order history for the current shop.
// Queries orders where source=='b2b' && b2bCustomerId == this customer's profile
// id — the exact linkage the firestore.rules orders-list B2B branch authorizes
// (it get()s the b2bCustomers doc and checks firebaseAuthUid). Uses the
// orders [source, b2bCustomerId, createdAt] composite index.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const sek = (n) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2 }).format(n || 0);

const orderDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return new Date(v);
};

// B2B Faktura lifecycle: pending → invoiced → paid → shipped → completed.
const STATUS_LABEL = {
  pending: 'Väntar',
  invoiced: 'Fakturerad',
  paid: 'Betald',
  shipped: 'Skickad',
  completed: 'Slutförd',
  cancelled: 'Avbruten',
};

export default function B2BOrders() {
  const { profile } = useB2BCustomer();
  const { t } = useTranslation();
  const shopId = useShopId();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'orders'),
          where('source', '==', 'b2b'),
          where('b2bCustomerId', '==', profile.id),
          orderBy('createdAt', 'desc')
        ));
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        if (!cancelled) setOrders(list);
      } catch (err) {
        console.warn('B2BOrders: load failed:', err?.message);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('b2b_nav_orders', 'Mina ordrar')}</h1>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {t('b2b_orders_empty', 'Du har inga ordrar än.')}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('b2b_orders_number', 'Order')}</th>
                <th className="px-4 py-3">{t('b2b_orders_date', 'Datum')}</th>
                <th className="px-4 py-3">{t('b2b_orders_status', 'Status')}</th>
                <th className="px-4 py-3 text-right">{t('b2b_orders_total', 'Summa')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const d = orderDate(o.createdAt);
                return (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/${shopId}/b2b/orders/${o.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-blue-700 hover:underline">{o.orderNumber || o.id}</td>
                    <td className="px-4 py-3 text-gray-600">{d ? format(d, 'dd MMM yyyy', { locale: sv }) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{STATUS_LABEL[o.status] || o.status || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{sek(o.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
