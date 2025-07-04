import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useOrder } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import AppLayout from '../components/layout/AppLayout';
import OrderStatusMenu from '../components/OrderStatusMenu';
import ProductMenu from '../components/ProductMenu';

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

const OrderDetailPage = () => {
  const params = useParams();
  const orderId = params.orderId || params.id; // Support both route parameter names
  const navigate = useNavigate();
  const { getOrderById, cancelOrder, updateOrderStatus, error: orderError } = useOrder();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
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
        setError(orderError || t('order_detail.order_not_found', 'Beställningen hittades inte'));
        toast.error(t('order_detail.order_not_found', 'Beställningen hittades inte'));
        return;
      }
      
      setOrder(orderData);
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(t('order_detail.fetch_error', 'Kunde inte hämta beställningsdetaljer'));
      toast.error(t('order_detail.fetch_error', 'Kunde inte hämta beställningsdetaljer'));
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
      if (!date) return t('order_detail.unknown_date', 'Okänt datum');
      
      const jsDate = getOrderDate(date);
      if (!jsDate) return t('order_detail.unknown_date', 'Okänt datum');
      
      return format(jsDate, 'PPP', { locale: sv });
    } catch (err) {
      console.error('Error formatting date:', err, date);
      return t('order_detail.invalid_date', 'Felaktigt datum');
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { text: t('order_detail.status.pending', 'Väntar på bekräftelse'), color: 'bg-yellow-100 text-yellow-800' };
      case 'confirmed':
        return { text: t('order_detail.status.confirmed', 'Bekräftad'), color: 'bg-blue-100 text-blue-800' };
      case 'processing':
        return { text: t('order_detail.status.processing', 'Under behandling'), color: 'bg-purple-100 text-purple-800' };
      case 'shipped':
        return { text: t('order_detail.status.shipped', 'Skickad'), color: 'bg-indigo-100 text-indigo-800' };
      case 'delivered':
        return { text: t('order_detail.status.delivered', 'Levererad'), color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: t('order_detail.status.cancelled', 'Avbruten'), color: 'bg-red-100 text-red-800' };
      default:
        return { text: t('order_detail.status.unknown', 'Okänd status'), color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm(t('order_detail.cancel_confirm', 'Är du säker på att du vill avbryta denna beställning?'))) {
      setCancelLoading(true);
      try {
        await cancelOrder(orderId);
        
        // Fetch the updated order directly
        const updatedOrder = await getOrderById(orderId);
        if (updatedOrder) {
          setOrder(updatedOrder);
          toast.success(t('order_detail.cancel_success', 'Beställningen har avbrutits'));
        }
      } catch (err) {
        console.error('Error cancelling order:', err);
        toast.error(t('order_detail.cancel_error', 'Kunde inte avbryta beställningen'));
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
        toast.success(t('order_detail.status_updated', 'Orderstatus uppdaterad till {{status}}', { status: getStatusInfo(newStatus).text }));
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error(t('order_detail.status_update_error', 'Kunde inte uppdatera orderstatus: {{error}}', { error: err.message || '' }));
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
            <p className="mt-2 text-gray-600">{t('order_detail.loading', 'Hämtar beställningsdetaljer...')}</p>
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
            <h2 className="text-xl font-medium text-gray-700 mb-2">{t('order_detail.error_occurred', 'Ett fel uppstod')}</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('order_detail.try_again', 'Försök igen')}
              </button>
              <Link
                to="/orders"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('order_detail.back_to_orders', 'Tillbaka till orderlistan')}
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
            <h2 className="text-xl font-medium text-gray-700 mb-2">{t('order_detail.order_not_found', 'Beställningen hittades inte')}</h2>
            <Link
              to="/orders"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('order_detail.back_to_orders', 'Tillbaka till orderlistan')}
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { text: statusText, color: statusColor } = getStatusInfo(order.status);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-2">
              <Link to="/orders" className="text-blue-600 hover:text-blue-800 mr-2 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate">{t('order_detail.title', 'Orderdetaljer')}</h1>
            </div>
            <p className="text-sm md:text-base text-gray-600">
              {t('order_detail.order_number', 'Ordernummer')}: <span className="font-semibold">{order.orderNumber}</span>
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <span className={`inline-flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium ${statusColor}`}>
              {statusText}
            </span>
            
            {isAdmin && order.status !== 'cancelled' && (
              <div className="flex items-center justify-center">
                {updateStatusLoading ? (
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
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
                className="w-full md:w-auto bg-red-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
              >
                {cancelLoading ? t('order_detail.cancelling', 'Avbryter...') : t('order_detail.cancel_order', 'Avbryt beställning')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-gray-50 p-4 md:p-4 rounded-lg">
            <h2 className="text-base md:text-lg font-semibold mb-3 text-gray-800">{t('order_detail.order_information', 'Orderinformation')}</h2>
            <div className="space-y-2 md:space-y-2">
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.date', 'Datum')}:</span> {formatDate(order.createdAt)}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.status', 'Status')}:</span> {statusText}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.payment_method', 'Betalningssätt')}:</span> {order.paymentMethod || t('order_detail.invoice', 'Faktura')}
              </p>
              {order.deliveryMethod && (
                <p className="text-sm md:text-base text-gray-700">
                  <span className="font-medium">{t('order_detail.delivery_method', 'Leveranssätt')}:</span> {order.deliveryMethod}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 md:p-4 rounded-lg">
            <h2 className="text-base md:text-lg font-semibold mb-3 text-gray-800">{t('order_detail.delivery_address', 'Leveransadress')}</h2>
            <div className="space-y-2 md:space-y-2">
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.company', 'Företag')}:</span> {order.companyName || t('order_detail.not_specified', 'Ej angett')}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.contact_person', 'Kontaktperson')}:</span> {order.contactName || t('order_detail.not_specified', 'Ej angett')}
              </p>
              <p className="text-sm md:text-base text-gray-700">
                <span className="font-medium">{t('order_detail.address', 'Adress')}:</span> {order.address || t('order_detail.not_specified', 'Ej angett')}
              </p>
              {order.postalCode && order.city && (
                <p className="text-sm md:text-base text-gray-700">
                  <span className="font-medium">{t('order_detail.postal_code_city', 'Postnummer & Ort')}:</span> {order.postalCode}, {order.city}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-semibold mb-4 text-gray-800">{t('order_detail.order_details', 'Orderdetaljer')}</h2>
          
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {order.items && order.items.length > 0 ? (
              // Modern order items (individual line items)
              order.items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
                    <span className="text-base font-bold text-gray-900">
                      {item.price?.toLocaleString('sv-SE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })} kr
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('order_detail.color', 'Färg')}</p>
                      <p className="text-sm font-medium text-gray-900">{item.color || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('order_detail.size', 'Storlek')}</p>
                      <p className="text-sm font-medium text-gray-900">{item.size || '-'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('order_detail.quantity', 'Antal')}</span>
                      <span className="text-base font-semibold text-gray-900">{item.quantity} {t('order_detail.pieces', 'st')}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Legacy order items (fallback for old orders)
              getOrderDistribution(order).map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 text-base">B8 Shield</h3>
                    {index === 0 && order.prisInfo?.produktPris && (
                      <span className="text-base font-bold text-gray-900">
                        {order.prisInfo.produktPris.toLocaleString('sv-SE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} kr
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('order_detail.color', 'Färg')}</p>
                      <p className="text-sm font-medium text-gray-900">{item.color}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{t('order_detail.size', 'Storlek')}</p>
                      <p className="text-sm font-medium text-gray-900">{item.size}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('order_detail.quantity', 'Antal')}</span>
                      <span className="text-base font-semibold text-gray-900">{item.quantity} {t('order_detail.pieces', 'st')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Mobile Pricing Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">{t('order_detail.price_summary', 'Prissummering')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('order_detail.subtotal', 'Delsumma')}:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {order.prisInfo?.produktPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('order_detail.vat', 'Moms')} (25%):</span>
                  <span className="text-sm font-medium text-gray-900">
                    {order.prisInfo?.moms?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="text-base font-bold text-gray-900">{t('order_detail.total', 'Totalt')}:</span>
                  <span className="text-base font-bold text-gray-900">
                    {order.prisInfo?.totalPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Optimized Table */}
          <div className="hidden md:block bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">{t('order_detail.table.product_details', 'Produkt & Detaljer')}</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">{t('order_detail.table.quantity', 'Antal')}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">{t('order_detail.table.price', 'Pris')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items && order.items.length > 0 ? (
                  // Modern order items (individual line items)
                  order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            {item.color && <span>{t('order_detail.color', 'Färg')}: {item.color}</span>}
                            {item.color && item.size && <span> • </span>}
                            {item.size && <span>{t('order_detail.size', 'Storlek')}: {item.size}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">{item.quantity} {t('order_detail.pieces', 'st')}</span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.price?.toLocaleString('sv-SE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} kr
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  // Legacy order items (fallback for old orders)
                  getOrderDistribution(order).map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-900">B8 Shield</div>
                          <div className="text-xs text-gray-600">
                            {t('order_detail.color', 'Färg')}: {item.color} • {t('order_detail.size', 'Storlek')}: {item.size}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="text-sm font-medium text-gray-900">{item.quantity} {t('order_detail.pieces', 'st')}</span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        {index === 0 && order.prisInfo?.produktPris && (
                          <span className="text-sm font-semibold text-gray-900">
                            {order.prisInfo.produktPris.toLocaleString('sv-SE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} kr
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="2" className="px-3 py-3 text-sm text-right font-medium">{t('order_detail.subtotal', 'Delsumma')}:</td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    {order.prisInfo?.produktPris?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr>
                  <td colSpan="2" className="px-3 py-3 text-sm text-right font-medium">{t('order_detail.vat', 'Moms')} (25%):</td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    {order.prisInfo?.moms?.toLocaleString('sv-SE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} kr
                  </td>
                </tr>
                <tr className="bg-gray-200">
                  <td colSpan="2" className="px-3 py-3 text-sm text-right font-bold">{t('order_detail.total', 'Totalt')}:</td>
                  <td className="px-3 py-3 text-sm font-bold text-gray-800 text-right">
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
            <h2 className="text-lg font-semibold mb-2 text-gray-800">{t('order_detail.notes', 'Anteckningar')}</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{order.note}</p>
            </div>
          </div>
        )}

        {/* Status History Section */}
        {isAdmin && order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">{t('order_detail.status_history', 'Statushistorik')}</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <li key={index} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{t('order_detail.status_changed_from', 'Status ändrad från')} </span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusInfo(history.from).color}`}>
                          {getStatusInfo(history.from).text}
                        </span>
                        <span className="font-medium"> {t('order_detail.to', 'till')} </span>
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
                        {t('order_detail.by', 'Av')}: {history.displayName}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">{t('order_detail.products', 'Produkter')}</h2>
          <div className="mb-4">
            <ProductMenu 
              products={orderProducts} 
              selectedProduct={null} 
              onProductSelect={(product) => {
                // Just view product details in read-only mode
                toast.success(t('order_detail.viewing_product', 'Visning av {{product}}', { product: product.name }));
              }} 
            />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">{t('order_detail.product_information', 'Produktinformation')}</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">{t('order_detail.product', 'Produkt')}:</span> {order.productName || t('order_detail.not_specified', 'Ej angett')}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">{t('order_detail.color', 'Färg')}:</span> {order.color || t('order_detail.not_specified', 'Ej angett')}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">{t('order_detail.size', 'Storlek')}:</span> {order.size || t('order_detail.not_specified', 'Ej angett')}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">{t('order_detail.quantity', 'Antal')}:</span> {order.quantity || t('order_detail.not_specified', 'Ej angett')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mt-8">
          <Link
            to="/orders"
            className="w-full md:w-auto inline-flex items-center justify-center px-4 py-3 md:py-2 border border-gray-300 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium min-h-[48px] md:min-h-0 text-base md:text-sm transition-colors"
          >
            {t('order_detail.back_to_orders', 'Tillbaka till orderlistan')}
          </Link>
          {order.status === 'pending' && (
            <Link
              to={`/orders/${orderId}/edit`}
              className="w-full md:w-auto inline-flex items-center justify-center bg-blue-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
            >
              {t('order_detail.edit_order', 'Redigera beställning')}
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetailPage; 