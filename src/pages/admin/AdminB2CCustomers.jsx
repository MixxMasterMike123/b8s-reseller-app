import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useShopId } from '../../contexts/ShopContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import {
  Page,
  MetricsBar,
  DataTable,
  ViewTabs,
  InlineSearch,
  StatusPill,
  Button,
} from '../../components/admin/ui';

const AdminB2CCustomers = () => {
  const navigate = useNavigate();
  const shopId = useShopId();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    marketingConsent: 0,
    withOrders: 0,
    totalSales: 0
  });

  useEffect(() => {
    const fetchB2CCustomersAndCalculateStats = async () => {
      try {
        setLoading(true);
        console.log('Fetching B2C customers from b2cCustomers collection...');

        const customersQuery = query(
          collection(db, 'b2cCustomers'),
          where('shopId', '==', shopId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(customersQuery);
        const customersList = [];

        snapshot.forEach((doc) => {
          customersList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        console.log(`Fetched ${customersList.length} B2C customers`);

        // Calculate real-time stats from actual orders for each customer
        const customersWithRealStats = await Promise.all(
          customersList.map(async (customer) => {
            const realStats = await calculateCustomerRealStats(customer);
            return {
              ...customer,
              realStats // Add real-time calculated stats
            };
          })
        );

        setCustomers(customersWithRealStats);
        setFilteredCustomers(customersWithRealStats);

        // Calculate overall statistics from real-time data
        const totalCustomers = customersWithRealStats.length;
        const marketingConsent = customersWithRealStats.filter(c => c.marketingConsent).length;
        const withOrders = customersWithRealStats.filter(c => (c.realStats?.totalOrders || 0) > 0).length;
        const totalSales = customersWithRealStats.reduce((sum, c) => sum + (c.realStats?.totalSpent || 0), 0);

        setStats({
          totalCustomers,
          marketingConsent,
          withOrders,
          totalSales
        });

        console.log(`Calculated real-time stats: ${withOrders} customers with orders, ${totalSales.toFixed(2)} SEK total sales`);
      } catch (error) {
        console.error('Error fetching B2C customers:', error);
        toast.error('Kunde inte hämta B2C-kunder');
      } finally {
        setLoading(false);
      }
    };

    fetchB2CCustomersAndCalculateStats();
  }, [shopId]);

  // Calculate real-time customer statistics from orders (both account and guest orders)
  const calculateCustomerRealStats = async (customer) => {
    try {
      const orders = [];

      // Query 1: Orders with b2cCustomerId (account orders)
      const ordersWithAccountQuery = query(
        collection(db, 'orders'),
        where('shopId', '==', shopId),
        where('b2cCustomerId', '==', customer.id)
      );

      const accountOrdersSnapshot = await getDocs(ordersWithAccountQuery);
      accountOrdersSnapshot.forEach(doc => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Query 2: Orders by email (guest orders) - only if customer email exists
      if (customer.email) {
        const ordersWithEmailQuery = query(
          collection(db, 'orders'),
          where('shopId', '==', shopId),
          where('source', '==', 'b2c'),
          where('customerInfo.email', '==', customer.email)
        );

        const emailOrdersSnapshot = await getDocs(ordersWithEmailQuery);
        emailOrdersSnapshot.forEach(doc => {
          const orderData = {
            id: doc.id,
            ...doc.data()
          };
          // Only add if not already in orders array (avoid duplicates)
          if (!orders.some(order => order.id === orderData.id)) {
            orders.push(orderData);
          }
        });
      }

      // Calculate stats from all orders
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      console.log(`📊 Customer ${customer.email} stats:`, {
        totalOrders,
        totalSpent,
        orderIds: orders.map(o => o.id),
        orderTotals: orders.map(o => ({ id: o.id, total: o.total }))
      });

      // Find latest order date
      let lastOrderDate = null;
      orders.forEach(order => {
        if (order.createdAt?.seconds) {
          const orderDate = new Date(order.createdAt.seconds * 1000);
          if (!lastOrderDate || orderDate > lastOrderDate) {
            lastOrderDate = orderDate;
          }
        }
      });

      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastOrderDate
      };

    } catch (error) {
      console.error(`Error calculating real stats for customer ${customer.id}:`, error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null
      };
    }
  };

  useEffect(() => {
    // Filter customers based on search term and segment filter
    const filtered = customers.filter(customer => {
      const matchesSearch =
        customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSegment =
        segmentFilter === 'all' ||
        customer.customerSegment === segmentFilter;

      return matchesSearch && matchesSegment;
    });

    setFilteredCustomers(filtered);
  }, [searchTerm, segmentFilter, customers]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Aldrig';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMM yyyy HH:mm', { locale: sv });
    } catch (error) {
      return 'Ogiltigt datum';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount || 0);
  };

  const exportCustomersCSV = () => {
    const csvHeaders = ['Namn', 'E-post', 'Telefon', 'Stad', 'Land', 'Marknadsföring', 'Totala ordrar', 'Total spenderat', 'Registrerad'];

    const csvData = filteredCustomers.map(customer => [
      `${customer.firstName} ${customer.lastName}`,
      customer.email,
      customer.phone || '',
      customer.city || '',
      customer.country || '',
      customer.marketingConsent ? 'Ja' : 'Nej',
      customer.realStats?.totalOrders || 0,
      customer.realStats?.totalSpent || 0,
      formatDate(customer.createdAt)
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `b2c-customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('B2C-kunder exporterade till CSV!');
  };

  // Thin metrics strip (Polaris s-metrics-bar) — all derived from already-loaded
  // real-time stats, no extra queries.
  const metrics = [
    { key: 'total', label: 'Totala kunder', value: stats.totalCustomers },
    { key: 'consent', label: 'Godkänt marknadsföring', value: stats.marketingConsent },
    { key: 'withorders', label: 'Med ordrar', value: stats.withOrders },
    { key: 'sales', label: 'Total försäljning', value: formatCurrency(stats.totalSales) },
  ];

  // Segment filter — same values + logic as before (matches customer.customerSegment).
  const segmentTabOptions = [
    { value: 'all', label: 'Alla kunder' },
    { value: 'new', label: 'Nya kunder' },
    { value: 'repeat', label: 'Återkommande kunder' },
    { value: 'vip', label: 'VIP kunder' },
  ];

  const headerActions = (
    <Button variant="secondary" onClick={exportCustomersCSV}>
      <ArrowDownTrayIcon className="h-4 w-4" />
      Exportera CSV
    </Button>
  );

  // ── Shopify IndexTable columns. ──
  const columns = [
    {
      key: 'customer',
      header: 'Kund',
      render: (customer) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-admin-text group-hover:underline">
            {customer.firstName} {customer.lastName}
          </div>
          {(customer.city || customer.country) && (
            <div className="truncate text-[12px] text-admin-text-faint">
              {[customer.city, customer.country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Kontakt',
      render: (customer) => (
        <div className="min-w-0">
          <div className="truncate text-admin-text">{customer.email}</div>
          <div className="mt-1">
            {customer.marketingConsent ? (
              <StatusPill tone="success">Marknadsföring OK</StatusPill>
            ) : (
              <StatusPill tone="neutral">Ej marknadsföring</StatusPill>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'orders',
      header: 'Ordrar',
      align: 'right',
      render: (customer) => (
        <div className="whitespace-nowrap">
          <div className="tabular-nums text-admin-text">{customer.realStats?.totalOrders || 0} ordrar</div>
          <div className="tabular-nums text-[12px] text-admin-text-faint">
            {formatCurrency(customer.realStats?.totalSpent || 0)}
          </div>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      render: (customer) =>
        customer.customerSegment === 'vip' ? (
          <StatusPill tone="info">VIP</StatusPill>
        ) : customer.customerSegment === 'repeat' ? (
          <StatusPill tone="info">Återkommande</StatusPill>
        ) : (
          <StatusPill tone="neutral">Ny</StatusPill>
        ),
    },
    {
      key: 'registered',
      header: 'Registrerad',
      render: (customer) => (
        <span className="whitespace-nowrap text-admin-text-muted">{formatDate(customer.createdAt)}</span>
      ),
    },
    {
      // Trailing quick-link to the customer's orders; stop row click so it doesn't
      // open the edit detail instead.
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-28',
      render: (customer) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/b2c-customers/${customer.id}/orders`);
          }}
          title="Visa ordrar"
          aria-label="Visa ordrar"
          className="inline-flex items-center rounded-[var(--radius-admin-el)] px-2 py-1 text-[12px] text-admin-text-muted hover:bg-admin-surface-2 hover:text-admin-text whitespace-nowrap"
        >
          Ordrar ({customer.realStats?.totalOrders || 0})
        </button>
      ),
    },
  ];

  // In-card toolbar: segment view-tabs + inline search (Polaris IndexTable header).
  const tableToolbar = (
    <>
      <ViewTabs
        ariaLabel="Filtrera på segment"
        options={segmentTabOptions}
        value={segmentFilter}
        onChange={setSegmentFilter}
      />
      <InlineSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Sök efter namn eller e-post…"
      />
    </>
  );

  return (
    <AppLayout>
      <Page
        title="B2C Kunder"
        subtitle="Hantera konsumentkunder och deras data"
        back={{ to: '/admin', label: 'Admin' }}
        actions={headerActions}
      >
        <div className="space-y-3">
          <MetricsBar metrics={metrics} />

          <DataTable
            columns={columns}
            rows={filteredCustomers}
            rowKey={(c) => c.id}
            loading={loading}
            onRowClick={(c) => navigate(`/admin/b2c-customers/${c.id}`)}
            empty={
              searchTerm || segmentFilter !== 'all'
                ? 'Inga B2C-kunder matchar de valda filtren.'
                : 'B2C-kunder kommer att visas här när de skapar konton via kassan.'
            }
            toolbar={tableToolbar}
          />
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminB2CCustomers;
