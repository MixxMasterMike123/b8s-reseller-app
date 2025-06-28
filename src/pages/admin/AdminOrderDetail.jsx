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
  // If fordelning is already an array of objects with color, size, quantity
  if (order.fordelning && Array.isArray(order.fordelning)) {
    return order.fordelning;
  }
  
  // If orderDetails.distribution exists (array of color/size/quantity objects)
  if (order.orderDetails?.distribution && order.orderDetails.distribution.length > 0) {
    return order.orderDetails.distribution;
  }
  
  // If fordelning is old format (object with color_size keys)
  if (order.fordelning && typeof order.fordelning === 'object' && !Array.isArray(order.fordelning)) {
    return Object.entries(order.fordelning).map(([key, antal]) => {
      const [farg, storlek] = key.split('_');
      return {
        color: farg,
        size: storlek?.replace('storlek', '') || '',
        quantity: antal
      };
    });
  }
  
  // Fallback to creating a single entry with the total quantity
  return [{
    color: order.color || 'Blandade färger',
    size: order.size || 'Blandade storlekar',
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
  const displayUser = order?.source === 'b2c' ? {
    email: order.customerInfo?.email || 'Not specified',
    companyName: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''} (B2C Customer)`.trim(),
    contactPerson: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'Not specified',
    phone: 'Not specified',
    role: 'B2C Customer',
    active: true, // B2C customers are implicitly active for their order
  } : userData || {
    email: 'Not specified',
    companyName: 'Not specified',
    contactPerson: 'Not specified',
    phone: 'Not specified',
    role: 'User',
    active: false
  };

  const displayAddress = order?.source === 'b2c' ? {
    company: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 'Not specified',
    contactPerson: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 'Not specified',
    address: [
      order.shippingAddress?.address,
      order.shippingAddress?.apartment,
      order.shippingAddress?.postalCode,
      order.shippingAddress?.city,
      order.shippingAddress?.country
    ].filter(Boolean).join(', ') || 'Not specified'
  } : {
    company: userData?.companyName || 'Not specified',
    contactPerson: userData?.contactPerson || 'Not specified',
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
                <span className="font-medium">Company/Name:</span> {displayUser.companyName}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Contact Person:</span> {displayUser.contactPerson}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Role:</span> {displayUser.role}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Account Status:</span>{' '}
                <span className={`px-2 py-0.5 text-xs rounded-full ${displayUser.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {displayUser.active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {displayUser.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Phone:</span> {displayUser.phone}
              </p>
              {userData && (
                <>
                  <p className="text-gray-700">
                    <span className="font-medium">Account Created:</span> {userData.createdAt ? formatDate(userData.createdAt) : 'Unknown'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Last Updated:</span> {userData.updatedAt ? formatDate(userData.updatedAt) : 'Unknown'}
                  </p>
                </>
              )}
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
              {order.source && (
                <p className="text-gray-700">
                  <span className="font-medium">Order Source:</span>{' '}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${order.source === 'b2c' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {order.source === 'b2c' ? 'B2C Shop' : 'B2B Portal'}
                  </span>
                </p>
              )}
              {order.source === 'b2c' && order.affiliateCode && (
                <p className="text-gray-700">
                  <span className="font-medium">REF Code:</span>{' '}
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                    {order.affiliateCode}
                  </span>
                  {order.affiliateDiscount && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({order.affiliateDiscount.percentage}% rabatt)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Delivery Address</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Name/Company:</span> {displayAddress.company}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Contact Person:</span> {displayAddress.contactPerson}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Address:</span> {displayAddress.address}
              </p>
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
                {order.source === 'b2c' ? (
                  // B2C order items
                  order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.color || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.size || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.quantity} st</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        {item.price?.toLocaleString('sv-SE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} kr
                      </td>
                    </tr>
                  ))
                ) : (
                  // B2B order items
                  getOrderDistribution(order).map((item, index) => (
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
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">Subtotal:</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.source === 'b2c' ? (
                      `${order.subtotal?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    ) : (
                      `${order.prisInfo?.produktPris?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    )}
                  </td>
                </tr>
                {order.source === 'b2c' && order.discountAmount > 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium text-green-600">
                      Affiliate rabatt ({order.affiliateCode}), {order.discountPercentage}%:
                    </td>
                    <td className="px-4 py-4 text-sm text-green-600 text-right">
                      - {order.discountAmount?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                  </tr>
                )}
                {order.source === 'b2c' && order.shipping > 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">Shipping:</td>
                    <td className="px-4 py-4 text-sm text-gray-700 text-right">
                      {order.shipping.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">VAT (25%):</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.source === 'b2c' ? (
                      `${order.vat?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    ) : (
                      `${order.prisInfo?.moms?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-bold">Total:</td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-800 text-right">
                    {order.source === 'b2c' ? (
                      `${order.total?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    ) : (
                      `${order.prisInfo?.totalPris?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr`
                    )}
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