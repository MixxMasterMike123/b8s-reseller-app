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

  const handlePrint = () => {
    window.print();
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
      <div className="max-w-6xl mx-auto print:max-w-none print:mx-0">
        <div className="p-4">
          {/* Print title - only visible when printing */}
          <div className="hidden print:block print:mb-8">
            <h1 className="text-2xl font-bold text-center">{order.id}</h1>
          </div>

          {/* Regular view content - hidden during print */}
          <div className="print:hidden flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Orderdetaljer</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/admin/orders')}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Tillbaka
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-md"
              >
                Skriv ut
              </button>
            </div>
          </div>

          {/* Main content - this is what gets printed */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Orderinformation</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">Order ID:</span> {order.id}</p>
                  <p><span className="font-medium">Datum:</span> {format(new Date(order.createdAt), 'PPP', { locale: sv })}</p>
                  <p><span className="font-medium">Status:</span> <span className="print:inline-block"><OrderStatusMenu
                    currentStatus={order.status}
                    onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                    disabled={loading}
                  /></span></p>
                  <p><span className="font-medium">Totalt belopp:</span> {order.totalAmount} kr</p>
                </div>
              </div>

              {order.user && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Kundinformation</h2>
                  <div className="space-y-2">
                    <p><span className="font-medium">Företag:</span> {order.user.companyName}</p>
                    <p><span className="font-medium">Kontaktperson:</span> {order.user.contactPerson}</p>
                    <p><span className="font-medium">Email:</span> {order.user.email}</p>
                    <p><span className="font-medium">Telefon:</span> {order.user.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Produkter</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Antal</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totalt</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.price} kr</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity * item.price} kr</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-sm font-medium text-right">Totalt:</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">{order.totalAmount} kr</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="mt-8 print:hidden">
                <h2 className="text-lg font-semibold mb-4">Statushistorik</h2>
                <div className="space-y-2">
                  {order.statusHistory.map((status, index) => (
                    <p key={index} className="text-sm">
                      {format(new Date(status.changedAt), 'Pp', { locale: sv })} - 
                      Ändrad från <span className="font-medium">{status.from}</span> till <span className="font-medium">{status.to}</span>
                      {status.changedBy && <span> av {status.displayName}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminOrderDetail; 