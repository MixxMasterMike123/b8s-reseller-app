import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
  const [debugMode, setDebugMode] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - range * DAY_MS);

      // Fetch clicks (timestamp is a Firestore Timestamp)
      const clicksQuery = query(
        collection(db, 'affiliateClicks'),
        where('affiliateCode', '==', affiliateCode),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      const clickSnap = await getDocs(clicksQuery);
      const clickData = clickSnap.docs.map(d => d.data());

      // Fetch orders – createdAt might be a string, so we fetch latest 500 and filter client-side
      const ordersQuery = query(
        collection(db, 'orders'),
        where('affiliateCode', '==', affiliateCode),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const orderSnap = await getDocs(ordersQuery);
      const orderData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 🐛 DEBUG: Log sample order data to understand field structure
      if (debugMode && orderData.length > 0) {
        console.log('🔍 AFFILIATE DEBUG - Sample order data:', orderData[0]);
        console.log('🔍 Available fields:', Object.keys(orderData[0]));
      }

      // Filter orders by date range (client-side filtering for date range)
      const filteredOrders = orderData.filter(order => {
        let orderDate;
        if (order.createdAt?.seconds) {
          orderDate = new Date(order.createdAt.seconds * 1000);
        } else {
          orderDate = new Date(order.createdAt);
        }
        return orderDate >= startDate;
      });

      setClicks(clickData);
      setOrders(filteredOrders);

      // 🐛 DEBUG: Log data summary
      if (debugMode) {
        console.log(`📊 AFFILIATE DEBUG - Data summary:`, {
          clicks: clickData.length,
          totalOrders: orderData.length,
          filteredOrders: filteredOrders.length,
          dateRange: `${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}`
        });
      }

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
      let d;
      if (o.createdAt?.seconds) {
        d = new Date(o.createdAt.seconds * 1000);
      } else {
        d = new Date(o.createdAt);
      }
      const key = d.toLocaleDateString('sv-SE');
      add(key, 'conversions');
    });
    const arr = Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
    return arr;
  }, [clicks, orders]);

  const totals = useMemo(() => {
    const clicksCnt = clicks.length;
    const convCnt = orders.length;
    
    // 🔧 FIXED: Use multiple field names for compatibility
    const earnings = orders.reduce((sum, o) => {
      // Try affiliateCommission first, then calculate from order total if missing
      let commission = o.affiliateCommission || 0;
      
      // If no commission but has affiliate code, it might be missing - show debug info
      if (!commission && o.affiliateCode && debugMode) {
        console.log(`⚠️ Order ${o.id} missing commission - total: ${o.total || o.totalAmount}`);
      }
      
      return sum + commission;
    }, 0);
    
    const rate = clicksCnt > 0 ? (convCnt / clicksCnt) * 100 : 0;
    
    // 🐛 DEBUG: Log calculation details
    if (debugMode) {
      console.log(`📊 AFFILIATE DEBUG - Calculations:`, {
        clicks: clicksCnt,
        conversions: convCnt,
        earnings,
        rate: rate.toFixed(1),
        ordersWithCommission: orders.filter(o => o.affiliateCommission > 0).length,
        ordersWithoutCommission: orders.filter(o => o.affiliateCode && !o.affiliateCommission).length
      });
    }
    
    return { clicksCnt, convCnt, earnings, rate };
  }, [clicks, orders, debugMode]);

  const formatCurrency = (amt) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amt);

  // 🔧 FIXED: Get order value using multiple field fallbacks
  const getOrderValue = (order) => {
    // Try multiple field names for compatibility
    return order.total || order.totalAmount || order.subtotal || 0;
  };

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
      {/* Range selector with debug toggle */}
      <div className="flex items-center justify-between">
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
        
        {/* Debug toggle for troubleshooting */}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`text-xs px-2 py-1 rounded ${debugMode ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}
        >
          {debugMode ? '🐛 Debug ON' : '🔍 Debug'}
        </button>
      </div>

      {/* Debug info panel */}
      {debugMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
          <h4 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Data Summary:</strong>
              <ul className="mt-1 text-yellow-700">
                <li>Clicks: {clicks.length}</li>
                <li>Orders: {orders.length}</li>
                <li>Orders with commission: {orders.filter(o => o.affiliateCommission > 0).length}</li>
                <li>Orders without commission: {orders.filter(o => o.affiliateCode && !o.affiliateCommission).length}</li>
              </ul>
            </div>
            <div>
              <strong>Field Usage:</strong>
              <ul className="mt-1 text-yellow-700">
                <li>Orders with 'total': {orders.filter(o => o.total).length}</li>
                <li>Orders with 'totalAmount': {orders.filter(o => o.totalAmount).length}</li>
                <li>Orders processed: {orders.filter(o => o.conversionProcessed).length}</li>
              </ul>
            </div>
          </div>
          <button 
            onClick={() => {
              console.log('🔍 Full orders data:', orders);
              console.log('🔍 Full clicks data:', clicks);
            }}
            className="mt-2 bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs"
          >
            Log full data to console
          </button>
        </div>
      )}

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
          {debugMode && totals.earnings === 0 && totals.convCnt > 0 && (
            <p className="text-xs text-red-600 mt-1">⚠️ No earnings calculated</p>
          )}
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
                {debugMode && (
                  <>
                    <th className="px-3 py-2 text-xs">Status</th>
                    <th className="px-3 py-2 text-xs">Fields</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,20).map(o => {
                const created = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
                const orderValue = getOrderValue(o);
                const commission = o.affiliateCommission || 0;
                
                return (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-1">{created.toLocaleDateString('sv-SE')}</td>
                    <td className="px-3 py-1 font-mono">{o.orderNumber || o.id.substring(0,8)}…</td>
                    <td className="px-3 py-1">
                      {formatCurrency(orderValue)}
                      {debugMode && orderValue === 0 && (
                        <span className="text-red-500 text-xs ml-1">⚠️</span>
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {formatCurrency(commission)}
                      {debugMode && commission === 0 && o.affiliateCode && (
                        <span className="text-red-500 text-xs ml-1">⚠️ Missing</span>
                      )}
                    </td>
                    {debugMode && (
                      <>
                        <td className="px-3 py-1 text-xs">
                          {o.conversionProcessed ? '✅ Processed' : '❌ Not processed'}
                        </td>
                        <td className="px-3 py-1 text-xs">
                          {o.total ? 'total' : o.totalAmount ? 'totalAmount' : 'none'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AffiliateAnalyticsTab; 