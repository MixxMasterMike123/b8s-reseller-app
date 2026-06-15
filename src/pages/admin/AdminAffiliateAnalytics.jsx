import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { calculateCommission } from '../../utils/affiliateCalculations';
import toast from 'react-hot-toast';
import { Page, MetricsBar, DataTable, Card, CardSection, Button } from '../../components/admin/ui';

const AdminAffiliateAnalytics = () => {
  const shopId = useShopId();
  const [affiliates, setAffiliates] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, shopId]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch affiliates with their real stats
      const affiliatesQuery = query(collection(db, 'affiliates'), where('shopId', '==', shopId), orderBy('createdAt', 'desc'));
      const affiliatesSnapshot = await getDocs(affiliatesQuery);
      const affiliatesData = affiliatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch clicks for traffic source analysis
      const clicksQuery = query(
        collection(db, 'affiliateClicks'),
        where('shopId', '==', shopId),
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
    const iconClass = "w-4 h-4";
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
        where('shopId', '==', shopId),
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
        <Page title="Affiliate Analytics" back={{ to: '/admin/affiliates', label: 'Affiliates' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar analytics…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const timeRangeSelect = (
    <div className="flex items-center gap-2">
      <label htmlFor="timeRange" className="text-[13px] text-admin-text-muted">Tidsperiod</label>
      <select
        id="timeRange"
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
        className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
      >
        <option value="7">7 dagar</option>
        <option value="30">30 dagar</option>
        <option value="90">90 dagar</option>
        <option value="365">1 år</option>
      </select>
    </div>
  );

  const metrics = [
    { key: 'clicks', label: 'Totala Klick', value: analytics.totalClicks.toLocaleString('sv-SE') },
    { key: 'conversions', label: `Konverteringar · ${analytics.overallConversionRate.toFixed(1)}% rate`, value: analytics.totalConversions },
    { key: 'revenue', label: 'Total Provision', value: formatCurrency(analytics.totalRevenue) },
    { key: 'balance', label: 'Obetald Provision', value: formatCurrency(analytics.totalBalance) },
    { key: 'affiliates', label: 'Aktiva Affiliates', value: analytics.activeAffiliates },
  ];

  const conversionRateTone = (rate) =>
    rate > 5 ? 'text-admin-success-text' : rate > 2 ? 'text-admin-caution-text' : 'text-admin-critical-text';

  const tableColumns = [
    {
      key: 'affiliate',
      header: 'Affiliate',
      render: (a) => (
        <div>
          <div className="font-medium text-admin-text">{a.name}</div>
          <div className="text-[12px] text-admin-text-muted">{a.affiliateCode}</div>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Trafikkälla',
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-admin-el)] bg-admin-neutral-bg px-2 py-0.5 text-[12px] font-medium text-admin-neutral-text">
          {getSourceIcon(a.trafficSource)} {getSourceLabel(a.trafficSource)}
        </span>
      ),
    },
    { key: 'clicks', header: 'Klick', align: 'right', render: (a) => <span className="tabular-nums">{a.recentClicks}</span> },
    { key: 'conversions', header: 'Konverteringar', align: 'right', render: (a) => <span className="tabular-nums">{a.recentConversions}</span> },
    {
      key: 'rate',
      header: 'Konv.grad',
      align: 'right',
      render: (a) => (
        <span className={`font-medium tabular-nums ${conversionRateTone(a.conversionRate)}`}>{a.conversionRate.toFixed(1)}%</span>
      ),
    },
    {
      key: 'revenue',
      header: 'Total Provision',
      align: 'right',
      render: (a) => <span className="font-medium text-admin-success-text tabular-nums">{formatCurrency(a.recentRevenue)}</span>,
    },
    {
      key: 'balance',
      header: 'Obetalt',
      align: 'right',
      render: (a) => <span className="font-medium text-admin-info-text tabular-nums">{formatCurrency(a.currentBalance)}</span>,
    },
    {
      key: 'verify',
      header: 'Verifiera',
      align: 'right',
      render: (a) => (
        <Button variant="plain" size="sm" onClick={() => verifyEarnings(a.id)} disabled={verifying}>
          {verifying ? 'Verifying…' : 'Verify'}
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <Page
        title="Affiliate Analytics"
        subtitle="Detaljerad prestandaanalys för dina affiliates"
        back={{ to: '/admin/affiliates', label: 'Affiliates' }}
        actions={timeRangeSelect}
        className="space-y-5"
      >
        {/* Key Metrics */}
        <MetricsBar metrics={metrics} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Traffic Sources */}
          <CardSection title="Trafikkällor" bodyClassName="space-y-2.5">
            {Object.entries(analytics.trafficSources).map(([source, data]) => (
              <div key={source} className="flex items-center justify-between rounded-[var(--radius-admin-el)] border border-admin-border-soft bg-admin-surface-2 p-3">
                <div className="flex items-center gap-3">
                  <div className="text-admin-text-muted">{getSourceIcon(source)}</div>
                  <div>
                    <p className="text-[13px] font-medium text-admin-text">{getSourceLabel(source)}</p>
                    <p className="text-[12px] text-admin-text-muted">{data.affiliates} affiliates</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-admin-text tabular-nums">{data.clicks} klick</p>
                  <p className="text-[12px] text-admin-text-muted tabular-nums">{data.conversions} konv.</p>
                  <p className="text-[12px] font-medium text-admin-success-text tabular-nums">{formatCurrency(data.revenue)}</p>
                </div>
              </div>
            ))}
          </CardSection>

          {/* Top Performers */}
          <CardSection
            title="Topprestanda"
            actions={
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2.5 py-1 text-[12px] text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
              >
                <option value="revenue">Provision</option>
                <option value="conversions">Konverteringar</option>
                <option value="clicks">Klick</option>
                <option value="rate">Konverteringsgrad</option>
              </select>
            }
            bodyClassName="space-y-2"
          >
            {analytics.topPerformers.slice(0, 5).map((affiliate, index) => (
              <div key={affiliate.id} className="flex items-center justify-between rounded-[var(--radius-admin-el)] border border-admin-border-soft bg-admin-surface-2 p-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-admin-primary)] text-[12px] font-semibold text-white dark:text-admin-bg">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-admin-text">{affiliate.name}</p>
                    <div className="flex items-center gap-1 text-[12px] text-admin-text-muted">
                      <div>{getSourceIcon(affiliate.trafficSource)}</div>
                      <span>{getSourceLabel(affiliate.trafficSource)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {selectedMetric === 'revenue' && (
                    <p className="text-[13px] font-semibold text-admin-success-text tabular-nums">{formatCurrency(affiliate.recentRevenue)}</p>
                  )}
                  {selectedMetric === 'conversions' && (
                    <p className="text-[13px] font-semibold text-admin-info-text tabular-nums">{affiliate.recentConversions}</p>
                  )}
                  {selectedMetric === 'clicks' && (
                    <p className="text-[13px] font-semibold text-admin-text tabular-nums">{affiliate.recentClicks}</p>
                  )}
                  {selectedMetric === 'rate' && (
                    <p className="text-[13px] font-semibold text-admin-caution-text tabular-nums">{affiliate.conversionRate.toFixed(1)}%</p>
                  )}
                  <p className="text-[12px] text-admin-text-faint tabular-nums">
                    {affiliate.recentClicks} klick → {affiliate.recentConversions} konv.
                  </p>
                </div>
              </div>
            ))}
          </CardSection>
        </div>

        {/* Detailed Performance Table */}
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-admin-text">Detaljerad Prestanda</h3>
          <DataTable
            columns={tableColumns}
            rows={analytics.topPerformers}
            rowKey={(a) => a.id}
            empty="Inga affiliates att visa."
          />

          {/* Earnings verification panels (per affiliate, shown after Verify) */}
          {analytics.topPerformers
            .filter((affiliate) => verificationResults[affiliate.id])
            .map((affiliate) => {
              const vr = verificationResults[affiliate.id];
              return (
                <Card key={affiliate.id} className="p-4">
                  <h4 className="mb-3 text-[14px] font-semibold text-admin-text">
                    Earnings Verification Results · {affiliate.name} ({affiliate.affiliateCode})
                  </h4>
                  <div className="grid grid-cols-1 gap-4 text-[13px] md:grid-cols-3">
                    <div>
                      <p className="font-medium text-admin-text-muted">Current Stored:</p>
                      <p className="text-[16px] font-semibold text-admin-text tabular-nums">
                        {vr.currentStored?.toFixed(2)} SEK
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-admin-text-muted">Old Method (Total × Rate):</p>
                      <p className="text-[16px] font-semibold text-admin-info-text tabular-nums">
                        {vr.oldMethodTotal?.toFixed(2)} SEK
                      </p>
                      <p className="text-[12px] text-admin-text-faint tabular-nums">
                        Diff: {vr.oldVsStoredDiff > 0 ? '+' : ''}
                        {vr.oldVsStoredDiff?.toFixed(2)} SEK
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-admin-text-muted">New Method (Correct Order):</p>
                      <p className="text-[16px] font-semibold text-admin-success-text tabular-nums">
                        {vr.newMethodTotal?.toFixed(2)} SEK
                      </p>
                      <p className="text-[12px] text-admin-text-faint">
                        Total → -Shipping → -Discount → -VAT → Commission
                      </p>
                      <p className="text-[12px] text-admin-text-faint tabular-nums">
                        Diff: {vr.newVsStoredDiff > 0 ? '+' : ''}
                        {vr.newVsStoredDiff?.toFixed(2)} SEK
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-admin-border-soft pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-admin-text-muted">
                        Orders analyzed: {vr.orderCount}
                      </span>
                      <span className="text-[13px] font-medium text-admin-text">
                        New vs Old Method:
                        <span className={`ml-1 ${vr.newVsOldDiff >= 0 ? 'text-admin-success-text' : 'text-admin-critical-text'}`}>
                          {vr.newVsOldDiff > 0 ? '+' : ''}
                          {vr.newVsOldDiff?.toFixed(2)} SEK
                        </span>
                      </span>
                    </div>

                    {vr.orderDetails && vr.orderDetails.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[13px] text-admin-text-muted hover:text-admin-text">
                          Show Order Details (first 10)
                        </summary>
                        <div className="mt-2 max-h-60 overflow-y-auto">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-admin-border-soft text-admin-text-muted">
                                <th className="px-2 py-1 text-left font-medium">Order</th>
                                <th className="px-2 py-1 text-right font-medium">Total</th>
                                <th className="px-2 py-1 text-right font-medium">Shipping</th>
                                <th className="px-2 py-1 text-right font-medium">Discount</th>
                                <th className="px-2 py-1 text-right font-medium">Old Comm.</th>
                                <th className="px-2 py-1 text-right font-medium">New Comm.</th>
                                <th className="px-2 py-1 text-right font-medium">Diff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vr.orderDetails.map((order, idx) => (
                                <tr key={idx} className="border-b border-admin-border-soft text-admin-text">
                                  <td className="px-2 py-1 text-admin-text-muted">
                                    {order.orderNumber || order.orderId?.slice(-6)}
                                  </td>
                                  <td className="px-2 py-1 text-right tabular-nums">{order.total?.toFixed(0)}</td>
                                  <td className="px-2 py-1 text-right tabular-nums">{order.shipping?.toFixed(0)}</td>
                                  <td className="px-2 py-1 text-right tabular-nums">{order.discountAmount?.toFixed(0)}</td>
                                  <td className="px-2 py-1 text-right tabular-nums">{order.oldCommission?.toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right tabular-nums">{order.newCommission?.toFixed(2)}</td>
                                  <td className={`px-2 py-1 text-right tabular-nums ${order.difference >= 0 ? 'text-admin-success-text' : 'text-admin-critical-text'}`}>
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
                </Card>
              );
            })}
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminAffiliateAnalytics; 