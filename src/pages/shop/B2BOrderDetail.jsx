// B2BOrderDetail — a B2B customer's single-order view (/:shopId/b2b/orders/:id).
// Shows line items, totals, ship-to address, and status, plus a Cancel action
// while the order is still 'pending' (Faktura ships before payment, so a clean
// pre-invoice cancel matters). Single-doc order reads are open-by-capability in
// rules; we additionally verify OWNERSHIP client-side (the order's b2bCustomerId
// must match the logged-in customer's profile id) so a guessed/other order ID
// shows "not found". Cancellation goes through the cancelB2BOrder callable
// (server enforces owner + pending).
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { useB2BCustomer } from '../../contexts/B2BCustomerContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import toast from 'react-hot-toast';

const sek = (n) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2 }).format(n || 0);

const orderDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return new Date(v);
};

const STATUS_LABEL = {
  pending: 'Väntar', invoiced: 'Fakturerad', paid: 'Betald',
  shipped: 'Skickad', ready_for_pickup: 'Redo att hämtas',
  completed: 'Slutförd', cancelled: 'Avbruten',
};

export default function B2BOrderDetail() {
  const { orderId } = useParams();
  const shopId = useShopId();
  const navigate = useNavigate();
  const { profile } = useB2BCustomer();
  const { t } = useTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!profile?.id || !orderId) { setLoading(false); return; }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'orders', orderId));
      // Ownership guard: must be a b2b order of THIS shop owned by THIS customer.
      if (
        !snap.exists() ||
        snap.data().source !== 'b2b' ||
        snap.data().shopId !== shopId ||
        snap.data().b2bCustomerId !== profile.id
      ) {
        setNotFound(true);
        setOrder(null);
      } else {
        setOrder({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.warn('B2BOrderDetail: load failed:', err?.message);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile, orderId, shopId]);

  const onCancel = async () => {
    if (!order || order.status !== 'pending') return;
    if (!window.confirm(t('b2b_cancel_confirm', 'Vill du avbryta denna order?'))) return;
    setCancelling(true);
    try {
      await httpsCallable(getFunctions(), 'cancelB2BOrder')({ orderId: order.id });
      toast.success(t('b2b_cancel_done', 'Order avbruten'));
      load(); // refetch → status now cancelled
    } catch (err) {
      console.error('cancelB2BOrder failed:', err);
      toast.error(err?.message || t('b2b_cancel_failed', 'Kunde inte avbryta'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div>
        <Link to={`/${shopId}/b2b/orders`} className="text-sm text-blue-600 hover:underline">
          ← {t('b2b_nav_orders', 'Mina ordrar')}
        </Link>
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {t('b2b_order_not_found', 'Ordern hittades inte.')}
        </div>
      </div>
    );
  }

  const d = orderDate(order.createdAt);
  const ship = order.shippingInfo || {};
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div>
      <Link to={`/${shopId}/b2b/orders`} className="text-sm text-blue-600 hover:underline">
        ← {t('b2b_nav_orders', 'Mina ordrar')}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{order.orderNumber || order.id}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {d ? format(d, 'dd MMM yyyy', { locale: sv }) : '—'} · {STATUS_LABEL[order.status] || order.status}
          </p>
        </div>
        {order.status === 'pending' && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? t('b2b_cancelling', 'Avbryter...') : t('b2b_cancel_order', 'Avbryt order')}
          </button>
        )}
      </div>

      {/* Line items */}
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">{t('b2b_detail_product', 'Produkt')}</th>
              <th className="px-4 py-3 text-right">{t('b2b_detail_unit', 'À-pris')}</th>
              <th className="px-4 py-3 text-right">{t('b2b_detail_qty', 'Antal')}</th>
              <th className="px-4 py-3 text-right">{t('b2b_detail_line', 'Summa')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <tr key={it.productId || i}>
                <td className="px-4 py-3 text-gray-900">
                  {it.name || it.sku || '—'}
                  {it.sku && it.name ? <span className="ml-1 text-xs text-gray-400">{it.sku}</span> : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{sek(it.price)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">{it.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{sek(it.lineTotal ?? it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + ship-to */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-gray-900">{t('b2b_detail_totals', 'Summering')}</h2>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-gray-600"><span>{t('b2b_order_subtotal', 'Delsumma (ex moms)')}</span><span className="tabular-nums">{sek(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>{t('b2b_order_vat', 'Moms 25%')}</span><span className="tabular-nums">{sek(order.vat)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>{t('b2b_order_total', 'Totalt')}</span><span className="tabular-nums">{sek(order.total)}</span></div>
          </div>
          <p className="mt-3 text-xs text-gray-400">{t('b2b_detail_payment', 'Betalning mot faktura.')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-gray-900">{t('b2b_detail_shipto', 'Leveransadress')}</h2>
          <div className="mt-3 text-gray-600">
            <div>{order.customerInfo?.companyName || ''}</div>
            <div>{ship.address}</div>
            <div>{[ship.postalCode, ship.city].filter(Boolean).join(' ')}</div>
            <div>{ship.country}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
