import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import OrderStatusMenu from '../../components/OrderStatusMenu';
import { toast } from 'react-hot-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { parseReferrer, getReferrerCategory } from '../../utils/referrerParser';
import { printMultipleShippingLabels } from '../../utils/labelPrinter';
import { formatPaymentMethodName, getPaymentMethodBadgeClasses } from '../../utils/paymentMethods';
import { exportOrdersToCSV } from '../../utils/orderExport';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';


const getStatusStyles = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'; // Waiting for confirmation
    case 'confirmed':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'; // Confirmed
    case 'processing':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'; // Processing
    case 'shipped':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'; // Shipped - GREEN for quick visual identification
    case 'delivered':
      return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300'; // Delivered - Darker green
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'; // Cancelled
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'; // Unknown status
  }
};

const AdminOrders = () => {
  const { getAllOrders, updateOrderStatus, loading: contextLoading, error: contextError } = useOrder();
  const [affiliateClicks, setAffiliateClicks] = useState({});
  const [clicksLoading, setClicksLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [printLoading, setPrintLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch affiliate click data for orders with affiliate information
  const fetchAffiliateClicks = async (orders) => {
    if (!orders || orders.length === 0) return;
    
    setClicksLoading(true);
    try {
      // Get all unique affiliate click IDs from orders
      const clickIds = [];
      orders.forEach(order => {
        if (order.affiliateClickId) {
          clickIds.push(order.affiliateClickId);
        }
        if (order.affiliate?.clickId) {
          clickIds.push(order.affiliate.clickId);
        }
      });

      if (clickIds.length === 0) {
        setClicksLoading(false);
        return;
      }

      // Fetch affiliate clicks in batches (Firestore 'in' query limit is 10)
      const clickData = {};
      const batchSize = 10;
      
      for (let i = 0; i < clickIds.length; i += batchSize) {
        const batch = clickIds.slice(i, i + batchSize);
        const clicksQuery = query(
          collection(db, 'affiliateClicks'),
          where('__name__', 'in', batch)
        );
        
        const clicksSnapshot = await getDocs(clicksQuery);
        clicksSnapshot.docs.forEach(doc => {
          clickData[doc.id] = { id: doc.id, ...doc.data() };
        });
      }

      setAffiliateClicks(clickData);
    } catch (error) {
      console.error('Error fetching affiliate clicks:', error);
    } finally {
      setClicksLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Väntar';
      case 'confirmed':
        return 'Bekräftad';
      case 'processing':
        return 'Behandlas';
      case 'shipped':
        return 'Skickad';
      case 'delivered':
        return 'Levererad';
      case 'cancelled':
        return 'Avbruten';
      default:
        return 'Okänd';
    }
  };
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSourceTab, setActiveSourceTab] = useState('all'); // 'all', 'b2b', 'b2c'
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  // Handle export orders to CSV
  const handleExportOrders = async () => {
    try {
      setExportLoading(true);
      
      // Export filtered orders (respects current filters)
      const ordersToExport = sortedOrders.length > 0 ? sortedOrders : orders;
      
      if (ordersToExport.length === 0) {
        toast.error('Inga ordrar att exportera');
        return;
      }

      const result = exportOrdersToCSV(ordersToExport);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error('Kunde inte exportera ordrar');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const fetchedOrders = await getAllOrders();
        setOrders(fetchedOrders);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [getAllOrders]);

  // Fetch affiliate click data when orders change
  useEffect(() => {
    if (orders && orders.length > 0) {
      fetchAffiliateClicks(orders);
    }
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) {
      return [];
    }

    // 1. Filter by Source
    let sourceFiltered = orders;
    if (activeSourceTab === 'b2b') {
      sourceFiltered = orders.filter(order => order.source === 'b2b' || !order.source); // !order.source for legacy B2B
    } else if (activeSourceTab === 'b2c') {
      sourceFiltered = orders.filter(order => order.source === 'b2c');
    }
    
    // 2. Filter by Status
    let statusFiltered = sourceFiltered;
    if (activeStatusTab !== 'all') {
      statusFiltered = sourceFiltered.filter(order => order.status === activeStatusTab);
    }

    // 3. Filter by Search Term
    if (!searchTerm) {
      return statusFiltered;
    }

    return statusFiltered.filter(order =>
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.userId && order.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.email && order.customerInfo.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.firstName && order.customerInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.lastName && order.customerInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.companyName && order.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm, activeSourceTab, activeStatusTab]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  }, [filteredOrders]);
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(jsDate.getTime())) {
        return 'Ogiltigt datum';
      }
      return format(jsDate, 'PPP p', { locale: sv });
    } catch (error) {
      console.error("Failed to format date:", date, error);
      return 'Datumfel';
    }
  };
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setLoading(true);
      await updateOrderStatus(orderId, newStatus);
      
      // Fetch all orders again to update the list
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders);
      
      // Show success message
      toast.success('Orderstatus uppdaterad');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Kunde inte uppdatera orderstatus');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelection = (orderId, isSelected) => {
    const newSelection = new Set(selectedOrders);
    if (isSelected) {
      newSelection.add(orderId);
    } else {
      newSelection.delete(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handlePrintSelectedLabels = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Välj minst en beställning för att skriva ut etiketter');
      return;
    }

    try {
      setPrintLoading(true);
      
      // Get selected orders
      const ordersToProcess = filteredOrders.filter(order => selectedOrders.has(order.id));
      
      // Create user data map for B2B orders (simplified - would need proper user fetching)
      const userDataMap = {};
      for (const order of ordersToProcess) {
        if (order.userId && order.source !== 'b2c') {
          userDataMap[order.userId] = {
            contactPerson: 'Kund', // Simplified - would fetch from user data
            companyName: 'Företag',
            deliveryAddress: 'Leveransadress saknas',
            deliveryPostalCode: '',
            deliveryCity: '',
            deliveryCountry: 'SE'
          };
        }
      }
      
      console.log('🏷️ Printing labels for', ordersToProcess.length, 'orders');
      
      await printMultipleShippingLabels(ordersToProcess, userDataMap);
      
      toast.success(`${ordersToProcess.length} fraktetiketter skickade till skrivare!`);
      
      // Clear selection after printing
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('❌ Failed to print labels:', error);
      toast.error(`Kunde inte skriva ut etiketter: ${error.message}`);
    } finally {
      setPrintLoading(false);
    }
  };

  const TabButton = ({ tabName, label, activeTab, setActiveTab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );

  const sourceTabs = [
    { key: 'all', label: 'Alla Källor' },
    { key: 'b2b', label: 'Återförsäljare (B2B)' },
    { key: 'b2c', label: 'Kunder (B2C)' },
  ];

  const statusTabs = [
    { key: 'all', label: 'Alla' },
    { key: 'pending', label: 'Väntar' },
    { key: 'processing', label: 'Behandlas' },
    { key: 'shipped', label: 'Skickad' },
    { key: 'delivered', label: 'Levererad' },
    { key: 'cancelled', label: 'Avbruten' },
  ];

  const currentError = error || contextError;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Orderhantering</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Sök på ordernr, kundinfo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            />
            <button
              onClick={handleExportOrders}
              disabled={exportLoading || loading || orders.length === 0}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporterar...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Exportera CSV
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
             <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-2">Källa:</span>
            {sourceTabs.map(tab => (
              <TabButton
                key={tab.key}
                tabName={tab.key}
                label={tab.label}
                activeTab={activeSourceTab}
                setActiveTab={setActiveSourceTab}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-2">Status:</span>
            {statusTabs.map(tab => (
              <TabButton
                key={tab.key}
                tabName={tab.key}
                label={tab.label}
                activeTab={activeStatusTab}
                setActiveTab={setActiveStatusTab}
              />
            ))}
          </div>
        </div>

        {loading || contextLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <span className="ml-3 text-blue-600 dark:text-blue-400">Laddar ordrar...</span>
          </div>
        ) : currentError ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">Fel vid laddning av ordrar: {currentError}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order & Kund
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Datum & Belopp
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trafikkälla
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status & Åtgärd
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {/* Column 1: Order & Customer */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              order.source === 'b2c' 
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700'
                                : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700'
                            }`}>
                              <span className={`text-sm font-medium ${
                                order.source === 'b2c' ? 'text-purple-800 dark:text-purple-200' : 'text-blue-800 dark:text-blue-200'
                              }`}>
                                {order.source === 'b2c' ? 'B2C' : 'B2B'}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                                {order.orderNumber || order.id}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                order.source === 'b2c' 
                                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                              }`}>
                                {order.source === 'b2c' ? 'Kund' : 'Återförsäljare'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                              {order.companyName || `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'Gäst'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {/* B2C orders have customerInfo.email, B2B orders have userEmail or need lookup via userId */}
                              {order.source === 'b2c' 
                                ? (order.customerInfo?.email || 'Ingen e-post')
                                : (order.userEmail || 'B2B kund - se detaljer')
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date & Amount */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Datum:</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Belopp:</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {new Intl.NumberFormat('sv-SE', { 
                                style: 'currency', 
                                currency: 'SEK',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(
                                order.source === 'b2c' 
                                  ? (order.total || 0)
                                  : (order.prisInfo?.totalPris || order.totalAmount || 0)
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Traffic Source */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-1">
                          {/* Source Type */}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              order.source === 'b2c' 
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                            }`}>
                              {order.source === 'b2c' ? 'B2C' : 'B2B'}
                            </span>
                          </div>
                          
                          {/* Affiliate Info */}
                          {(order.affiliateCode || order.affiliate?.code) && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Affiliate:</span> {order.affiliateCode || order.affiliate?.code}
                            </div>
                          )}
                          
                          {/* Referrer Information */}
                          {(() => {
                            const clickId = order.affiliateClickId || order.affiliate?.clickId;
                            const clickData = clickId ? affiliateClicks[clickId] : null;
                            
                            if (clicksLoading && clickId) {
                              return (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  Laddar referrer...
                                </div>
                              );
                            }
                            
                            if (clickData && clickData.landingPage && clickData.landingPage !== 'unknown') {
                              const referrer = parseReferrer(clickData.landingPage);
                              const category = getReferrerCategory(referrer.category);
                              
                              // Map category colors to actual Tailwind classes with dark mode
                              const categoryStyles = {
                                purple: 'text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-900',
                                blue: 'text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900', 
                                green: 'text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900',
                                red: 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900',
                                teal: 'text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900',
                                gray: 'text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-700',
                                indigo: 'text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900'
                              };
                              
                              return (
                                <div className="text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${categoryStyles[category.color] || categoryStyles.gray}`}>
                                    {referrer.name}
                                  </span>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                          
                          {/* Payment Method */}
                          <div className="text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium text-xs ${
                              order.source === 'b2c' 
                                ? getPaymentMethodBadgeClasses(order.payment)
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {order.source === 'b2c' 
                                ? formatPaymentMethodName(order.payment)
                                : 'B2B Order'
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Status & Action */}
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-3">
                          <div className="w-full max-w-[120px]">
                            <OrderStatusMenu 
                              currentStatus={order.status}
                              onStatusChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                              disabled={loading}
                            />
                          </div>
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded transition-colors"
                          >
                            Hantera
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {activeSourceTab === 'b2b' && sortedOrders.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                    <tr>
                      <td className="px-4 md:px-6 py-4 text-right text-gray-700 dark:text-gray-300">Totalsumma:</td>
                      <td className="px-4 md:px-6 py-4 text-gray-900 dark:text-gray-100">
                        <div className="text-sm font-medium">
                          {new Intl.NumberFormat('sv-SE', { 
                            style: 'currency', 
                            currency: 'SEK' 
                          }).format(
                            sortedOrders.reduce((sum, order) => {
                              const total = order.prisInfo?.totalPris || order.totalAmount || order.total || 0;
                              return sum + total;
                            }, 0)
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminOrders;