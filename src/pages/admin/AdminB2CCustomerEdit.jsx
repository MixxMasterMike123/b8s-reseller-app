import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  UserIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  EyeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

const AdminB2CCustomerEdit = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [customer, setCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    country: 'SE',
    marketingConsent: false,
    emailVerified: false,
    customerSegment: 'new',
    preferredLang: 'sv-SE'
  });
  const [errors, setErrors] = useState({});

  // Load customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        console.log('Fetching B2C customer:', customerId);
        
        const customerDoc = await getDoc(doc(db, 'b2cCustomers', customerId));
        
        if (!customerDoc.exists()) {
          toast.error('B2C-kund hittades inte');
          navigate('/admin/b2c-customers');
          return;
        }
        
        const customerData = customerDoc.data();
        setCustomer({ id: customerDoc.id, ...customerData });
        
        // Populate form data
        setFormData({
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          email: customerData.email || '',
          phone: customerData.phone || '',
          address: customerData.address || '',
          apartment: customerData.apartment || '',
          city: customerData.city || '',
          postalCode: customerData.postalCode || '',
          country: customerData.country || 'SE',
          marketingConsent: customerData.marketingConsent || false,
          emailVerified: customerData.emailVerified || false,
          customerSegment: customerData.customerSegment || 'new',
          preferredLang: customerData.preferredLang || 'sv-SE'
        });
        
        // Load customer orders
        await loadCustomerOrders();
        
      } catch (error) {
        console.error('Error fetching B2C customer:', error);
        toast.error('Kunde inte hämta kunddata');
        navigate('/admin/b2c-customers');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, navigate]);

  // Load customer orders
  const loadCustomerOrders = async () => {
    try {
      setOrdersLoading(true);
      console.log('Loading orders for B2C customer:', customerId);
      
      // First, get customer email to search for orders by email as well
      const customerDoc = await getDoc(doc(db, 'b2cCustomers', customerId));
      const customerData = customerDoc.data();
      const customerEmail = customerData?.email;
      
      console.log('Customer email:', customerEmail);
      
      const orders = [];
      
      // Query 1: Orders with b2cCustomerId (account orders)
      const ordersWithAccountQuery = query(
        collection(db, 'orders'),
        where('b2cCustomerId', '==', customerId)
      );
      
      const accountOrdersSnapshot = await getDocs(ordersWithAccountQuery);
      accountOrdersSnapshot.forEach(doc => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Query 2: Orders by email (guest orders) - only if customer email exists
      if (customerEmail) {
        const ordersWithEmailQuery = query(
          collection(db, 'orders'),
          where('source', '==', 'b2c'),
          where('customerInfo.email', '==', customerEmail)
        );
        
        const emailOrdersSnapshot = await getDocs(ordersWithEmailQuery);
        emailOrdersSnapshot.forEach(doc => {
          const orderData = { id: doc.id, ...doc.data() };
          // Only add if not already in orders array (avoid duplicates)
          if (!orders.some(order => order.id === orderData.id)) {
            orders.push(orderData);
          }
        });
      }
      
      // Sort by creation date (newest first)
      orders.sort((a, b) => {
        if (a.createdAt?.seconds && b.createdAt?.seconds) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });
      
      console.log(`Found ${orders.length} total orders for customer (account + email)`);
      setCustomerOrders(orders);
      
    } catch (error) {
      console.error('Error loading customer orders:', error);
      toast.error('Kunde inte ladda kundordrar');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Förnamn är obligatoriskt';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Efternamn är obligatoriskt';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatorisk';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Adress är obligatorisk';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'Stad är obligatorisk';
    }
    
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postnummer är obligatoriskt';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vänligen korrigera felen i formuläret');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        ...formData,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'b2cCustomers', customerId), updateData);
      
      // Update local state
      setCustomer(prev => ({ ...prev, ...updateData }));
      
      toast.success('B2C-kundprofil uppdaterad framgångsrikt');
      
    } catch (error) {
      console.error('Error updating B2C customer:', error);
      toast.error(`Kunde inte uppdatera profil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!customer) return;
    
    try {
      setDeleting(true);
      setShowDeleteModal(false);
      
      console.log('🗑️ Starting complete deletion of B2C customer:', customerId);
      
      // Call Firebase Function to handle complete deletion
      console.log('🔥 Calling Firebase Function for complete B2C customer deletion...');
      try {
        const deleteB2CCustomer = httpsCallable(functions, 'deleteB2CCustomerAccountV2');
        const result = await deleteB2CCustomer({ customerId });
        console.log('✅ Firebase Function completed successfully:', result);
      } catch (functionError) {
        console.error('❌ Firebase Function failed:', functionError);
        throw new Error(`Firebase Function error: ${functionError.message}`);
      }
      
      toast.success(`B2C-kund "${customer.firstName} ${customer.lastName}" har tagits bort permanent`);
      navigate('/admin/b2c-customers');
      
    } catch (error) {
      console.error('❌ Error deleting B2C customer:', error);
      toast.error(`Kunde inte ta bort kund: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!customer) return;

    try {
      setSaving(true);
      const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmailV3');
      await sendVerificationEmail({ email: customer.email });
      toast.success('Verifieringsmejl skickat till kunden!');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(`Kunde inte skicka verifieringsmejl: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-blue-600 dark:text-blue-400">Laddar B2C-kunddata...</span>
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">B2C-kund hittades inte</h2>
          <Link to="/admin/b2c-customers" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-4 inline-block">
            Tillbaka till B2C-kundlista
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Redigera B2C-Kund
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {customer.firstName} {customer.lastName} - {customer.email}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Customer Status Indicators */}
              <div className="flex items-center space-x-2">
                {customer.emailVerified ? (
                  <div className="flex items-center px-3 py-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">E-post verifierad</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center px-3 py-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <XCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">E-post ej verifierad</span>
                    </div>
                    <button
                      onClick={handleSendVerificationEmail}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Skicka verifieringsmejl till kunden"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Skickar...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                          Skicka verifiering
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Delete Customer Button */}
              <button
                onClick={handleDeleteCustomer}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 dark:bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Tar bort...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Ta bort kund
                  </>
                )}
              </button>
              
              <Link
                to="/admin/b2c-customers"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Tillbaka till lista
              </Link>
            </div>
          </div>
        </div>

        {/* Customer Details Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
              Personlig Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Förnamn *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.firstName ? 'border-red-300' : ''
                  }`}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Efternamn *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.lastName ? 'border-red-300' : ''
                  }`}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
              Kontaktinformation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-postadress *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.email ? 'border-red-300' : ''
                  }`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
              Adressinformation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adress *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.address ? 'border-red-300' : ''
                  }`}
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
              
              <div>
                <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lägenhetsnummer
                </label>
                <input
                  type="text"
                  id="apartment"
                  name="apartment"
                  value={formData.apartment}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postnummer *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.postalCode ? 'border-red-300' : ''
                  }`}
                />
                {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>}
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stad *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.city ? 'border-red-300' : ''
                  }`}
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>
              
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Land
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="SE">Sverige</option>
                  <option value="NO">Norge</option>
                  <option value="DK">Danmark</option>
                  <option value="FI">Finland</option>
                  <option value="DE">Tyskland</option>
                  <option value="US">USA</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Kundinställningar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 rounded"
                />
                <label htmlFor="marketingConsent" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Marknadsföring tillåten
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailVerified"
                  name="emailVerified"
                  checked={formData.emailVerified}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 rounded"
                />
                <label htmlFor="emailVerified" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  E-post verifierad
                </label>
              </div>
              
              <div>
                <label htmlFor="customerSegment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kundsegment
                </label>
                <select
                  id="customerSegment"
                  name="customerSegment"
                  value={formData.customerSegment}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="new">Ny Kund</option>
                  <option value="repeat">Återkommande Kund</option>
                  <option value="vip">VIP Kund</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="preferredLang" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Föredragen språk
                </label>
                <select
                  id="preferredLang"
                  name="preferredLang"
                  value={formData.preferredLang}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="sv-SE">Svenska (SE)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/admin/b2c-customers"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Sparar...
                </>
              ) : (
                'Spara ändringar'
              )}
            </button>
          </div>
        </form>

        {/* Customer Orders Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ShoppingBagIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
            Kundordrar ({customerOrders.length})
          </h3>
          
          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : customerOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Belopp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {customerOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Visa
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Inga ordrar</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Denna kund har inte lagt några ordrar än.
              </p>
            </div>
          )}
        </div>

        {/* Customer Statistics */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
            Kundstatistik
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {customerOrders.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Totala ordrar</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(customerOrders.reduce((sum, order) => sum + (order.total || 0), 0))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total spenderat</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(customerOrders.length > 0 ? customerOrders.reduce((sum, order) => sum + (order.total || 0), 0) / customerOrders.length : 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Genomsnittlig order</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatDate(customerOrders.length > 0 ? customerOrders.reduce((latest, order) => {
                  if (!order.createdAt) return latest;
                  const orderDate = order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt);
                  return (!latest || orderDate > latest) ? orderDate : latest;
                }, null) : null)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Senaste order</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <strong>Registrerad:</strong> {formatDate(customer.createdAt)}
            </div>
            <div>
              <strong>Senast uppdaterad:</strong> {formatDate(customer.updatedAt)}
            </div>
            <div>
              <strong>Senaste inloggning:</strong> {formatDate(customer.lastLoginAt)}
            </div>
            <div>
              <strong>Källa:</strong> {customer.source || 'B2C Checkout'}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Ta bort B2C-kund"
        customerName={`${customer?.firstName} ${customer?.lastName}`}
        customerEmail={customer?.email}
        confirmationText="TA BORT"
        loading={deleting}
      />
    </AppLayout>
  );
};

export default AdminB2CCustomerEdit; 