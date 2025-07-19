import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AdminB2CCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    marketingConsent: 0,
    withOrders: 0,
    totalSales: 0
  });

  useEffect(() => {
    const fetchB2CCustomersAndCalculateStats = async () => {
      try {
        setLoading(true);
        console.log('Fetching B2C customers from b2cCustomers collection...');
        
        const customersQuery = query(
          collection(db, 'b2cCustomers'),
          where('deleted', '!=', true), // Exclude deleted customers
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(customersQuery);
        const customersList = [];
        
        snapshot.forEach((doc) => {
          customersList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`Fetched ${customersList.length} B2C customers`);
        
        // Calculate real-time stats from actual orders for each customer
        const customersWithRealStats = await Promise.all(
          customersList.map(async (customer) => {
            const realStats = await calculateCustomerRealStats(customer);
            return {
              ...customer,
              realStats // Add real-time calculated stats
            };
          })
        );
        
        setCustomers(customersWithRealStats);
        setFilteredCustomers(customersWithRealStats);
        
        // Calculate overall statistics from real-time data
        const totalCustomers = customersWithRealStats.length;
        const marketingConsent = customersWithRealStats.filter(c => c.marketingConsent).length;
        const withOrders = customersWithRealStats.filter(c => (c.realStats?.totalOrders || 0) > 0).length;
        const totalSales = customersWithRealStats.reduce((sum, c) => sum + (c.realStats?.totalSpent || 0), 0);
        
        setStats({
          totalCustomers,
          marketingConsent,
          withOrders,
          totalSales
        });
        
        console.log(`Calculated real-time stats: ${withOrders} customers with orders, ${totalSales.toFixed(2)} SEK total sales`);
      } catch (error) {
        console.error('Error fetching B2C customers:', error);
        toast.error('Kunde inte hämta B2C-kunder');
      } finally {
        setLoading(false);
      }
    };

    fetchB2CCustomersAndCalculateStats();
  }, []);

  // Calculate real-time customer statistics from orders (both account and guest orders)
  const calculateCustomerRealStats = async (customer) => {
    try {
      const orders = [];
      
      // Query 1: Orders with b2cCustomerId (account orders)
      const ordersWithAccountQuery = query(
        collection(db, 'orders'),
        where('b2cCustomerId', '==', customer.id)
      );
      
      const accountOrdersSnapshot = await getDocs(ordersWithAccountQuery);
      accountOrdersSnapshot.forEach(doc => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Query 2: Orders by email (guest orders) - only if customer email exists
      if (customer.email) {
        const ordersWithEmailQuery = query(
          collection(db, 'orders'),
          where('source', '==', 'b2c'),
          where('customerInfo.email', '==', customer.email)
        );
        
        const emailOrdersSnapshot = await getDocs(ordersWithEmailQuery);
        emailOrdersSnapshot.forEach(doc => {
          const orderData = {
            id: doc.id,
            ...doc.data()
          };
          // Only add if not already in orders array (avoid duplicates)
          if (!orders.some(order => order.id === orderData.id)) {
            orders.push(orderData);
          }
        });
      }
      
      // Calculate stats from all orders
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      
      console.log(`📊 Customer ${customer.email} stats:`, {
        totalOrders,
        totalSpent,
        orderIds: orders.map(o => o.id),
        orderTotals: orders.map(o => ({ id: o.id, total: o.total }))
      });
      
      // Find latest order date
      let lastOrderDate = null;
      orders.forEach(order => {
        if (order.createdAt?.seconds) {
          const orderDate = new Date(order.createdAt.seconds * 1000);
          if (!lastOrderDate || orderDate > lastOrderDate) {
            lastOrderDate = orderDate;
          }
        }
      });
      
      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastOrderDate
      };
      
    } catch (error) {
      console.error(`Error calculating real stats for customer ${customer.id}:`, error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null
      };
    }
  };

  useEffect(() => {
    // Filter customers based on search term and segment filter
    const filtered = customers.filter(customer => {
      const matchesSearch = 
        customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSegment = 
        segmentFilter === 'all' || 
        customer.customerSegment === segmentFilter;
      
      return matchesSearch && matchesSegment;
    });
    
    setFilteredCustomers(filtered);
  }, [searchTerm, segmentFilter, customers]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Aldrig';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMM yyyy HH:mm', { locale: sv });
    } catch (error) {
      return 'Ogiltigt datum';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(amount || 0);
  };

  const exportCustomersCSV = () => {
    const csvHeaders = ['Namn', 'E-post', 'Telefon', 'Stad', 'Land', 'Marknadsföring', 'Totala ordrar', 'Total spenderat', 'Registrerad'];
    
    const csvData = filteredCustomers.map(customer => [
      `${customer.firstName} ${customer.lastName}`,
      customer.email,
      customer.phone || '',
      customer.city || '',
      customer.country || '',
      customer.marketingConsent ? 'Ja' : 'Nej',
      customer.realStats?.totalOrders || 0,
      customer.realStats?.totalSpent || 0,
      formatDate(customer.createdAt)
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `b2c-customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('B2C-kunder exporterade till CSV!');
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <div>
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              B2C Kunder
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Hantera konsumentkunder och deras data
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCustomersCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Exportera CSV
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Tillbaka till Admin
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCustomers}</div>
              <div className="text-sm text-blue-600">Totala Kunder</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.marketingConsent}</div>
              <div className="text-sm text-green-600">Godkänt Marknadsföring</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.withOrders}</div>
              <div className="text-sm text-purple-600">Med Ordrar</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalSales)}</div>
              <div className="text-sm text-yellow-600">Total Försäljning</div>
            </div>
          </div>
        </div>

        {/* Filter and search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök efter namn eller e-post..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 py-2"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
              >
                <option value="all">Alla Kunder</option>
                <option value="new">Nya Kunder</option>
                <option value="repeat">Återkommande Kunder</option>
                <option value="vip">VIP Kunder</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kund
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontakt
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordrar
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segment
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registrerad
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.city}, {customer.country}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                        <div className="text-sm text-gray-500">
                          {customer.marketingConsent ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Marknadsföring OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Ej marknadsföring
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{customer.realStats?.totalOrders || 0} ordrar</div>
                        <div className="text-gray-500">{formatCurrency(customer.realStats?.totalSpent || 0)}</div>
                      </td>
                      
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.customerSegment === 'vip' ? 'bg-purple-100 text-purple-800' :
                          customer.customerSegment === 'repeat' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.customerSegment === 'vip' ? 'VIP' :
                           customer.customerSegment === 'repeat' ? 'Återkommande' :
                           'Ny'}
                        </span>
                      </td>
                      
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(customer.createdAt)}
                      </td>
                      
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/admin/b2c-customers/${customer.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Redigera
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            to={`/admin/b2c-customers/${customer.id}/orders`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Ordrar ({customer.realStats?.totalOrders || 0})
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inga B2C-kunder hittades</h3>
              <p className="text-gray-500">
                {searchTerm || segmentFilter !== 'all' 
                  ? 'Försök justera sökkriterier eller filter.'
                  : 'B2C-kunder kommer att visas här när de skapar konton via kassan.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminB2CCustomers; 