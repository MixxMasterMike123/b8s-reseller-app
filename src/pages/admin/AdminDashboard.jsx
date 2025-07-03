import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import AdminPresence from '../../components/AdminPresence';
import ContactSyncStatus from '../../components/ContactSyncStatus';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    recentOrders: []
  });

  // Helper function to format Firestore timestamps
  const formatOrderDate = (timestamp) => {
    try {
      if (!timestamp) return 'Okänt datum';
      
      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return format(timestamp.toDate(), 'd MMM yyyy', { locale: sv });
      }
      
      // Handle regular Date or timestamp string
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Okänt datum';
      
      return format(date, 'd MMM yyyy', { locale: sv });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Okänt datum';
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
      return 'Okänt belopp';
    }
    
    return `${amount.toLocaleString('sv-SE')} SEK`;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch users stats
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const activeUsersSnap = await getDocs(query(usersRef, where('active', '==', true)));
        
        // Fetch orders stats
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        const recentOrdersSnap = await getDocs(
          query(ordersRef, orderBy('createdAt', 'desc'), limit(5))
        );
        
        setStats({
          totalUsers: usersSnap.size,
          activeUsers: activeUsersSnap.size,
          totalOrders: ordersSnap.size,
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
          <span className="ml-3 text-blue-600">Laddar statistik...</span>
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
                  Försök igen
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
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-gray-700">Dashboard</Link>
            </li>
            <li>
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li className="font-medium text-gray-900">Admin Dashboard</li>
          </ol>
        </nav>

        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">Välkommen till Admin Dashboard</h1>
            <p className="mt-1 text-gray-500">Här kan du se en översikt över systemet och hantera användare, ordrar och produkter.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Total Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Totalt antal användare</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/users" className="font-medium text-blue-700 hover:text-blue-900">
                  Visa alla användare
                </Link>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Aktiva användare</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/users" className="font-medium text-blue-700 hover:text-blue-900">
                  Hantera användare
                </Link>
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Totalt antal ordrar</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/admin/orders" className="font-medium text-blue-700 hover:text-blue-900">
                  Visa alla ordrar
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Sync Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <ContactSyncStatus />
          </div>
          <div className="lg:col-span-2">
            <AdminPresence />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Senaste ordrar</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>Inga ordrar hittades</p>
              </div>
            ) : (
              stats.recentOrders.map((order) => {
                const orderSource = getOrderSource(order);
                return (
                  <div key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <div className="flex items-center text-sm">
                          <p className="font-medium text-blue-600 truncate">{order.orderNumber || order.id}</p>
                          <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${orderSource.color}`}>
                            {orderSource.type}
                          </span>
                          <p className="ml-3 flex-shrink-0 font-normal text-gray-500">
                            från {formatOrderDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                            </svg>
                            {order.items?.length || 0} produkter
                          </div>
                          <div className="ml-6 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {formatOrderValue(order)}
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-blue-600 hover:text-blue-500"
                        >
                          Visa detaljer
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link to="/admin/orders" className="font-medium text-blue-600 hover:text-blue-500">
                Visa alla ordrar <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard; 