import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrder } from '../../contexts/OrderContext';

const AdminOrders = () => {
  const { getAllOrders, updateOrderStatus } = useOrder();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use a single effect with no dependencies to fetch orders on mount only
  useEffect(() => {
    // Flag to prevent setting state after unmount
    let isMounted = true;
    
    const fetchOrders = async () => {
      try {
        console.log('AdminOrders: Starting to fetch orders - once only');
        
        if (!isMounted) return;
        
        const ordersList = await getAllOrders();
        console.log('AdminOrders: Orders received:', ordersList?.length || 0);
        
        if (!isMounted) return;
        
        if (Array.isArray(ordersList)) {
          setOrders(ordersList);
          setFilteredOrders(ordersList);
        } else {
          console.error('AdminOrders: Orders is not an array:', ordersList);
          setError('Failed to fetch orders: Invalid data format');
          setOrders([]);
          setFilteredOrders([]);
        }
      } catch (error) {
        console.error('AdminOrders: Error fetching orders:', error);
        if (isMounted) {
          setError(`Failed to fetch orders: ${error.message}`);
          setOrders([]);
          setFilteredOrders([]);
        }
      } finally {
        console.log('AdminOrders: Setting loading to false');
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array ensures this runs once on mount only

  // Filter effect
  useEffect(() => {
    // Skip filtering during initial load or when no orders
    if (loading || orders.length === 0) return;
    
    console.log('AdminOrders: Filtering orders with search/status filters');
    
    // Filter orders based on search term and status filter
    const filtered = orders.filter(order => {
      const matchesSearch = 
        order.orderNumber?.toString().includes(searchTerm) ||
        order.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        statusFilter === order.status;
      
      return matchesSearch && matchesStatus;
    });
    
    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders, loading]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      await updateOrderStatus(orderId, newStatus);
      
      // Update the local state after successful update
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get Swedish status text based on status code
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Väntar på bekräftelse';
      case 'confirmed':
        return 'Bekräftad';
      case 'processing':
        return 'Under behandling';
      case 'shipped':
        return 'Skickad';
      case 'delivered':
        return 'Levererad';
      case 'cancelled':
        return 'Avbruten';
      default:
        return 'Okänd status';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // Handle Firestore timestamp objects
      if (dateString && typeof dateString === 'object' && dateString.seconds) {
        const date = new Date(dateString.seconds * 1000);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('sv-SE', options);
      }
      
      // Handle normal date strings or timestamps
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('sv-SE', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Hantera Beställningar</h1>
            <Link
              to="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Tillbaka till Admin
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök på ordernummer eller företag..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 pl-10 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Alla beställningar</option>
                <option value="pending">Väntar på bekräftelse</option>
                <option value="confirmed">Bekräftad</option>
                <option value="processing">Under behandling</option>
                <option value="shipped">Skickad</option>
                <option value="delivered">Levererad</option>
                <option value="cancelled">Avbruten</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order list */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordernummer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Företag
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.companyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.totalPrice !== undefined 
                          ? `${order.totalPrice.toFixed(2)} kr`
                          : order.prisInfo?.totalPris !== undefined
                            ? `${order.prisInfo.totalPris.toFixed(2)} kr`
                            : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            disabled={actionLoading}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                          >
                            <option value="pending">Väntar på bekräftelse</option>
                            <option value="confirmed">Bekräftad</option>
                            <option value="processing">Under behandling</option>
                            <option value="shipped">Skickad</option>
                            <option value="delivered">Levererad</option>
                            <option value="cancelled">Avbruten</option>
                          </select>
                          
                          <Link
                            to={`/order/${order.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Visa
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Inga beställningar hittades som matchar dina sökkriterier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders; 