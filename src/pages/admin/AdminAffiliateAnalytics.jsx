import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const AdminAffiliateAnalytics = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch affiliates
      const affiliatesQuery = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
      const affiliatesSnapshot = await getDocs(affiliatesQuery);
      const affiliatesData = affiliatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch clicks (last 30 days for performance)
      const clicksQuery = query(
        collection(db, 'affiliateClicks'),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      const clicksSnapshot = await getDocs(clicksQuery);
      const clicksData = clicksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch orders with affiliate data
      const ordersQuery = query(
        collection(db, 'orders'),
        where('affiliateCode', '!=', null),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAffiliates(affiliatesData);
      setClicks(clicksData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate traffic source from affiliate data
  const getTrafficSource = (affiliate) => {
    if (!affiliate.socials) return 'other';
    
    const socials = affiliate.socials;
    if (socials.instagram && socials.instagram.length > 0) return 'instagram';
    if (socials.tiktok && socials.tiktok.length > 0) return 'tiktok';
    if (socials.youtube && socials.youtube.length > 0) return 'youtube';
    if (socials.website && socials.website.length > 0) return 'website';
    
    return 'other';
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(timeRange) * 24 * 60 * 60 * 1000));

    // Filter data by time range
    const recentClicks = clicks.filter(click => {
      const clickDate = new Date(click.timestamp?.toDate ? click.timestamp.toDate() : click.timestamp);
      return clickDate >= daysAgo;
    });

    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= daysAgo;
    });

    // Traffic source analysis
    const trafficSources = {};
    affiliates.forEach(affiliate => {
      const source = getTrafficSource(affiliate);
      if (!trafficSources[source]) {
        trafficSources[source] = {
          clicks: 0,
          conversions: 0,
          revenue: 0,
          affiliates: 0
        };
      }
      trafficSources[source].affiliates++;
    });

    // Add clicks and conversions by source
    recentClicks.forEach(click => {
      const affiliate = affiliates.find(a => a.affiliateCode === click.affiliateCode);
      if (affiliate) {
        const source = getTrafficSource(affiliate);
        if (trafficSources[source]) {
          trafficSources[source].clicks++;
          if (click.converted) {
            trafficSources[source].conversions++;
          }
        }
      }
    });

    // Add revenue by source
    recentOrders.forEach(order => {
      const affiliate = affiliates.find(a => a.affiliateCode === order.affiliateCode);
      if (affiliate) {
        const source = getTrafficSource(affiliate);
        if (trafficSources[source]) {
          trafficSources[source].revenue += order.affiliateCommission || 0;
        }
      }
    });

    // Top performers
    const topPerformers = affiliates
      .map(affiliate => {
        const affiliateClicks = recentClicks.filter(c => c.affiliateCode === affiliate.affiliateCode);
        const affiliateOrders = recentOrders.filter(o => o.affiliateCode === affiliate.affiliateCode);
        const revenue = affiliateOrders.reduce((sum, order) => sum + (order.affiliateCommission || 0), 0);
        
        return {
          ...affiliate,
          recentClicks: affiliateClicks.length,
          recentConversions: affiliateOrders.length,
          recentRevenue: revenue,
          conversionRate: affiliateClicks.length > 0 ? (affiliateOrders.length / affiliateClicks.length * 100) : 0,
          trafficSource: getTrafficSource(affiliate)
        };
      })
      .sort((a, b) => {
        switch (selectedMetric) {
          case 'revenue':
            return b.recentRevenue - a.recentRevenue;
          case 'conversions':
            return b.recentConversions - a.recentConversions;
          case 'clicks':
            return b.recentClicks - a.recentClicks;
          case 'rate':
            return b.conversionRate - a.conversionRate;
          default:
            return b.recentRevenue - a.recentRevenue;
        }
      })
      .slice(0, 10);

    // Overall stats
    const totalClicks = recentClicks.length;
    const totalConversions = recentOrders.length;
    const totalRevenue = recentOrders.reduce((sum, order) => sum + (order.affiliateCommission || 0), 0);
    const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;

    return {
      trafficSources,
      topPerformers,
      totalClicks,
      totalConversions,
      totalRevenue,
      overallConversionRate,
      activeAffiliates: affiliates.filter(a => a.status === 'active').length
    };
  }, [affiliates, clicks, orders, timeRange, selectedMetric]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'instagram':
        return '📱';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '📺';
      case 'website':
        return '🌐';
      default:
        return '❓';
    }
  };

  const getSourceLabel = (source) => {
    const labels = {
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      website: 'Webbsida',
      other: 'Övrigt'
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Laddar analytics...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                to="/admin/affiliates" 
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-2"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Tillbaka till Affiliates
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Affiliate Analytics</h1>
              <p className="text-lg text-gray-600 mt-2">Detaljerad analys av affiliate-prestanda och trafikkällor</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mt-6 flex gap-2">
            {[
              { value: '7', label: '7 dagar' },
              { value: '30', label: '30 dagar' },
              { value: '90', label: '90 dagar' },
              { value: '365', label: '1 år' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totala Klick</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalClicks.toLocaleString('sv-SE')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Konverteringar</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalConversions}</p>
                <p className="text-sm text-gray-500">{analytics.overallConversionRate.toFixed(1)}% rate</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Provision</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktiva Affiliates</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.activeAffiliates}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traffic Sources */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Trafikkällor</h2>
            <div className="space-y-4">
              {Object.entries(analytics.trafficSources).map(([source, data]) => (
                <div key={source} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getSourceIcon(source)}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{getSourceLabel(source)}</p>
                      <p className="text-sm text-gray-600">{data.affiliates} affiliates</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{data.clicks} klick</p>
                    <p className="text-sm text-gray-600">{data.conversions} konv.</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(data.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Topprestanda</h2>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="revenue">Provision</option>
                <option value="conversions">Konverteringar</option>
                <option value="clicks">Klick</option>
                <option value="rate">Konverteringsgrad</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {analytics.topPerformers.slice(0, 5).map((affiliate, index) => (
                <div key={affiliate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold text-gray-900 text-sm">{affiliate.name}</p>
                      <p className="text-xs text-gray-600">
                        {getSourceIcon(affiliate.trafficSource)} {getSourceLabel(affiliate.trafficSource)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {selectedMetric === 'revenue' && (
                      <p className="font-bold text-green-600">{formatCurrency(affiliate.recentRevenue)}</p>
                    )}
                    {selectedMetric === 'conversions' && (
                      <p className="font-bold text-blue-600">{affiliate.recentConversions}</p>
                    )}
                    {selectedMetric === 'clicks' && (
                      <p className="font-bold text-purple-600">{affiliate.recentClicks}</p>
                    )}
                    {selectedMetric === 'rate' && (
                      <p className="font-bold text-orange-600">{affiliate.conversionRate.toFixed(1)}%</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {affiliate.recentClicks} klick → {affiliate.recentConversions} konv.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Performance Table */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Detaljerad Prestanda</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affiliate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Källa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Klick
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Konverteringar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provision
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topPerformers.map((affiliate) => (
                  <tr key={affiliate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{affiliate.name}</div>
                          <div className="text-sm text-gray-500">{affiliate.affiliateCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getSourceIcon(affiliate.trafficSource)} {getSourceLabel(affiliate.trafficSource)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {affiliate.recentClicks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {affiliate.recentConversions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        affiliate.conversionRate > 5 ? 'text-green-600' :
                        affiliate.conversionRate > 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {affiliate.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(affiliate.recentRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliateAnalytics; 