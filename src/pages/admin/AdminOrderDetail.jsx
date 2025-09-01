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
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { printShippingLabel } from '../../utils/labelPrinter';
import LabelPrintInstructions from '../../components/LabelPrintInstructions';
import LabelOrientationSelector from '../../components/LabelOrientationSelector';

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
  const [printLoading, setPrintLoading] = useState(false);
  const { getContentValue } = useContentTranslation();

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
    company: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'Not specified',
    contactPerson: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'Not specified',
    address: (() => {
      // B2C orders store address in shippingInfo
      if (order.shippingInfo) {
        const addressParts = [
          order.shippingInfo.address,
          order.shippingInfo.apartment && order.shippingInfo.apartment.trim() ? order.shippingInfo.apartment : null,
          `${order.shippingInfo.postalCode} ${order.shippingInfo.city}`.trim(),
          order.shippingInfo.country === 'SE' ? 'Sverige' : order.shippingInfo.country
        ].filter(Boolean);
        
        if (addressParts.length > 0) {
          return addressParts.join(', ');
        }
      }
      
      return 'Address information missing';
    })()
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
      
      return format(jsDate, 'PPP p', { locale: sv });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date formatting error';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'Väntar', color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' };
      case 'confirmed':
        return { text: 'Bekräftad', color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' };
      case 'processing':
        return { text: 'Behandlas', color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300' };
      case 'shipped':
        return { text: 'Skickad', color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300' };
      case 'delivered':
        return { text: 'Levererad', color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' };
      case 'cancelled':
        return { text: 'Avbruten', color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' };
      default:
        return { text: status || 'Unknown', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' };
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdateStatusLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      
      // Refresh order data
      setFetchAttempted(false);
      await fetchOrder();
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status: ' + (err.message || ''));
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

  const handlePrintLabel = async (orientation = null) => {
    try {
      setPrintLoading(true);
      
      console.log('🏷️ Printing shipping label for order:', order.orderNumber || order.id);
      
      // Print the label with specified orientation
      const labelData = await printShippingLabel(order, userData, orientation);
      
      const orientationText = labelData.orientation === 'portrait' ? 'stående' : 'liggande';
      const detectionText = labelData.autoDetected ? 'auto-vald' : 'manuellt vald';
      
      toast.success(`Utskriftsdialog öppnad! Format: ${orientationText} (${detectionText})`);
    } catch (error) {
      console.error('❌ Failed to print label:', error);
      toast.error(`Kunde inte skriva ut etikett: ${error.message}`);
    } finally {
      setPrintLoading(false);
    }
  };



  // Simple print functionality that actually works
  const handlePrint = () => {
    // Create a simple print window with order data
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Basic HTML template
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order_${order.orderNumber || order.id}_B8Shield</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
          .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">B8Shield Order Details</div>
          <div>Order Number: <strong>${order.orderNumber || order.id}</strong></div>
        </div>

        <div class="section">
          <div class="section-title">Customer Information</div>
          <p><strong>Company:</strong> ${displayUser.companyName}</p>
          <p><strong>Contact:</strong> ${displayUser.contactPerson}</p>
          <p><strong>Email:</strong> ${displayUser.email}</p>
          <p><strong>Role:</strong> ${displayUser.role}</p>
        </div>

        <div class="section">
          <div class="section-title">Order Information</div>
          <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
          <p><strong>Status:</strong> ${statusText}</p>
          <p><strong>Payment Method:</strong> ${order.payment?.method === 'stripe' ? 'Stripe (Card)' : order.paymentMethod || 'Invoice'}</p>
          ${order.source ? `<p><strong>Source:</strong> ${order.source === 'b2c' ? 'B2C Shop' : 'B2B Portal'}</p>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Delivery Address</div>
          <p><strong>Company:</strong> ${displayAddress.company}</p>
          <p><strong>Contact:</strong> ${displayAddress.contactPerson}</p>
          <p><strong>Address:</strong> ${displayAddress.address}</p>
        </div>

        <div class="section">
          <div class="section-title">Order Items</div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Color</th>
                <th>Size</th>
                <th>Quantity</th>
                <th class="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items && order.items.length > 0 ? order.items : getOrderDistribution(order)).map(item => `
                <tr>
                  <td>${item.name || 'B8 Shield'}</td>
                  <td>${item.color || '-'}</td>
                  <td>${item.size || '-'}</td>
                  <td>${item.quantity} st</td>
                  <td class="text-right">${item.price ? item.price.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) + ' kr' : (order.prisInfo?.produktPris ? order.prisInfo.produktPris.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) + ' kr' : '')}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="text-right font-bold">Total:</td>
                <td class="text-right font-bold">${(order.total || order.prisInfo?.totalPris || 0).toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${order.note ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <p>${order.note}</p>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for window to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
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
        <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="py-12 text-center">
            <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Order not found</h2>
            <Link
              to="/admin/orders"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }



  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Header Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link to="/admin/orders" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2 inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">B8Shield Order Details</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Order Number: <span className="font-semibold">{order.orderNumber}</span></p>
            </div>
            <div className="flex items-center gap-2">
              {updateStatusLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 dark:border-blue-400 border-r-transparent"></div>
              ) : (
                <OrderStatusMenu 
                  currentStatus={order.status} 
                  onStatusChange={handleStatusUpdate} 
                />
              )}
              <button
                onClick={handlePrint}
                className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Print
              </button>
              {printLoading ? (
                <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                  Öppnar utskriftsdialog...
                </div>
              ) : (
                <LabelOrientationSelector 
                  order={order}
                  userData={userData}
                  onPrint={handlePrintLabel}
                />
              )}
              <LabelPrintInstructions />
              <button
                onClick={handleDeleteOrder}
                disabled={deleteLoading}
                className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>

        {/* User Information - Enhanced with user profile data */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">User ID:</span> {order.userId || 'Not available'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Company/Name:</span> {displayUser.companyName}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Contact Person:</span> {displayUser.contactPerson}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Role:</span> {displayUser.role}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Account Status:</span>{' '}
                <span className={`px-2 py-0.5 text-xs rounded-full ${displayUser.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'}`}>
                  {displayUser.active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Email:</span> {displayUser.email}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Phone:</span> {displayUser.phone}
              </p>
              {userData && (
                <>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Account Created:</span> {userData.createdAt ? formatDate(userData.createdAt) : 'Unknown'}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Last Updated:</span> {userData.updatedAt ? formatDate(userData.updatedAt) : 'Unknown'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Order Information</h2>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Date:</span> {formatDate(order.createdAt)}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Status:</span> {statusText}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Payment Method:</span> {order.payment?.method === 'stripe' ? 'Stripe (Card)' : order.paymentMethod || 'Invoice'}
              </p>
              {order.deliveryMethod && (
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Delivery Method:</span> {order.deliveryMethod}
                </p>
              )}
              {order.source && (
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Order Source:</span>{' '}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${order.source === 'b2c' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'}`}>
                    {order.source === 'b2c' ? 'B2C Shop' : 'B2B Portal'}
                  </span>
                </p>
              )}
              {order.source === 'b2c' && order.affiliateCode && (
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">REF Code:</span>{' '}
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                    {order.affiliateCode}
                  </span>
                  {order.affiliateDiscount && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({order.affiliateDiscount.percentage}% rabatt)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Delivery Address</h2>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Name/Company:</span> {displayAddress.company}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Contact Person:</span> {displayAddress.contactPerson}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Address:</span> {displayAddress.address}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Order Items</h2>
          <div className="shadow-sm overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Color
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price per item
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(order.items && order.items.length > 0 ? order.items : getOrderDistribution(order)).map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {getContentValue(item.name) || 'B8 Shield'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getContentValue(item.color)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getContentValue(item.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity} st
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {item.price?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {(item.price * item.quantity).toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium text-gray-800 dark:text-gray-200">Subtotal:</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">
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
                    <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium text-green-600 dark:text-green-400">
                      {(() => {
                        // Handle different affiliate data structures
                        const affiliateCode = order.affiliateCode || order.affiliate?.code || 'AFFILIATE';
                        const discountPercentage = order.discountPercentage || order.affiliate?.discountPercentage || order.affiliateDiscount?.percentage || 0;
                        return `Affiliate rabatt (${affiliateCode}), ${discountPercentage}%:`;
                      })()}
                    </td>
                    <td className="px-4 py-4 text-sm text-green-600 dark:text-green-400 text-right">
                      - {order.discountAmount?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                  </tr>
                )}
                {order.source === 'b2c' && order.shipping > 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium text-gray-800 dark:text-gray-200">Shipping:</td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">
                      {order.shipping.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium text-gray-800 dark:text-gray-200">VAT (25%):</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 text-right">
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
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-bold text-gray-800 dark:text-gray-100">Total:</td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-800 dark:text-gray-100 text-right">
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
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Notes</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">{order.note}</p>
            </div>
          </div>
        )}

        {/* Status History Section */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Status History</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <ul className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <li key={index} className="border-b border-gray-200 dark:border-gray-600 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">Status changed from </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.from).color}`}>
                          {getStatusInfo(history.from).text}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200"> to </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.to).color}`}>
                          {getStatusInfo(history.to).text}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {history.changedAt ? formatDate(history.changedAt) : 'N/A'}
                      </div>
                    </div>
                    {history.displayName && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Back to Order List
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminOrderDetail; 