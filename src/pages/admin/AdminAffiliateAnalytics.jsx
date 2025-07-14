import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
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
import { calculateCommission } from '../../utils/affiliateCalculations';
import toast from 'react-hot-toast';

const AdminAffiliateAnalytics = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState({});

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
    const iconClass = "w-6 h-6";
    switch (source) {
      case 'instagram':
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
      case 'tiktok':
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>;
      case 'youtube':
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
      case 'website':
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>;
      default:
        return <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>;
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

  const verifyEarnings = async (affiliateId) => {
    setVerifying(true);
    try {
      // Fetch orders for this affiliate
      const ordersQuery = query(
        collection(db, 'orders'),
        where('affiliateId', '==', affiliateId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      // Get affiliate data for commission rate
      const affiliateDoc = await getDoc(doc(db, 'affiliates', affiliateId));
      const affiliateData = affiliateDoc.data();
      
      let oldMethodTotal = 0;
      let newMethodTotal = 0;
      const orderDetails = [];
      
      ordersSnapshot.forEach(orderDoc => {
        const order = orderDoc.data();
        
        // Skip cancelled orders
        if (order.status === 'cancelled') return;
        
        // Old method: total * commission rate
        const oldCommission = (order.total || order.subtotal || 0) * ((affiliateData.commissionRate || 15) / 100);
        oldMethodTotal += oldCommission;
        
        // New method: using centralized calculation
        try {
          const { commission: newCommission } = calculateCommission(order, affiliateData);
          newMethodTotal += newCommission;
          
          orderDetails.push({
            orderId: orderDoc.id,
            orderNumber: order.orderNumber,
            total: order.total || order.subtotal || 0,
            subtotal: order.subtotal || 0,
            shipping: order.shipping || 0,
            discountAmount: order.discountAmount || 0,
            oldCommission,
            newCommission,
            difference: newCommission - oldCommission,
            storedCommission: order.affiliateCommission || 0
          });
        } catch (error) {
          console.error('Error calculating new commission for order:', orderDoc.id, error);
          orderDetails.push({
            orderId: orderDoc.id,
            error: error.message,
            oldCommission,
            newCommission: 0,
            difference: -oldCommission
          });
        }
      });
      
      const currentStored = affiliateData.stats?.totalEarnings || 0;
      
      setVerificationResults(prev => ({
        ...prev,
        [affiliateId]: {
          currentStored,
          oldMethodTotal,
          newMethodTotal,
          oldVsStoredDiff: oldMethodTotal - currentStored,
          newVsStoredDiff: newMethodTotal - currentStored,
          newVsOldDiff: newMethodTotal - oldMethodTotal,
          orderCount: orderDetails.length,
          orderDetails: orderDetails.slice(0, 10) // Show first 10 for performance
        }
      }));
      
      toast.success('Verification complete');
    } catch (error) {
      console.error('Error verifying earnings:', error);
      toast.error('Failed to verify earnings');
    } finally {
      setVerifying(false);
    }
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
                    <div className="mr-3 text-gray-600">{getSourceIcon(source)}</div>
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
                      <div className="flex items-center text-xs text-gray-600">
                        <div className="mr-1">{getSourceIcon(affiliate.trafficSource)}</div>
                        <span>{getSourceLabel(affiliate.trafficSource)}</span>
                      </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verifiera
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => verifyEarnings(affiliate.id)} 
                        disabled={verifying}
                        className="text-sm text-blue-600 hover:text-blue-900"
                      >
                        {verifying ? 'Verifying...' : 'Verify'}
                      </button>
                      {verificationResults[affiliate.id] && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Earnings Verification Results</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">Current Stored:</p>
                              <p className="text-lg font-bold text-gray-900">
                                {verificationResults[affiliate.id].currentStored?.toFixed(2)} SEK
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Old Method (Total × Rate):</p>
                              <p className="text-lg font-bold text-blue-600">
                                {verificationResults[affiliate.id].oldMethodTotal?.toFixed(2)} SEK
                              </p>
                              <p className="text-xs text-gray-500">
                                Diff: {verificationResults[affiliate.id].oldVsStoredDiff > 0 ? '+' : ''}
                                {verificationResults[affiliate.id].oldVsStoredDiff?.toFixed(2)} SEK
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">New Method (Correct Order):</p>
                              <p className="text-lg font-bold text-green-600">
                                {verificationResults[affiliate.id].newMethodTotal?.toFixed(2)} SEK
                              </p>
                              <p className="text-xs text-gray-500">
                                Total → -Shipping → -Discount → -VAT → Commission
                              </p>
                              <p className="text-xs text-gray-500">
                                Diff: {verificationResults[affiliate.id].newVsStoredDiff > 0 ? '+' : ''}
                                {verificationResults[affiliate.id].newVsStoredDiff?.toFixed(2)} SEK
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">
                                Orders analyzed: {verificationResults[affiliate.id].orderCount}
                              </span>
                              <span className="text-sm font-medium">
                                New vs Old Method: 
                                <span className={`ml-1 ${verificationResults[affiliate.id].newVsOldDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {verificationResults[affiliate.id].newVsOldDiff > 0 ? '+' : ''}
                                  {verificationResults[affiliate.id].newVsOldDiff?.toFixed(2)} SEK
                                </span>
                              </span>
                            </div>
                            
                            {verificationResults[affiliate.id].orderDetails && verificationResults[affiliate.id].orderDetails.length > 0 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                  Show Order Details (first 10)
                                </summary>
                                <div className="mt-2 max-h-60 overflow-y-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-gray-50">
                                        <th className="px-2 py-1 text-left">Order</th>
                                        <th className="px-2 py-1 text-right">Total</th>
                                        <th className="px-2 py-1 text-right">Shipping</th>
                                        <th className="px-2 py-1 text-right">Discount</th>
                                        <th className="px-2 py-1 text-right">Old Comm.</th>
                                        <th className="px-2 py-1 text-right">New Comm.</th>
                                        <th className="px-2 py-1 text-right">Diff</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {verificationResults[affiliate.id].orderDetails.map((order, idx) => (
                                        <tr key={idx} className="border-t">
                                          <td className="px-2 py-1 text-xs text-gray-600">
                                            {order.orderNumber || order.orderId?.slice(-6)}
                                          </td>
                                          <td className="px-2 py-1 text-right">{order.total?.toFixed(0)}</td>
                                          <td className="px-2 py-1 text-right">{order.shipping?.toFixed(0)}</td>
                                          <td className="px-2 py-1 text-right">{order.discountAmount?.toFixed(0)}</td>
                                          <td className="px-2 py-1 text-right">{order.oldCommission?.toFixed(2)}</td>
                                          <td className="px-2 py-1 text-right">{order.newCommission?.toFixed(2)}</td>
                                          <td className={`px-2 py-1 text-right ${order.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {order.difference > 0 ? '+' : ''}{order.difference?.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      )}
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