import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrder } from '../../contexts/OrderContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AdminDashboard = () => {
  const { getAllUsers } = useAuth();
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
              <h2 className="text-xl font-medium text-gray-900 mb-4">Welcome, {users[0]?.companyName}</h2>
              <p className="text-gray-600">This is your admin dashboard where you can manage users and orders.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/admin/users"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Users</h3>
                <p className="text-gray-600">View and manage user accounts</p>
              </Link>
              
              <Link
                to="/admin/orders"
                className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition duration-150 border border-gray-200"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Orders</h3>
                <p className="text-gray-600">Process and track all orders</p>
              </Link>
              
              <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
                <p className="text-gray-600">Contact support at support@b8shield.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 