import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updatePassword, sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import CustomerLogin from './CustomerLogin';
import LoaderOverlay from '../../components/LoaderOverlay';
import { 
  UserIcon, 
  ShoppingBagIcon, 
  CogIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const CustomerAccount = () => {
  const { currentUser, logout } = useSimpleAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Load customer data and orders
  useEffect(() => {
    if (currentUser) {
      loadCustomerData();
      loadOrders();
    }
  }, [currentUser]);

  const loadCustomerData = async () => {
    try {
      const customersRef = collection(db, 'b2cCustomers');
      const customerQuery = query(customersRef, where('firebaseAuthUid', '==', currentUser.uid));
      const customerSnapshot = await getDocs(customerQuery);
      
      if (!customerSnapshot.empty) {
        const customerDoc = customerSnapshot.docs[0];
        const data = { id: customerDoc.id, ...customerDoc.data() };
        setCustomerData(data);
        setEditForm(data);
      } else {
        toast.error(t('customer_account_error_not_found', 'Kundprofil hittades inte'));
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error(t('customer_account_error_loading', 'Kunde inte ladda kunduppgifter'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, where('source', '==', 'b2c'), where('userId', '==', currentUser.uid));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date (newest first)
      ordersData.sort((a, b) => {
        if (a.createdAt?.seconds && b.createdAt?.seconds) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });
      
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error(t('customer_account_error_loading_orders', 'Kunde inte ladda orderhistorik'));
    }
  };

  const handleEditProfile = async () => {
    if (!customerData) return;
    
    try {
      setLoading(true);
      const customerRef = doc(db, 'b2cCustomers', customerData.id);
      
      await updateDoc(customerRef, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone || '',
        address: editForm.address || '',
        apartment: editForm.apartment || '',
        city: editForm.city || '',
        postalCode: editForm.postalCode || '',
        country: editForm.country || 'SE',
        marketingConsent: editForm.marketingConsent,
        updatedAt: serverTimestamp()
      });
      
      setCustomerData({ ...customerData, ...editForm });
      setEditing(false);
      toast.success(t('customer_account_profile_updated', 'Profil uppdaterad!'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('customer_account_error_updating', 'Kunde inte uppdatera profil'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t('customer_account_error_password_required', 'Alla lösenordsfält krävs'));
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('customer_account_error_password_mismatch', 'Nya lösenord matchar inte'));
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error(t('customer_account_error_password_length', 'Lösenordet måste vara minst 6 tecken'));
      return;
    }
    
    setChangingPassword(true);
    
    try {
      await updatePassword(currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t('customer_account_password_updated', 'Lösenord uppdaterat!'));
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error(t('customer_account_error_recent_login', 'Du måste logga in igen för att ändra lösenord'));
      } else {
        toast.error(t('customer_account_error_password_update', 'Kunde inte uppdatera lösenord'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendEmailVerification(currentUser);
      toast.success(t('customer_account_verification_sent', 'Verifieringslänk skickad till din e-post'));
    } catch (error) {
      console.error('Error sending verification:', error);
      toast.error(t('customer_account_error_verification', 'Kunde inte skicka verifieringslänk'));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('customer_account_error_logout', 'Kunde inte logga ut'));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return t('order_status_completed', 'Slutförd');
      case 'processing': return t('order_status_processing', 'Bearbetas');
      case 'pending': return t('order_status_pending', 'Väntar');
      case 'cancelled': return t('order_status_cancelled', 'Avbruten');
      default: return status;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('customer_account_login_required', 'Inloggning krävs')}</h1>
            <p className="text-gray-600 mb-8">{t('customer_account_login_prompt', 'Logga in för att se ditt konto')}</p>
            <CustomerLogin onLoginSuccess={() => window.location.reload()} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoaderOverlay message={t('customer_account_loading', 'Laddar konto...')} />;
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation breadcrumb={t('breadcrumb_account', 'Mitt konto')} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('customer_account_error_not_found', 'Kundprofil hittades inte')}
            </h1>
            <p className="text-gray-600 mb-8">
              {t('customer_account_error_not_found_desc', 'Vi kunde inte hitta ditt kundkonto. Kontakta support för hjälp.')}
            </p>
            <Link 
              to="/" 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('customer_account_back_to_shop', 'Tillbaka till butiken')}
            </Link>
          </div>
        </div>
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ShopNavigation breadcrumb={t('breadcrumb_account', 'Mitt konto')} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {customerData.firstName} {customerData.lastName}
                </h1>
                <div className="flex items-center mt-1">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-gray-600">{customerData.email}</span>
                  {currentUser.emailVerified ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                  ) : (
                    <button
                      onClick={handleResendVerification}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {t('customer_account_verify_email', 'Verifiera e-post')}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              {t('customer_account_logout', 'Logga ut')}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserIcon className="h-5 w-5 inline mr-2" />
                {t('customer_account_tab_profile', 'Profil')}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ShoppingBagIcon className="h-5 w-5 inline mr-2" />
                {t('customer_account_tab_orders', 'Beställningar')} ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CogIcon className="h-5 w-5 inline mr-2" />
                {t('customer_account_tab_settings', 'Inställningar')}
              </button>
            </nav>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('customer_account_profile_title', 'Profilinformation')}
                </h2>
                <button
                  onClick={() => setEditing(!editing)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  {editing ? t('customer_account_cancel_edit', 'Avbryt') : t('customer_account_edit_profile', 'Redigera')}
                </button>
              </div>

              {editing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_first_name', 'Förnamn')}
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName || ''}
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_last_name', 'Efternamn')}
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName || ''}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('customer_account_phone', 'Telefon')}
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('customer_account_address', 'Adress')}
                    </label>
                    <input
                      type="text"
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_apartment', 'Lägenhet')}
                      </label>
                      <input
                        type="text"
                        value={editForm.apartment || ''}
                        onChange={(e) => setEditForm({...editForm, apartment: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_postal_code', 'Postnummer')}
                      </label>
                      <input
                        type="text"
                        value={editForm.postalCode || ''}
                        onChange={(e) => setEditForm({...editForm, postalCode: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_city', 'Stad')}
                      </label>
                      <input
                        type="text"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="marketingConsent"
                      checked={editForm.marketingConsent || false}
                      onChange={(e) => setEditForm({...editForm, marketingConsent: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="marketingConsent" className="ml-2 block text-sm text-gray-700">
                      {t('customer_account_marketing_consent', 'Jag vill få marknadsföringsmeddelanden')}
                    </label>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleEditProfile}
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {loading ? t('customer_account_saving', 'Sparar...') : t('customer_account_save', 'Spara')}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      {t('customer_account_cancel', 'Avbryt')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {t('customer_account_personal_info', 'Personuppgifter')}
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <strong>{t('customer_account_name', 'Namn')}:</strong> {customerData.firstName} {customerData.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>{t('customer_account_email', 'E-post')}:</strong> {customerData.email}
                        </p>
                        {customerData.phone && (
                          <p className="text-sm text-gray-600">
                            <strong>{t('customer_account_phone', 'Telefon')}:</strong> {customerData.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {t('customer_account_address_info', 'Adressuppgifter')}
                      </h3>
                      <div className="space-y-2">
                        {customerData.address ? (
                          <>
                            <p className="text-sm text-gray-600">{customerData.address}</p>
                            {customerData.apartment && (
                              <p className="text-sm text-gray-600">{customerData.apartment}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              {customerData.postalCode} {customerData.city}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            {t('customer_account_no_address', 'Ingen adress angiven')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      {t('customer_account_preferences', 'Preferenser')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      <strong>{t('customer_account_marketing', 'Marknadsföring')}:</strong> {customerData.marketingConsent ? t('customer_account_yes', 'Ja') : t('customer_account_no', 'Nej')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {t('customer_account_orders_title', 'Beställningar')}
              </h2>
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t('customer_account_no_orders', 'Inga beställningar')}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t('customer_account_no_orders_desc', 'Du har inte gjort några beställningar ännu.')}
                  </p>
                  <Link
                    to="/"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {t('customer_account_start_shopping', 'Börja handla')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {t('customer_account_order', 'Beställning')} #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {order.total} SEK
                          </p>
                        </div>
                      </div>
                      
                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="mr-2">
                              {order.items.length} {order.items.length === 1 ? t('customer_account_item', 'produkt') : t('customer_account_items', 'produkter')}
                            </span>
                            <span>•</span>
                            <span className="ml-2">
                              {order.items.map(item => item.name).join(', ')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {t('customer_account_settings_title', 'Kontoinställningar')}
              </h2>
              
              <div className="space-y-6">
                {/* Change Password */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('customer_account_change_password', 'Ändra lösenord')}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_new_password', 'Nytt lösenord')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('customer_account_confirm_password', 'Bekräfta nytt lösenord')}
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {changingPassword ? t('customer_account_changing_password', 'Ändrar lösenord...') : t('customer_account_change_password', 'Ändra lösenord')}
                    </button>
                  </div>
                </div>

                {/* Account Info */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('customer_account_account_info', 'Kontoinformation')}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>{t('customer_account_member_since', 'Medlem sedan')}:</strong> {formatDate(customerData.createdAt)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>{t('customer_account_total_orders', 'Totalt antal beställningar')}:</strong> {orders.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>{t('customer_account_email_verified', 'E-post verifierad')}:</strong> {currentUser.emailVerified ? t('customer_account_yes', 'Ja') : t('customer_account_no', 'Nej')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default CustomerAccount; 