import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import { useTranslation } from '../../contexts/TranslationContext';
import AppLayout from '../../components/layout/AppLayout';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import AdminPresence from '../../components/AdminPresence';

import {
  Page,
  MetricsBar,
  DataTable,
  CardSection,
  StatusPill,
} from '../../components/admin/ui';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  // Tenant scope: the dashboard stats MUST be scoped to the active shop, exactly
  // like every list page (Phase 2). Honors operator impersonation (admin-mode
  // ShopProvider override) — i.e. impersonating Sillmans shows Sillmans' numbers.
  const shopId = useShopId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    b2cCustomers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    affiliateRevenue: 0,
    activeAffiliates: 0,
    recentOrders: []
  });



  // Helper function to format Firestore timestamps
  const formatOrderDate = (timestamp) => {
    try {
      if (!timestamp) return t('admin.dashboard.unknown_date', 'Okänt datum');

      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return format(timestamp.toDate(), 'd MMM yyyy', { locale: sv });
      }

      // Handle regular Date or timestamp string
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return t('admin.dashboard.unknown_date', 'Okänt datum');

      return format(date, 'd MMM yyyy', { locale: sv });
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('admin.dashboard.unknown_date', 'Okänt datum');
    }
  };

  // Helper function to determine if order is B2B or B2C
  const getOrderSource = (order) => {
    // Check for B2C indicators
    if (order.customerInfo || order.source === 'b2c' || order.platform === 'shop') {
      return { type: 'B2C', tone: 'success' };
    }

    // Check for B2B indicators (default)
    if (order.userId || order.source === 'b2b' || !order.customerInfo) {
      return { type: 'B2B', tone: 'info' };
    }

    // Default to B2B
    return { type: 'B2B', tone: 'info' };
  };

  // Helper function to format order value
  const formatOrderValue = (order) => {
    let amount = 0;

    // B2C orders store total in 'total' field
    if (order.source === 'b2c' || order.customerInfo) {
      amount = order.total;
    }
    // B2B orders store total in 'prisInfo.totalPris' field
    else {
      amount = order.prisInfo?.totalPris || order.totalAmount;
    }

    if (amount === null || amount === undefined || isNaN(amount)) {
      return t('admin.dashboard.unknown_amount', 'Okänt belopp');
    }

    return `${amount.toLocaleString('sv-SE')} SEK`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // (B2B users stat removed 2026-06-15 — reseller function retired; no
        // longer read the global `users` collection here.)

        // Fetch B2C customers stats (scoped to the active shop)
        const b2cCustomersRef = collection(db, 'b2cCustomers');
        const b2cCustomersSnap = await getDocs(
          query(b2cCustomersRef, where('shopId', '==', shopId))
        );

        // Fetch orders stats with detailed breakdown (scoped to the active shop).
        // The recent-orders query (shopId + orderBy createdAt desc) is backed by
        // the existing [shopId ASC, createdAt DESC] composite index (Phase 2).
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(
          query(ordersRef, where('shopId', '==', shopId))
        );
        const recentOrdersSnap = await getDocs(
          query(ordersRef, where('shopId', '==', shopId), orderBy('createdAt', 'desc'), limit(5))
        );

        // Calculate order statistics and revenue
        let totalRevenue = 0;
        let pendingOrders = 0;
        let processingOrders = 0;
        let completedOrders = 0;
        let affiliateRevenue = 0;

        ordersSnap.forEach(doc => {
          const order = doc.data();

          // Calculate revenue (handle both B2B and B2C order formats)
          const orderValue = order.total || order.totalAmount || order.prisInfo?.totalPris || 0;
          totalRevenue += orderValue;

          // Count orders by status
          if (order.status === 'pending') {
            pendingOrders++;
          } else if (order.status === 'processing') {
            processingOrders++;
          } else if (order.status === 'delivered' || order.status === 'shipped') {
            completedOrders++;
          }

          // Calculate affiliate revenue
          if (order.affiliateCommission) {
            affiliateRevenue += order.affiliateCommission;
          }
        });

        // Fetch affiliate stats (scoped to the active shop). Scope by shopId only
        // (single-field, index-free) and count active ones client-side — avoids a
        // [shopId, status] composite index that doesn't exist, consistent with the
        // client-side order tallying above.
        const affiliatesRef = collection(db, 'affiliates');
        const affiliatesSnap = await getDocs(
          query(affiliatesRef, where('shopId', '==', shopId))
        );
        const activeAffiliatesCount = affiliatesSnap.docs.filter(
          (d) => d.data().status === 'active'
        ).length;

        setStats({
          totalRevenue: Math.round(totalRevenue),
          b2cCustomers: b2cCustomersSnap.size,
          totalOrders: ordersSnap.size,
          pendingOrders,
          processingOrders,
          completedOrders,
          affiliateRevenue: Math.round(affiliateRevenue),
          activeAffiliates: activeAffiliatesCount,
          recentOrders: recentOrdersSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [shopId]);

  // ── Recent-orders table columns (Shopify-style: Order · Källa · Datum ·
  //    Artiklar · Belopp). Same fields the old card list rendered. ──
  const recentOrderColumns = [
    {
      key: 'order',
      header: 'Order',
      render: (order) => (
        <span className="font-medium text-admin-text group-hover:underline">
          {order.orderNumber || order.id}
        </span>
      ),
    },
    {
      key: 'source',
      header: t('admin.dashboard.source', 'Källa'),
      render: (order) => {
        const src = getOrderSource(order);
        return <StatusPill tone={src.tone}>{src.type}</StatusPill>;
      },
    },
    {
      key: 'date',
      header: 'Datum',
      render: (order) => (
        <span className="text-admin-text-muted whitespace-nowrap">{formatOrderDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'items',
      header: t('admin.dashboard.products', 'produkter'),
      align: 'right',
      render: (order) => (
        <span className="tabular-nums text-admin-text-muted">{order.items?.length || 0}</span>
      ),
    },
    {
      key: 'total',
      header: 'Belopp',
      align: 'right',
      render: (order) => (
        <span className="tabular-nums font-medium text-admin-text">{formatOrderValue(order)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-3 text-admin-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
          <span className="text-[13px]">{t('admin.dashboard.loading_stats', 'Laddar statistik...')}</span>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Page title={t('admin.dashboard.welcome', 'Välkommen till Admin Dashboard')}>
          <div className="rounded-[var(--radius-admin)] border border-admin-critical-dot/30 bg-admin-critical-bg px-4 py-3 text-[13px] text-admin-critical-text">
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 font-medium underline hover:no-underline"
              onClick={() => window.location.reload()}
            >
              {t('admin.dashboard.try_again', 'Försök igen')}
            </button>
          </div>
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title={t('admin.dashboard.welcome', 'Välkommen till Admin Dashboard')}
        subtitle={t('admin.dashboard.description', 'Här kan du se en översikt över systemet och hantera användare, ordrar och produkter.')}
      >
        <div className="space-y-4">
          {/* Primary metrics strip — revenue, B2C customers, affiliate revenue. */}
          <MetricsBar
            metrics={[
              { key: 'revenue', label: 'Total Intäkt', value: formatCurrency(stats.totalRevenue) },
              { key: 'b2c', label: 'B2C Kunder', value: stats.b2cCustomers },
              { key: 'affiliateRevenue', label: 'Affiliate Intäkt', value: formatCurrency(stats.affiliateRevenue) },
            ]}
          />
          {/* Quick links mirroring the old card footers. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <Link to="/admin/orders" className="text-admin-text-muted hover:text-admin-text hover:underline">
              Visa alla ordrar
            </Link>
            <Link to="/admin/b2c-customers" className="text-admin-text-muted hover:text-admin-text hover:underline">
              Hantera kunder
            </Link>
            <Link to="/admin/affiliates" className="text-admin-text-muted hover:text-admin-text hover:underline">
              Hantera affiliates
            </Link>
          </div>

          {/* B2B Kunder card removed (2026-06-15) — reseller function retired. */}

          {/* Order-status metrics strip — totals, pending, processing, completed,
              and active affiliates. */}
          <MetricsBar
            metrics={[
              { key: 'orders', label: 'Totalt Ordrar', value: stats.totalOrders },
              { key: 'pending', label: 'Väntande', value: stats.pendingOrders },
              { key: 'processing', label: 'Bearbetas', value: stats.processingOrders },
              { key: 'completed', label: 'Levererade', value: stats.completedOrders },
              { key: 'affiliates', label: 'Aktiva Affiliates', value: stats.activeAffiliates },
            ]}
          />

          {/* Admin Presence */}
          <AdminPresence />

          {/* Recent Orders */}
          <CardSection
            title={t('admin.dashboard.recent_orders', 'Senaste ordrar')}
            bodyClassName="!p-0"
          >
            <DataTable
              columns={recentOrderColumns}
              rows={stats.recentOrders}
              rowKey={(o) => o.id}
              onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
              empty={t('admin.dashboard.no_orders_found', 'Inga ordrar hittades')}
              className="border-0 rounded-none"
              footer={
                <div className="px-4 py-3 text-[13px]">
                  <Link to="/admin/orders" className="font-medium text-admin-text hover:underline">
                    {t('admin.dashboard.view_all_orders', 'Visa alla ordrar')} <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              }
            />
          </CardSection>
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminDashboard;
