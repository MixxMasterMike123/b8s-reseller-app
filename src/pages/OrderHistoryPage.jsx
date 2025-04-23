import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import AppLayout from '../components/layout/AppLayout';

const OrderHistoryPage = () => {
  const { currentUser } = useAuth();
  const { getUserOrders, loading } = useOrder();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      
      try {
        const userOrders = await getUserOrders();
        
        if (!userOrders || userOrders.length === 0) {
          setOrders([]);
          return;
        }
        
        // Sort orders by date (newest first), handle different date formats
        const sortedOrders = [...userOrders].sort((a, b) => {
          // Handle different date formats safely
          const dateA = getOrderDate(a.createdAt);
          const dateB = getOrderDate(b.createdAt);
          
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          return dateB.getTime() - dateA.getTime();
        });
        
        setOrders(sortedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Kunde inte hämta dina beställningar. Försök igen senare.');
        toast.error('Kunde inte hämta dina beställningar. Försök igen senare.');
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [currentUser, getUserOrders]);

  // Helper function to get a JavaScript Date from different date formats
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

  // Format date to Swedish format
  const formatDate = (date) => {
    try {
      if (!date) return 'Okänt datum';
      
      const jsDate = getOrderDate(date);
      if (!jsDate) return 'Okänt datum';
      
      return format(jsDate, 'PPP', { locale: sv });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Felaktigt datum';
    }
  };

  // Get status text and color
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Orderhistorik</h1>
          <Link
            to="/order"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Lägg ny beställning
          </Link>
        </div>

        {loadingOrders ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Hämtar dina beställningar...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">Ett fel uppstod</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Försök igen
            </button>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Ordernummer</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Datum</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Antal förp.</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Summa</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-700">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const { text: statusText, color: statusColor } = getStatusInfo(order.status);
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium">{order.orderNumber}</td>
                      <td className="py-4 px-4">{formatDate(order.createdAt)}</td>
                      <td className="py-4 px-4">{order.antalForpackningar}</td>
                      <td className="py-4 px-4">
                        {order.prisInfo?.totalPris?.toLocaleString('sv-SE', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} kr
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Visa detaljer
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center border rounded-lg">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">Inga beställningar hittades</h2>
            <p className="text-gray-500 mb-6">Du har inte lagt några beställningar ännu.</p>
            <Link
              to="/order"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lägg din första beställning
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OrderHistoryPage; 