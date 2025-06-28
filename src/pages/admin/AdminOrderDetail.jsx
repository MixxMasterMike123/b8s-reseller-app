import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrder } from '../../contexts/OrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import OrderStatusMenu from '../../components/OrderStatusMenu';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Add a helper function to parse and display order distribution data
const getOrderDistribution = (order) => {
  // If fordelning property exists (direct mapping of color_size to quantity)
  if (order.fordelning && Object.keys(order.fordelning).length > 0) {
    return Object.entries(order.fordelning).map(([key, antal]) => {
      const [farg, storlek] = key.split('_');
      return {
        color: farg,
        size: storlek.replace('storlek', ''),
        quantity: antal
      };
    });
  }
  
  // If orderDetails.distribution exists (array of color/size/quantity objects)
  if (order.orderDetails?.distribution && order.orderDetails.distribution.length > 0) {
    return order.orderDetails.distribution;
  }
  
  // Fallback to creating a single entry with the total quantity
  return [{
    color: order.farger?.join(', ') || order.color || 'Blandade färger',
    size: order.storlekar?.join(', ') || order.size || 'Blandade storlekar',
    quantity: order.antalForpackningar || 0
  }];
};

const AdminOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrderById, updateOrderStatus, deleteOrder } = useOrder();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Use guest data if it exists, otherwise use fetched user data
  const displayUser = order?.customerInfo ? {
    email: order.customerInfo.email,
    companyName: `${order.customerInfo.firstName} ${order.customerInfo.lastName} (Guest)`,
    contactPerson: `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
    phone: 'Not specified',
    role: 'Guest',
    active: true, // Guests are implicitly active for this order
  } : userData;

  const displayAddress = order?.shippingAddress ? {
    company: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    contactPerson: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    address: `${order.shippingAddress.address}${order.shippingAddress.apartment ? `, ${order.shippingAddress.apartment}` : ''}, ${order.shippingAddress.postalCode} ${order.shippingAddress.city}, ${order.shippingAddress.country}`,
  } : {
    company: userData?.companyName,
    contactPerson: userData?.contactPerson,
    address: [
      userData?.deliveryAddress, 
      userData?.deliveryPostalCode, 
      userData?.deliveryCity, 
      userData?.deliveryCountry
    ].filter(Boolean).join(', ') || 'Not specified'
  };

  // Fetch user data based on userId
  const fetchUserData = useCallback(async (userId) => {
    if (!userId) return null;
    
    try {
      setUserLoading(true);
      console.log('Fetching user data for ID:', userId);
      
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        console.log('User found in database');
        return userDocSnap.data();
      } else {
        console.log('User not found in database');
        return null;
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    } finally {
      setUserLoading(false);
    }
  }, []);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    if (!orderId || fetchAttempted) return;
    
    try {
      setLoading(true);
      console.log('Fetching order with ID:', orderId);
      const orderData = await getOrderById(orderId);
      
      if (!orderData) {
        setError('Order not found');
        toast.error('Order not found');
        return;
      }
      
      setOrder(orderData);
      
      // Fetch user data if order has userId
      if (orderData.userId) {
        const userData = await fetchUserData(orderData.userId);
        if (userData) {
          setUserData(userData);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Could not load order details');
      toast.error('Could not load order details');
    } finally {
      setLoading(false);
      setFetchAttempted(true);
    }
  }, [orderId, getOrderById, fetchAttempted, fetchUserData]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleRetry = () => {
    setFetchAttempted(false); // Reset the fetch attempted flag to try again
    fetchOrder();
  };

  const getOrderDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // Handle ISO date string
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    
    // Handle JavaScript Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Handle seconds-based timestamp (for Firestore seconds)
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }
    
    return null;
  };

  const formatDate = (date) => {
    try {
      if (!date) return 'Unknown date';
      
      const jsDate = getOrderDate(date);
      if (!jsDate) return 'Unknown date';
      
      return format(jsDate, 'PPP', { locale: sv });
    } catch (err) {
      console.error('Error formatting date:', err, date);
      return 'Invalid date';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending Confirmation', color: 'bg-yellow-100 text-yellow-800' };
      case 'confirmed':
        return { text: 'Confirmed', color: 'bg-blue-100 text-blue-800' };
      case 'processing':
        return { text: 'Processing', color: 'bg-purple-100 text-purple-800' };
      case 'shipped':
        return { text: 'Shipped', color: 'bg-indigo-100 text-indigo-800' };
      case 'delivered':
        return { text: 'Delivered', color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Unknown status', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === order.status) {
      return;
    }
    
    setUpdateStatusLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      
      // Fetch the updated order manually without triggering useEffect loop
      console.log('Re-fetching order after status update');
      const updatedOrderData = await getOrderById(orderId);
      if (updatedOrderData) {
        setOrder(updatedOrderData);
        toast.success(`Order status updated to ${getStatusInfo(newStatus).text}`);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Could not update order status: ' + (err.message || ''));
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      setDeleteLoading(true);
      try {
        await deleteOrder(orderId);
        toast.success('Order deleted successfully');
        navigate('/admin/orders');
      } catch (err) {
        console.error('Error deleting order:', err);
        toast.error('Failed to delete order: ' + (err.message || ''));
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="py-12 text-center">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">An error occurred</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/admin/orders"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="py-12 text-center">
            <h2 className="text-xl font-medium text-gray-700 mb-2">Order not found</h2>
            <Link
              to="/admin/orders"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { text: statusText, color: statusColor } = getStatusInfo(order.status);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center mb-2">
              <Link to="/admin/orders" className="text-blue-600 hover:text-blue-800 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Admin Order Details</h1>
            </div>
            <p className="text-gray-600">Order Number: <span className="font-semibold">{order.orderNumber}</span></p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center flex-wrap gap-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor} mr-2`}>
              {statusText}
            </span>
            
            <div className="flex items-center">
              {updateStatusLoading ? (
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2"></div>
              ) : (
                <OrderStatusMenu 
                  currentStatus={order.status} 
                  onStatusChange={handleStatusUpdate} 
                />
              )}
            </div>
            
            <button
              onClick={handleDeleteOrder}
              disabled={deleteLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Order'}
            </button>
          </div>
        </div>

        {/* User Information - Enhanced with user profile data */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-700">
                <span className="font-medium">User ID:</span> {order.userId || 'Not available'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Company:</span> {userData?.companyName || order.companyName || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Contact Person:</span> {userData?.contactPerson || order.contactName || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Role:</span> {userData?.role || 'User'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Account Status:</span>{' '}
                <span className={`px-2 py-0.5 text-xs rounded-full ${userData?.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {userData?.active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {userData?.email || order.email || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Phone:</span> {userData?.phoneNumber || order.phone || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Account Created:</span> {userData?.createdAt ? formatDate(userData.createdAt) : 'Unknown'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Last Updated:</span> {userData?.updatedAt ? formatDate(userData.updatedAt) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Order Information</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Date:</span> {formatDate(order.createdAt)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Status:</span> {statusText}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Payment Method:</span> {order.paymentMethod || 'Invoice'}
              </p>
              {order.deliveryMethod && (
                <p className="text-gray-700">
                  <span className="font-medium">Delivery Method:</span> {order.deliveryMethod}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Delivery Address</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Company:</span> {userData?.companyName || order.companyName || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Contact Person:</span> {userData?.contactPerson || order.contactName || 'Not specified'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Address:</span> {userData?.address || order.address || 'Not specified'}
              </p>
              {(userData?.postalCode || order.postalCode) && (userData?.city || order.city) && (
                <p className="text-gray-700">
                  <span className="font-medium">Postal Code & City:</span> {userData?.postalCode || order.postalCode}, {userData?.city || order.city}
                </p>
              )}
              {(userData?.country || order.country) && (
                <p className="text-gray-700">
                  <span className="font-medium">Country:</span> {userData?.country || order.country}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Order Items</h2>
          <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getOrderDistribution(order).map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">B8 Shield</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.color}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.size}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.quantity} st</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {index === 0 && order.prisInfo?.produktPris ? 
                        `${order.prisInfo.produktPris.toLocaleString('sv-SE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} kr` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">Subtotal:</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.prisInfo?.produktPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">VAT (25%):</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.prisInfo?.moms?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-bold">Total:</td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-800 text-right">
                    {order.prisInfo?.totalPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {order.note && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Notes</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{order.note}</p>
            </div>
          </div>
        )}

        {/* Status History Section */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Status History</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <li key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Status changed from </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.from).color}`}>
                          {getStatusInfo(history.from).text}
                        </span>
                        <span className="font-medium"> to </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.to).color}`}>
                          {getStatusInfo(history.to).text}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {history.changedAt ? formatDate(history.changedAt) : 'N/A'}
                      </div>
                    </div>
                    {history.displayName && (
                      <div className="text-sm text-gray-500 mt-1">
                        By: {history.displayName}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Link
            to="/admin/orders"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Order List
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminOrderDetail; 