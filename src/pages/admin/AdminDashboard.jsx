import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import AppLayout from '../../components/layout/AppLayout';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import AdminPresence from '../../components/AdminPresence';


import { 
  UserGroupIcon, 
  ShoppingCartIcon, 
  CubeIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import AdminPresenceIndicator from '../../components/AdminPresenceIndicator';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
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
      return { type: 'B2C', color: 'bg-green-100 text-green-800' };
    }
    
    // Check for B2B indicators (default)
    if (order.userId || order.source === 'b2b' || !order.customerInfo) {
      return { type: 'B2B', color: 'bg-blue-100 text-blue-800' };
    }
    
    // Default to B2B
    return { type: 'B2B', color: 'bg-blue-100 text-blue-800' };
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
        
        // Fetch B2B users stats
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        
        // Fetch B2C customers stats
        const b2cCustomersRef = collection(db, 'b2cCustomers');
        const b2cCustomersSnap = await getDocs(b2cCustomersRef);
        
        // Fetch orders stats with detailed breakdown
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        const recentOrdersSnap = await getDocs(
          query(ordersRef, orderBy('createdAt', 'desc'), limit(5))
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
        
        // Fetch affiliate stats
        const affiliatesRef = collection(db, 'affiliates');
        const affiliatesSnap = await getDocs(query(affiliatesRef, where('status', '==', 'active')));
        
        setStats({
          totalUsers: usersSnap.size,
          totalRevenue: Math.round(totalRevenue),
          b2cCustomers: b2cCustomersSnap.size,
          totalOrders: ordersSnap.size,
          pendingOrders,
          processingOrders,
          completedOrders,
          affiliateRevenue: Math.round(affiliateRevenue),
          activeAffiliates: affiliatesSnap.size,
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
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-blue-600">{t('admin.dashboard.loading_stats', 'Laddar statistik...')}</span>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                  onClick={() => window.location.reload()}
                >
                  {t('admin.dashboard.try_again', 'Försök igen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-300">{t('admin.dashboard.breadcrumb_dashboard', 'Dashboard')}</Link>
            </li>
            <li>
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li className="font-medium text-gray-900 dark:text-gray-100">{t('admin.dashboard.breadcrumb_admin', 'Admin Dashboard')}</li>
          </ol>
        </nav>

        {/* Welcome Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('admin.dashboard.welcome', 'Välkommen till Admin Dashboard')}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {t('admin.dashboard.description', 'Här kan du se en översikt över systemet och hantera användare, ordrar och produkter.')}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Revenue */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Intäkt</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalRevenue)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/orders" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Visa alla ordrar
                </Link>
              </div>
            </div>
          </div>

          {/* B2C Customers */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">B2C Kunder</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.b2cCustomers}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/b2c-customers" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera kunder
                </Link>
              </div>
            </div>
          </div>

          {/* B2B Users */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">B2B Kunder</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/users" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera kunder
                </Link>
              </div>
            </div>
          </div>

          {/* Affiliate Revenue */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Affiliate Intäkt</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(stats.affiliateRevenue)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/affiliates" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera affiliates
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status & Affiliate Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Totalt Ordrar</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.totalOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/orders" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Visa alla ordrar
                </Link>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Väntande</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.pendingOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/orders" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera ordrar
                </Link>
              </div>
            </div>
          </div>

          {/* Processing Orders */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Bearbetas</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.processingOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/orders" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera ordrar
                </Link>
              </div>
            </div>
          </div>

          {/* Active Affiliates */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-emerald-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Aktiva Affiliates</dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.activeAffiliates}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/affiliates" className="font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                  Hantera affiliates
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Presence */}
        <div className="mb-8">
          <AdminPresence />
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">{t('admin.dashboard.recent_orders', 'Senaste ordrar')}</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {stats.recentOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <p>{t('admin.dashboard.no_orders_found', 'Inga ordrar hittades')}</p>
              </div>
            ) : (
              stats.recentOrders.map((order) => {
                const orderSource = getOrderSource(order);
                return (
                  <div key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <div className="flex items-center text-sm">
                          <p className="font-medium text-blue-600 dark:text-blue-400 truncate">{order.orderNumber || order.id}</p>
                          <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${orderSource.color}`}>
                            {orderSource.type}
                          </span>
                          <p className="ml-3 flex-shrink-0 font-normal text-gray-500 dark:text-gray-400">
                            {t('admin.dashboard.order_from', 'från')} {formatOrderDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                            </svg>
                            {order.items?.length || 0} {t('admin.dashboard.products', 'produkter')}
                          </div>
                          <div className="ml-6 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {formatOrderValue(order)}
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                        >
                          {t('admin.dashboard.view_details', 'Visa detaljer')}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link to="/admin/orders" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                {t('admin.dashboard.view_all_orders', 'Visa alla ordrar')} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard; 