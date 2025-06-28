import React, { useState, useEffect, useMemo } from 'react';
import { useOrder } from '../../contexts/OrderContext';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AdminOrders = () => {
  const { orders, loading, error, getOrderById } = useOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('b2b'); // 'b2b' or 'b2c'

  const filteredOrders = useMemo(() => {
    // Guard against orders being undefined during initial load
    if (!Array.isArray(orders)) {
      return [];
    }

    let sourceFiltered = orders.filter(order => {
      if (activeTab === 'b2b') {
        // Show orders with source 'b2b' or those without a source property (legacy orders)
        return order.source === 'b2b' || !order.source;
      }
      return order.source === 'b2c';
    });

    if (!searchTerm) {
      return sourceFiltered;
    }

    return sourceFiltered.filter(order =>
      (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.userId && order.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.email && order.customerInfo.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.firstName && order.customerInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerInfo?.lastName && order.customerInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [orders, searchTerm, activeTab]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [filteredOrders]);
  
  const formatDate = (date) => {
    // Improved date handling to prevent crashes
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TabButton = ({ tabName, label, activeTab, setActiveTab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow'
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

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
        
        <div className="mb-6">
          <div className="flex space-x-2 border-b border-gray-200 pb-2">
            <TabButton tabName="b2b" label="Återförsäljare" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton tabName="b2c" label="Kunder" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

        {loading ? (
          <p>Laddar ordrar...</p>
        ) : error ? (
          <p className="text-red-500">Fel vid laddning av ordrar: {error}</p>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordernummer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'b2b' ? 'Företag' : 'Kund'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totalt</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärd</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">{order.orderNumber || order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {activeTab === 'b2b' 
                          ? order.companyName || order.customerInfo?.email || 'N/A' // Fallback for B2B
                          : `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || order.customerInfo?.email || 'Guest'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(order.totalAmount || order.total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-800">
                          Hantera
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminOrders;