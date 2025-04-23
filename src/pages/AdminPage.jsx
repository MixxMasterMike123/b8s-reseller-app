import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

function AdminPage() {
  const { currentUser, isAdmin } = useAuth();
  const { getOrderStats, createDefaultProducts } = useOrder();
  const navigate = useNavigate();
  const [orderStats, setOrderStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // For debugging
    console.log('AdminPage mounted');
    console.log('Current user:', currentUser);
    console.log('Is admin:', isAdmin);
    
    return () => {
      console.log('AdminPage unmounted');
    };
  }, []);

  // Check admin status
  useEffect(() => {
    console.log('Checking admin access');
    if (!currentUser) {
      console.log('No current user, redirecting to login');
      navigate('/login');
    } else if (isAdmin === false) { // Only redirect if explicitly false (not undefined or loading)
      console.log('User is not admin, redirecting to dashboard');
      navigate('/dashboard');
      toast.error('You do not have access to the admin panel');
    }
  }, [currentUser, isAdmin, navigate]);

  // Load order stats
  useEffect(() => {
    console.log('Loading order stats, isAdmin:', isAdmin);
    if (isAdmin) {
      setStatsLoading(true);
      getOrderStats()
        .then((stats) => {
          console.log('Order stats loaded:', stats);
          setOrderStats(stats);
        })
        .catch((error) => {
          console.error('Error fetching order stats:', error);
          setError('Failed to load order statistics');
        })
        .finally(() => {
          setStatsLoading(false);
        });
    }
  }, [getOrderStats, isAdmin]);

  // Handler for creating default products
  const handleCreateDefaultProducts = async () => {
    try {
      setIsCreatingProducts(true);
      console.log('Creating default products');
      await createDefaultProducts();
      toast.success('Default products created successfully');
    } catch (error) {
      console.error('Error creating default products:', error);
      toast.error('Failed to create default products');
    } finally {
      setIsCreatingProducts(false);
    }
  };

  // Show loading indicator until we know if user is admin
  if (isAdmin === undefined) {
    console.log('Showing loading spinner (isAdmin is undefined)');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading admin panel...</span>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    console.log('Not rendering admin page (not admin)');
    return null;
  }

  console.log('Rendering admin page content');
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{error}</p>
      </div>}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Order Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Order Statistics</h2>
          {statsLoading ? (
            <div className="flex flex-col items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading statistics...</p>
            </div>
          ) : orderStats ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Orders:</span>
                <span className="font-semibold">{orderStats.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>New Orders:</span>
                <span className="font-semibold">{orderStats.newOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Orders:</span>
                <span className="font-semibold">{orderStats.processingOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Orders:</span>
                <span className="font-semibold">{orderStats.completedOrders}</span>
              </div>
            </div>
          ) : (
            <p>No statistics available</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/orders" className="block w-full py-2 px-4 bg-blue-600 text-white text-center rounded hover:bg-blue-700">
              Manage Orders
            </Link>
            <Link to="/admin/users" className="block w-full py-2 px-4 bg-blue-600 text-white text-center rounded hover:bg-blue-700">
              Manage Users
            </Link>
            <Link to="/admin/products" className="block w-full py-2 px-4 bg-blue-600 text-white text-center rounded hover:bg-blue-700">
              Manage Products
            </Link>
            <Link to="/" className="block w-full py-2 px-4 bg-gray-600 text-white text-center rounded hover:bg-gray-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
        
        {/* Product Management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Product Management</h2>
          <div className="space-y-3">
            <button 
              onClick={handleCreateDefaultProducts} 
              disabled={isCreatingProducts}
              className={`block w-full py-2 px-4 ${isCreatingProducts ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white text-center rounded`}
            >
              {isCreatingProducts ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Creating...
                </span>
              ) : 'Create Default Products'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              This will create the B8 Shield product with default settings in the database.
              Use this if the product catalog is empty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage; 