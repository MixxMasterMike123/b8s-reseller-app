import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrder } from '../../contexts/OrderContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AdminDashboard = () => {
  const { getAllUsers, currentUser } = useAuth();
  const { getRecentOrders, getOrderStats } = useOrder();
  
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    newOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Flag to prevent state updates after component unmounts
    let isMounted = true;
    
    // Add a console log to track when this effect runs
    console.log('AdminDashboard: Initial render, fetching data once');

    const fetchData = async () => {
      try {
        if (!isMounted) return;
        
        // Fetch recent orders
        try {
          console.log('AdminDashboard: Fetching recent orders');
          const recentOrders = await getRecentOrders(5);
          if (isMounted) {
            setOrders(recentOrders);
          }
        } catch (error) {
          console.error('Error fetching recent orders:', error);
          if (isMounted) {
            setError('Failed to fetch recent orders');
          }
        }
        
        // Fetch users
        try {
          console.log('AdminDashboard: Fetching users');
          const allUsers = await getAllUsers();
          if (isMounted) {
            setUsers(allUsers);
          }
        } catch (error) {
          console.error('Error fetching users:', error);
          if (isMounted) {
            setError('Failed to fetch users');
          }
        }
        
        // Fetch order statistics
        try {
          console.log('AdminDashboard: Loading order stats');
          const orderStats = await getOrderStats();
          if (isMounted) {
            console.log('AdminDashboard: Order stats loaded', orderStats);
            setStats(orderStats);
          }
        } catch (error) {
          console.error('Error fetching order stats:', error);
          if (isMounted) {
            setError('Failed to fetch order statistics');
          }
        }
        
        // Set loading to false only if all fetches are complete
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        if (isMounted) {
          setLoading(false);
          setError('Failed to load dashboard data');
        }
      }
    };

    fetchData();
    
    // Clean up function
    return () => {
      console.log('AdminDashboard: Unmounting, cleaning up');
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-blue-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <p className="mt-2 text-sm text-red-700">
                <button 
                  className="font-medium underline"
                  onClick={() => window.location.reload()}
                >
                  Try refreshing the page
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              Admin Dashboard
            </h1>
            <Link
              to="/"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Main Dashboard
            </Link>
          </div>

          {/* Admin content */}
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Welcome, {currentUser?.email || 'Admin'}</h2>
              <p className="text-gray-600">Detta är din adminpanel där du kan hantera kunder och beställningar.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats.totalOrders
                  )}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 border border-blue-200 border-l-4">
                <h3 className="text-blue-500 text-sm font-medium">New Orders</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats.newOrders
                  )}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 border border-yellow-200 border-l-4">
                <h3 className="text-yellow-500 text-sm font-medium">Processing Orders</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats.processingOrders
                  )}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 border border-green-200 border-l-4">
                <h3 className="text-green-500 text-sm font-medium">Completed Orders</h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats.completedOrders
                  )}
                </p>
              </div>
            </div>

            {/* Admin Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link
                to="/admin/users"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <div className="flex items-center mb-3">
                  <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Hantera Kunder</h3>
                </div>
                <p className="text-gray-600">Visa och hantera kundkonton</p>
              </Link>
              
              <Link
                to="/admin/orders"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <div className="flex items-center mb-3">
                  <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Hantera Ordrar</h3>
                </div>
                <p className="text-gray-600">Bearbeta och spåra alla beställningar</p>
              </Link>
              
              <Link
                to="/admin/marketing"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <div className="flex items-center mb-3">
                  <svg className="h-6 w-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Marknadsföring</h3>
                </div>
                <p className="text-gray-600">Hantera marknadsföringsmaterial</p>
              </Link>
              
              <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-3">
                  <svg className="h-6 w-6 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Behöver Hjälp?</h3>
                </div>
                <p className="text-gray-600">Kontakta support på support@b8shield.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 