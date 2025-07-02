import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import OrderStatusMenu from '../../components/OrderStatusMenu';
import { toast } from 'react-hot-toast';

const getStatusStyles = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'; // Waiting for confirmation
    case 'confirmed':
      return 'bg-blue-100 text-blue-800'; // Confirmed
    case 'processing':
      return 'bg-purple-100 text-purple-800'; // Processing
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800'; // Shipped
    case 'delivered':
      return 'bg-green-100 text-green-800'; // Delivered
    case 'cancelled':
      return 'bg-red-100 text-red-800'; // Cancelled
    default:
      return 'bg-gray-100 text-gray-800'; // Unknown status
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

const AdminOrders = () => {
  const { getAllOrders, updateOrderStatus, loading: contextLoading, error: contextError } = useOrder();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSourceTab, setActiveSourceTab] = useState('all'); // 'all', 'b2b', 'b2c'
  const [activeStatusTab, setActiveStatusTab] = useState('all');

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

  const TabButton = ({ tabName, label, activeTab, setActiveTab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow'
          : 'text-gray-600 hover:bg-gray-200'
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
          <h1 className="text-3xl font-bold text-gray-900">Orderhantering</h1>
          <input
            type="text"
            placeholder="Sök på ordernr, kundinfo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
             <span className="text-sm font-semibold text-gray-600 mr-2">Källa:</span>
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
            <span className="text-sm font-semibold text-gray-600 mr-2">Status:</span>
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
          <p>Laddar ordrar...</p>
        ) : currentError ? (
          <p className="text-red-500">Fel vid laddning av ordrar: {currentError}</p>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order & Kund
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum & Belopp
                    </th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Åtgärd
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      {/* Column 1: Order & Customer */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              order.source === 'b2c' 
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200'
                                : 'bg-gradient-to-br from-blue-100 to-blue-200'
                            }`}>
                              <span className={`text-sm font-medium ${
                                order.source === 'b2c' ? 'text-purple-800' : 'text-blue-800'
                              }`}>
                                {order.source === 'b2c' ? 'B2C' : 'B2B'}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono font-medium text-gray-900">
                                {order.orderNumber || order.id}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                order.source === 'b2c' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {order.source === 'b2c' ? 'Kund' : 'Återförsäljare'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 mb-1">
                              {order.companyName || `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'Gäst'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.customerInfo?.email || 'Ingen e-post'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Date & Amount */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Datum:</div>
                            <div className="text-sm text-gray-900">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Belopp:</div>
                            <div className="text-sm font-medium text-gray-900">
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

                      {/* Column 3: Status & Action */}
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
                            className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                          >
                            Hantera
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {activeSourceTab === 'b2b' && sortedOrders.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 md:px-6 py-4 text-right text-gray-700">Totalsumma:</td>
                      <td className="px-4 md:px-6 py-4 text-gray-900">
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