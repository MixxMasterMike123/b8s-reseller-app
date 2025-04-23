import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useOrder } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import OrderStatusMenu from '../components/OrderStatusMenu';
import ProductMenu from '../components/ProductMenu';

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

const OrderDetailPage = () => {
  const params = useParams();
  const orderId = params.orderId || params.id; // Support both route parameter names
  const navigate = useNavigate();
  const { getOrderById, cancelOrder, updateOrderStatus, error: orderError } = useOrder();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Memoize the fetch function to avoid dependency changes
  const fetchOrder = useCallback(async () => {
    if (!orderId || fetchAttempted) return;
    
    try {
      setLoading(true);
      console.log('Fetching order with ID:', orderId);
      const orderData = await getOrderById(orderId);
      
      if (!orderData) {
        setError(orderError || 'Beställningen hittades inte');
        toast.error('Beställningen hittades inte');
        return;
      }
      
      setOrder(orderData);
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Kunde inte hämta beställningsdetaljer');
      toast.error('Kunde inte hämta beställningsdetaljer');
    } finally {
      setLoading(false);
      setFetchAttempted(true);
    }
  }, [orderId, getOrderById, orderError]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
      if (!date) return 'Okänt datum';
      
      const jsDate = getOrderDate(date);
      if (!jsDate) return 'Okänt datum';
      
      return format(jsDate, 'PPP', { locale: sv });
    } catch (err) {
      console.error('Error formatting date:', err, date);
      return 'Felaktigt datum';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'Väntar på bekräftelse', color: 'bg-yellow-100 text-yellow-800' };
      case 'confirmed':
        return { text: 'Bekräftad', color: 'bg-blue-100 text-blue-800' };
      case 'processing':
        return { text: 'Under behandling', color: 'bg-purple-100 text-purple-800' };
      case 'shipped':
        return { text: 'Skickad', color: 'bg-indigo-100 text-indigo-800' };
      case 'delivered':
        return { text: 'Levererad', color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: 'Avbruten', color: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Okänd status', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Är du säker på att du vill avbryta denna beställning?')) {
      setCancelLoading(true);
      try {
        await cancelOrder(orderId);
        
        // Fetch the updated order directly
        const updatedOrder = await getOrderById(orderId);
        if (updatedOrder) {
          setOrder(updatedOrder);
          toast.success('Beställningen har avbrutits');
        }
      } catch (err) {
        console.error('Error cancelling order:', err);
        toast.error('Kunde inte avbryta beställningen');
      } finally {
        setCancelLoading(false);
      }
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === order.status) {
      return;
    }
    
    setUpdateStatusLoading(true);
    try {
      await updateOrderStatus(orderId, newStatus);
      
      // Fetch the updated order directly
      const updatedOrder = await getOrderById(orderId);
      if (updatedOrder) {
        setOrder(updatedOrder);
        toast.success(`Orderstatus uppdaterad till ${getStatusInfo(newStatus).text}`);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Kunde inte uppdatera orderstatus: ' + (err.message || ''));
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const handleRetry = () => {
    setFetchAttempted(false);
    setError(null);
    fetchOrder();
  };

  const canCancel = order?.status === 'pending' || order?.status === 'confirmed';

  // Define orderProducts based on the order data
  const orderProducts = order ? [
    {
      id: 'b8shield-base',
      name: 'B8 Shield',
      description: 'B8 Shield protection for smartphones',
      basePrice: order.prisInfo?.produktPris || 71.2,
      isActive: true
    }
  ] : [];

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Hämtar beställningsdetaljer...</p>
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
            <h2 className="text-xl font-medium text-gray-700 mb-2">Ett fel uppstod</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Försök igen
              </button>
              <Link
                to="/orders"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tillbaka till orderlistan
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
            <h2 className="text-xl font-medium text-gray-700 mb-2">Beställningen hittades inte</h2>
            <Link
              to="/orders"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Tillbaka till orderlistan
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
              <Link to="/orders" className="text-blue-600 hover:text-blue-800 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Orderdetaljer</h1>
            </div>
            <p className="text-gray-600">Ordernummer: <span className="font-semibold">{order.orderNumber}</span></p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center flex-wrap gap-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor} mr-2`}>
              {statusText}
            </span>
            
            {isAdmin && order.status !== 'cancelled' && (
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
            )}
            
            {canCancel && !isAdmin && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? 'Avbryter...' : 'Avbryt beställning'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Orderinformation</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Datum:</span> {formatDate(order.createdAt)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Status:</span> {statusText}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Betalningssätt:</span> {order.paymentMethod || 'Faktura'}
              </p>
              {order.deliveryMethod && (
                <p className="text-gray-700">
                  <span className="font-medium">Leveranssätt:</span> {order.deliveryMethod}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Leveransadress</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Företag:</span> {order.companyName || 'Ej angett'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Kontaktperson:</span> {order.contactName || 'Ej angett'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Adress:</span> {order.address || 'Ej angett'}
              </p>
              {order.postalCode && order.city && (
                <p className="text-gray-700">
                  <span className="font-medium">Postnummer & Ort:</span> {order.postalCode}, {order.city}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Orderdetaljer</h2>
          <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produkt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Färg</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storlek</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Antal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
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
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">Delsumma:</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.prisInfo?.produktPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-medium">Moms (25%):</td>
                  <td className="px-4 py-4 text-sm text-gray-700 text-right">
                    {order.prisInfo?.moms?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-right font-bold">Totalt:</td>
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
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Anteckningar</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{order.note}</p>
            </div>
          </div>
        )}

        {/* Status History Section */}
        {isAdmin && order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Statushistorik</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <li key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Status ändrad från </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.from).color}`}>
                          {getStatusInfo(history.from).text}
                        </span>
                        <span className="font-medium"> till </span>
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
                        Av: {history.displayName}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Produkter</h2>
          <div className="mb-4">
            <ProductMenu 
              products={orderProducts} 
              selectedProduct={null} 
              onProductSelect={(product) => {
                // Just view product details in read-only mode
                toast.success(`Visning av ${product.name}`);
              }} 
            />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Produktinformation</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Produkt:</span> {order.productName || 'Ej angett'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Färg:</span> {order.color || 'Ej angett'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Storlek:</span> {order.size || 'Ej angett'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Antal:</span> {order.quantity || 'Ej angett'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Link
            to="/orders"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Tillbaka till orderlistan
          </Link>
          {order.status === 'pending' && (
            <Link
              to={`/orders/${orderId}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Redigera beställning
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetailPage; 