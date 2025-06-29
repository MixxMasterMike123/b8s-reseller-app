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
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch affiliates with their real stats
      const affiliatesQuery = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
      const affiliatesSnapshot = await getDocs(affiliatesQuery);
      const affiliatesData = affiliatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch clicks for traffic source analysis
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

      console.log('Real Analytics Data:', {
        totalAffiliates: affiliatesData.length,
        totalClicks: clicksData.length,
        affiliatesList: affiliatesData.map(a => ({ 
          name: a.name, 
          code: a.affiliateCode, 
          status: a.status,
          stats: a.stats 
        }))
      });

      setAffiliates(affiliatesData);
      setClicks(clicksData);
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

  // Analytics calculations using real affiliate stats
  const analytics = useMemo(() => {
    // Filter active affiliates
    const activeAffiliates = affiliates.filter(a => a.status === 'active');

    // Traffic source analysis using real affiliate stats
    const trafficSources = {};
    activeAffiliates.forEach(affiliate => {
      const source = getTrafficSource(affiliate);
      const stats = affiliate.stats || { clicks: 0, conversions: 0, totalEarnings: 0 };
      
      if (!trafficSources[source]) {
        trafficSources[source] = {
          clicks: 0,
          conversions: 0,
          revenue: 0,
          affiliates: 0
        };
      }
      
      trafficSources[source].affiliates++;
      trafficSources[source].clicks += stats.clicks || 0;
      trafficSources[source].conversions += stats.conversions || 0;
      trafficSources[source].revenue += stats.totalEarnings || 0;
    });

    // Top performers using real stats
    const topPerformers = activeAffiliates
      .map(affiliate => {
        const stats = affiliate.stats || { clicks: 0, conversions: 0, totalEarnings: 0, balance: 0 };
        const conversionRate = stats.clicks > 0 ? (stats.conversions / stats.clicks * 100) : 0;
        
        return {
          ...affiliate,
          recentClicks: stats.clicks,
          recentConversions: stats.conversions,
          recentRevenue: stats.totalEarnings,
          currentBalance: stats.balance,
          conversionRate,
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

    // Overall stats from real affiliate data
    const totalClicks = activeAffiliates.reduce((sum, a) => sum + (a.stats?.clicks || 0), 0);
    const totalConversions = activeAffiliates.reduce((sum, a) => sum + (a.stats?.conversions || 0), 0);
    const totalRevenue = activeAffiliates.reduce((sum, a) => sum + (a.stats?.totalEarnings || 0), 0);
    const totalBalance = activeAffiliates.reduce((sum, a) => sum + (a.stats?.balance || 0), 0);
    const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;

    return {
      trafficSources,
      topPerformers,
      totalClicks,
      totalConversions,
      totalRevenue,
      totalBalance,
      overallConversionRate,
      activeAffiliates: activeAffiliates.length
    };
  }, [affiliates, selectedMetric]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount || 0);
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                to="/admin/affiliates" 
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Analytics</h1>
                <p className="text-gray-600">Detaljerad prestandaanalys för dina affiliates</p>
              </div>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Tidsperiod:</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">7 dagar</option>
                <option value="30">30 dagar</option>
                <option value="90">90 dagar</option>
                <option value="365">1 år</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Clicks */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <ChartBarIcon className="h-7 w-7 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Totala Klick</p>
              <p className="text-3xl font-bold text-gray-900 leading-none">{analytics.totalClicks.toLocaleString('sv-SE')}</p>
            </div>
          </div>

          {/* Conversions */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <ArrowTrendingUpIcon className="h-7 w-7 text-green-600" />
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Konverteringar</p>
              <p className="text-3xl font-bold text-gray-900 leading-none mb-1">{analytics.totalConversions}</p>
              <p className="text-xs font-medium text-green-600">{analytics.overallConversionRate.toFixed(1)}% rate</p>
            </div>
          </div>

          {/* Total Commission */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <CurrencyDollarIcon className="h-7 w-7 text-yellow-600" />
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Total Provision</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
          </div>

          {/* Unpaid Commission */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <CurrencyDollarIcon className="h-7 w-7 text-green-600" />
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Obetald<br/>Provision</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(analytics.totalBalance)}</p>
            </div>
          </div>

          {/* Active Affiliates */}
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <UserGroupIcon className="h-7 w-7 text-purple-600" />
              </div>
              <p className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Aktiva Affiliates</p>
              <p className="text-3xl font-bold text-gray-900 leading-none">{analytics.activeAffiliates}</p>
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
                    Trafikkälla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Klick
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Konverteringar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Konv.grad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Provision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Obetalt
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatCurrency(affiliate.currentBalance)}
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