import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../../contexts/TranslationContext';
import { useLanguageCurrency } from '../../contexts/LanguageCurrencyContext';
import SmartPrice, { ExactPrice } from '../../components/shop/SmartPrice';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { parseReferrer, getReferrerCategory } from '../../utils/referrerParser';

const DAY_MS = 24 * 60 * 60 * 1000;

const AffiliateAnalyticsTab = ({ affiliateCode, affiliateStats, affiliateData }) => {
  const { t } = useTranslation();
  const { selectLanguage } = useLanguageCurrency();
  const [range, setRange] = useState(30); // days
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [affiliateClicksData, setAffiliateClicksData] = useState({});


  // Set user's preferred language if available
  useEffect(() => {
    if (affiliateData?.preferredLang && selectLanguage) {
      selectLanguage(affiliateData.preferredLang);
      console.log(`🌍 Analytics: Using affiliate preferred language: ${affiliateData.preferredLang}`);
    }
  }, [affiliateData?.preferredLang, selectLanguage]);

  // Fetch affiliate click details for referrer information
  const fetchAffiliateClickDetails = async (orders) => {
    try {
      // Get all unique affiliate click IDs from orders
      const clickIds = [];
      orders.forEach(order => {
        if (order.affiliateClickId) {
          clickIds.push(order.affiliateClickId);
        }
        if (order.affiliate?.clickId) {
          clickIds.push(order.affiliate.clickId);
        }
      });

      if (clickIds.length === 0) return;

      // Fetch affiliate clicks in batches (Firestore 'in' query limit is 10)
      const clickData = {};
      const batchSize = 10;
      
      for (let i = 0; i < clickIds.length; i += batchSize) {
        const batch = clickIds.slice(i, i + batchSize);
        const clicksQuery = query(
          collection(db, 'affiliateClicks'),
          where('__name__', 'in', batch)
        );
        
        const clicksSnapshot = await getDocs(clicksQuery);
        clicksSnapshot.docs.forEach(doc => {
          clickData[doc.id] = { id: doc.id, ...doc.data() };
        });
      }

      setAffiliateClicksData(clickData);
    } catch (error) {
      console.error('Error fetching affiliate click details:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - range * DAY_MS);

      // Fetch clicks for chart only (not for totals)
      const clicksQuery = query(
        collection(db, 'affiliateClicks'),
        where('affiliateCode', '==', affiliateCode),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      const clickSnap = await getDocs(clicksQuery);
      const clickData = clickSnap.docs.map(d => d.data());

      // Fetch orders for chart only (not for totals)
      // Query 1: Orders with top-level affiliateCode (Mock payments)
      const ordersQuery1 = query(
        collection(db, 'orders'),
        where('affiliateCode', '==', affiliateCode),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const orderSnap1 = await getDocs(ordersQuery1);
      const orderData1 = orderSnap1.docs.map(d => ({ id: d.id, ...d.data() }));

      // Query 2: Orders with affiliate.code structure (Stripe payments)
      const ordersQuery2 = query(
        collection(db, 'orders'),
        where('affiliate.code', '==', affiliateCode),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const orderSnap2 = await getDocs(ordersQuery2);
      const orderData2 = orderSnap2.docs.map(d => ({ id: d.id, ...d.data() }));

      // Merge and deduplicate orders by ID
      const allOrders = [...orderData1, ...orderData2];
      const orderData = allOrders.filter((order, index, array) => 
        array.findIndex(o => o.id === order.id) === index
      );

      // Filter orders by date range (for chart only)
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

      // Fetch affiliate click details for referrer information
      if (orderData.length > 0) {
        await fetchAffiliateClickDetails(orderData);
      }

      // Chart data loaded successfully

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

  // Aggregate daily counts for chart only
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

  // 🎯 SIMPLIFIED: Use affiliate.stats as source of truth
  const totals = useMemo(() => {
    if (!affiliateStats) {
      return { clicksCnt: 0, convCnt: 0, earnings: 0, rate: 0 };
    }

    const clicksCnt = affiliateStats.clicks || 0;
    const convCnt = affiliateStats.conversions || 0;
    const earnings = affiliateStats.totalEarnings || 0;
    const rate = clicksCnt > 0 ? (convCnt / clicksCnt) * 100 : 0;
    
    // Using reliable affiliate.stats data
    
    return { clicksCnt, convCnt, earnings, rate };
  }, [affiliateStats, affiliateData?.preferredLang]);

  // Get order value for recent orders table
  const getOrderValue = (order) => {
    return order.total || order.totalAmount || order.subtotal || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-sm">{t('analytics_loading', 'Laddar analys...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Range selector - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">{t('analytics_time_period', 'Tidsperiod')}:</span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>{t('analytics_days_7', '7 dagar')}</option>
            <option value={30}>{t('analytics_days_30', '30 dagar')}</option>
            <option value={90}>{t('analytics_days_90', '90 dagar')}</option>
          </select>
        </div>
        
        {/* Language indicator */}
        {affiliateData?.preferredLang && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full self-start sm:self-center">
            {affiliateData.preferredLang}
          </span>
        )}
      </div>

      {/* 🎯 MAIN STATS: Mobile-first responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center border border-gray-100">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">{totals.clicksCnt}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{t('analytics_clicks', 'Klick')}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center border border-gray-100">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600">{totals.convCnt}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{t('analytics_conversions', 'Konverteringar')}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center border border-gray-100">
          <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-600">
            <ExactPrice 
              sekPrice={totals.earnings} 
              size="large"
              showOriginal={false}
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{t('analytics_earnings', 'Intäkter')}</div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg text-center border border-gray-100">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600">{totals.rate.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{t('analytics_conversion_rate', 'Konverteringsgrad')}</div>
        </div>
      </div>

      {/* Chart - Mobile optimized */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('analytics_performance_chart', 'Prestanda över tid')}</h3>
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={200} minWidth={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickMargin={5}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                allowDecimals={false}
                stroke="#666"
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name={t('analytics_clicks', 'Klick')} 
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name={t('analytics_conversions', 'Konverteringar')} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders table - Mobile optimized */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{t('analytics_recent_orders', 'Senaste ordrar')}</h3>
        </div>
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">{t('analytics_no_orders', 'Inga ordrar under vald period.')}</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics_order_date', 'Datum')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics_order_id', 'Order #')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics_traffic_source', 'Trafikkälla')}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics_order_value', 'Ordervärde')}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics_commission', 'Provision')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.slice(0,10).map(o => {
                  const created = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt);
                  const orderValue = getOrderValue(o);
                  const commission = o.affiliateCommission || 0;
                  
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {created.toLocaleDateString('sv-SE')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                        {o.orderNumber || `${o.id.substring(0,8)}...`}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        <div className="space-y-1">
                          {/* Payment Method */}
                          <div className="text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                              o.payment?.method === 'stripe' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {o.payment?.method === 'stripe' ? 'Stripe' : 'Mock'}
                            </span>
                          </div>
                          
                          {/* Referrer Information */}
                          {(() => {
                            const clickId = o.affiliateClickId || o.affiliate?.clickId;
                            const clickData = clickId ? affiliateClicksData[clickId] : null;
                            
                            if (clickData && clickData.landingPage && clickData.landingPage !== 'unknown') {
                              const referrer = parseReferrer(clickData.landingPage);
                              const category = getReferrerCategory(referrer.category);
                              
                              // Map category colors to actual Tailwind classes
                              const categoryStyles = {
                                purple: 'text-purple-800 bg-purple-100',
                                blue: 'text-blue-800 bg-blue-100', 
                                green: 'text-green-800 bg-green-100',
                                red: 'text-red-800 bg-red-100',
                                teal: 'text-teal-800 bg-teal-100',
                                gray: 'text-gray-800 bg-gray-100',
                                indigo: 'text-indigo-800 bg-indigo-100'
                              };
                              
                              return (
                                <div className="text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${categoryStyles[category.color] || categoryStyles.gray}`}>
                                    {referrer.name}
                                  </span>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-xs text-gray-500">
                                {o.customerInfo?.firstName ? 
                                  `${o.customerInfo.firstName} ${o.customerInfo.lastName || ''}`.trim() : 
                                  'Okänd kund'
                                }
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        <SmartPrice 
                          sekPrice={orderValue} 
                          size="small"
                          showOriginal={false}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        <ExactPrice 
                          sekPrice={commission} 
                          size="small"
                          showOriginal={false}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {orders.length > 10 && (
          <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {t('analytics_showing_recent', 'Visar 10 senaste ordrar av')} {orders.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateAnalyticsTab; 