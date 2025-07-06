import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../../contexts/TranslationContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const DAY_MS = 24 * 60 * 60 * 1000;

const AffiliateAnalyticsTab = ({ affiliateCode }) => {
  const { t } = useTranslation();
  const [range, setRange] = useState(30); // days
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState([]);
  const [orders, setOrders] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - range * DAY_MS);

      // Fetch clicks
      const clicksQuery = query(
        collection(db, 'affiliateClicks'),
        where('affiliateCode', '==', affiliateCode),
        where('timestamp', '>=', startDate)
      );
      const clickSnap = await getDocs(clicksQuery);
      const clickData = clickSnap.docs.map(d => d.data());

      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('affiliateCode', '==', affiliateCode),
        where('createdAt', '>=', startDate)
      );
      const orderSnap = await getDocs(ordersQuery);
      const orderData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setClicks(clickData);
      setOrders(orderData);
    } catch (err) {
      console.error('Analytics fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Aggregate daily counts
  const chartData = useMemo(() => {
    const map = {};
    const add = (dateKey, field) => {
      if (!map[dateKey]) map[dateKey] = { date: dateKey, clicks: 0, conversions: 0 };
      map[dateKey][field] += 1;
    };
    clicks.forEach(c => {
      const d = new Date(c.timestamp.seconds ? c.timestamp.seconds * 1000 : c.timestamp);
      const key = d.toLocaleDateString('sv-SE');
      add(key, 'clicks');
    });
    orders.forEach(o => {
      const d = new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt);
      const key = d.toLocaleDateString('sv-SE');
      add(key, 'conversions');
    });
    const arr = Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
    return arr;
  }, [clicks, orders]);

  const totals = useMemo(() => {
    const clicksCnt = clicks.length;
    const convCnt = orders.length;
    const earnings = orders.reduce((sum, o) => sum + (o.affiliateCommission || 0), 0);
    const rate = clicksCnt > 0 ? (convCnt / clicksCnt) * 100 : 0;
    return { clicksCnt, convCnt, earnings, rate };
  }, [clicks, orders]);

  const formatCurrency = (amt) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amt);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span>{t('analytics_loading', 'Laddar analys...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Range selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{t('analytics_time_period', 'Tidsperiod')}:</span>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value={7}>{t('analytics_days_7', '7 dagar')}</option>
          <option value={30}>{t('analytics_days_30', '30 dagar')}</option>
          <option value={90}>{t('analytics_days_90', '90 dagar')}</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-xs uppercase text-gray-500">{t('analytics_clicks', 'Klick')}</p>
          <p className="text-2xl font-semibold">{totals.clicksCnt}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-xs uppercase text-gray-500">{t('analytics_conversions', 'Konverteringar')}</p>
          <p className="text-2xl font-semibold">{totals.convCnt}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-xs uppercase text-gray-500">{t('analytics_earnings', 'Intäkter')}</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.earnings)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-xs uppercase text-gray-500">{t('analytics_conversion_rate', 'Konverteringsgrad')}</p>
          <p className="text-2xl font-semibold">{totals.rate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="clicks" stroke="#3b82f6" name={t('analytics_clicks', 'Klick')} />
            <Line type="monotone" dataKey="conversions" stroke="#10b981" name={t('analytics_conversions', 'Konverteringar')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders table */}
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <h3 className="text-lg font-semibold mb-3">{t('analytics_recent_orders', 'Senaste orders')}</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">{t('analytics_no_orders', 'Inga ordrar under vald period.')}</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2">{t('analytics_order_date', 'Datum')}</th>
                <th className="px-3 py-2">{t('analytics_order_id', 'Order #')}</th>
                <th className="px-3 py-2">{t('analytics_order_value', 'Ordervärde')}</th>
                <th className="px-3 py-2">{t('analytics_commission', 'Provision')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.sort((a,b)=>b.createdAt.seconds - a.createdAt.seconds).slice(0,20).map(o => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-1">{new Date(o.createdAt.seconds * 1000).toLocaleDateString('sv-SE')}</td>
                  <td className="px-3 py-1 font-mono">{o.id.substring(0,8)}…</td>
                  <td className="px-3 py-1">{formatCurrency(o.totalAmount || 0)}</td>
                  <td className="px-3 py-1">{formatCurrency(o.affiliateCommission || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AffiliateAnalyticsTab; 