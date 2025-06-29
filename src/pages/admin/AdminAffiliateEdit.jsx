import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { getAffiliatePayoutHistory, formatCurrency as formatPayoutCurrency, formatDate as formatPayoutDate } from '../../utils/affiliatePayouts';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  TagIcon, 
  LinkIcon, 
  ChartBarIcon,
  CurrencyEuroIcon,
  UserGroupIcon,
  ClockIcon,
  GlobeAltIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  HomeIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const SocialLinks = ({ socials }) => {
  if (!socials || Object.values(socials).every(val => !val)) {
    return <p className="text-sm text-gray-500">-</p>;
  }

  const socialPlatforms = [
    { key: 'website', name: 'Hemsida', icon: <GlobeAltIcon className="h-4 w-4" /> },
    { key: 'instagram', name: 'Instagram', icon: <LinkIcon className="h-4 w-4" /> },
    { key: 'youtube', name: 'YouTube', icon: <LinkIcon className="h-4 w-4" /> },
    { key: 'facebook', name: 'Facebook', icon: <LinkIcon className="h-4 w-4" /> },
    { key: 'tiktok', name: 'TikTok', icon: <LinkIcon className="h-4 w-4" /> },
  ];

  return (
    <ul className="space-y-2">
      {socialPlatforms.map(platform =>
        socials[platform.key] ? (
          <li key={platform.key}>
            <a 
              href={socials[platform.key]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline flex items-center group"
            >
              <span className="text-gray-400 group-hover:text-blue-600 transition-colors mr-2">
                {platform.icon}
              </span>
              <span>{platform.name}</span>
            </a>
          </li>
        ) : null
      )}
    </ul>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white p-4 rounded-2xl shadow-lg flex items-start space-x-3">
    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${color}`}>
      {React.cloneElement(icon, { className: "h-5 w-5 text-white" })}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 font-medium mb-1 line-clamp-2">{title}</p>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

const DetailItem = ({ label, children, icon }) => (
  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
    <dt className="text-sm font-medium text-gray-500 flex items-center">
      {icon && <span className="mr-2 text-gray-400">{icon}</span>}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{children || '-'}</dd>
  </div>
);

const AdminAffiliateEdit = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApplication, setIsApplication] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Editable fields
  const [commissionRate, setCommissionRate] = useState('');
  const [checkoutDiscount, setCheckoutDiscount] = useState('');
  const [status, setStatus] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const fetchAffiliateStats = async (affiliateCode) => {
    try {
      // Get recent orders with this affiliate code
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('affiliateCode', '==', affiliateCode));
      const orderSnap = await getDocs(q);
      const orders = orderSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(order => order.status !== 'cancelled'); // Only count non-cancelled orders

      // Get click data
      const clicksRef = collection(db, 'affiliateClicks');
      const clicksQuery = query(clicksRef, where('affiliateCode', '==', affiliateCode));
      const clicksSnap = await getDocs(clicksQuery);
      const clicks = clicksSnap.docs.map(doc => doc.data());

      // Calculate unique clicks by IP
      const uniqueClicks = new Set(clicks.map(c => c.ipAddress)).size;
      const totalClicks = clicks.length;
      const totalOrders = orders.length;

      setRecentOrders(orders);
      setAffiliateStats({
        totalClicks,
        uniqueClicks,
        totalOrders,
        totalEarnings: data?.stats?.totalEarnings || 0,
        conversionRate: totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : '0.0'
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      toast.error('Kunde inte hämta affiliate-statistik');
    }
  };

  const fetchPayoutHistory = async (affiliateId) => {
    setLoadingPayouts(true);
    console.log('🔍 Fetching payout history for affiliate ID:', affiliateId);
    
    try {
      const payouts = await getAffiliatePayoutHistory(affiliateId);
      console.log('📊 Payout history results:', payouts);
      setPayoutHistory(payouts);
      
      if (payouts.length === 0) {
        console.log('⚠️ No payouts found for affiliate ID:', affiliateId);
        // Let's also try to fetch all payouts to see what's in the database
        console.log('🔍 Checking all payouts in database...');
        
        // Debug: Get all payouts to see what's available
        const allPayoutsQuery = query(collection(db, 'affiliatePayouts'));
        const allPayoutsSnap = await getDocs(allPayoutsQuery);
        const allPayouts = allPayoutsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('📋 All payouts in database:', allPayouts);
        
        // Check if there are payouts for this affiliate with different ID format
        const matchingPayouts = allPayouts.filter(p => 
          p.affiliateId === affiliateId || 
          p.affiliateId === data?.id ||
          p.affiliateCode === data?.affiliateCode
        );
        console.log('🔍 Matching payouts found:', matchingPayouts);
        
        if (matchingPayouts.length > 0) {
          console.log('✅ Found payouts with different ID matching, using those');
          setPayoutHistory(matchingPayouts);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching payout history:', error);
      toast.error('Kunde inte hämta utbetalningshistorik');
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // First check if this is an application
      const appRef = doc(db, 'affiliateApplications', id);
      const appSnap = await getDoc(appRef);
      
      if (appSnap.exists()) {
        setData(appSnap.data());
        setIsApplication(true);
      } else {
        // If not an application, get affiliate data
        const affiliateRef = doc(db, 'affiliates', id);
        const affiliateSnap = await getDoc(affiliateRef);
        
        if (affiliateSnap.exists()) {
          const affiliateData = affiliateSnap.data();
          setData(affiliateData);
          setIsApplication(false);
          
          // Only fetch stats after we have the affiliate data
          if (affiliateData.affiliateCode) {
            console.log('🔍 Affiliate data loaded:', {
              id: id,
              affiliateId: affiliateData.id,
              affiliateCode: affiliateData.affiliateCode,
              email: affiliateData.email,
              name: affiliateData.name
            });
            
            await fetchAffiliateStats(affiliateData.affiliateCode);
            await fetchPayoutHistory(id);
          }
          
          // Set form values
          setCommissionRate(affiliateData.commissionRate?.toString() || '');
          setCheckoutDiscount(affiliateData.checkoutDiscount?.toString() || '');
          setStatus(affiliateData.status || '');
        } else {
          toast.error('Kunde inte hitta affiliate eller ansökan.');
          navigate('/admin/affiliates');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Kunde inte hämta data.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    const toastId = toast.loading('Godkänner affiliate...');
    try {
      const approveAffiliate = httpsCallable(functions, 'approveAffiliate');
      const applicationData = {
        applicationId: id,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        postalCode: data.postalCode || '',
        city: data.city || '',
        country: data.country || '',
        socials: data.socials || {},
        promotionMethod: data.promotionMethod || '',
        message: data.message || '',
        checkoutDiscount: Number(checkoutDiscount) || 10,
      };
      await approveAffiliate(applicationData);
      toast.success('Affiliate godkänd och e-post skickat!', { id: toastId, duration: 6000 });
      navigate('/admin/affiliates');
    } catch (error) {
      toast.error(`Fel vid godkännande: ${error.message}`, { id: toastId });
    }
  };
  
  const handleDeny = async () => {
    if (!window.confirm('Är du säker på att du vill neka och radera denna ansökan?')) return;
    const toastId = toast.loading('Nekar ansökan...');
    try {
      await deleteDoc(doc(db, 'affiliateApplications', id));
      toast.success('Ansökan har nekats och raderats.', { id: toastId });
      navigate('/admin/affiliates');
    } catch (error) {
      toast.error('Kunde inte neka ansökan.', { id: toastId });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Sparar ändringar...');

    try {
      const affiliateRef = doc(db, 'affiliates', id);
      await updateDoc(affiliateRef, {
        commissionRate: Number(commissionRate),
        checkoutDiscount: Number(checkoutDiscount),
        status: status,
        updatedAt: new Date(),
      });
      toast.success('Ändringar sparade!', { id: toastId });
      setIsEditing(false);
      fetchData();
    } catch (error) {
      toast.error(`Kunde inte spara: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AppLayout><div className="text-center p-8">Laddar...</div></AppLayout>;
  if (!data) return <AppLayout><div className="text-center p-8">Ingen data hittades.</div></AppLayout>;

  const formatDate = (date) => {
    if (!date) return '-';
    return format(date.toDate(), 'PPP', { locale: sv });
  };

  const StatusBadge = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
    const statusStyles = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-orange-100 text-orange-800",
      pending: "bg-yellow-100 text-yellow-800"
    };
    const statusText = {
      active: "Aktiv",
      suspended: "Suspenderad",
      pending: "Väntar"
    };
    return (
      <span className={`${baseClasses} ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusText[status] || status}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link to="/admin/affiliates" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Tillbaka till affiliates
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {isApplication ? `Ansökan från ${data.name}` : `Affiliate: ${data.name}`}
            </h1>
          </div>
          {!isApplication && !isEditing && (
          <button
              onClick={() => setIsEditing(true)} 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
              <PencilIcon className="h-5 w-5 mr-2" />
              Redigera
          </button>
          )}
      </div>

        {/* Quick Stats for Active Affiliates */}
        {!isApplication && data && affiliateStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard 
              icon={<ChartBarIcon />}
              title="Totalt antal besök"
              value={affiliateStats.totalClicks.toLocaleString('sv-SE')}
              color="bg-blue-500"
        />
            <StatCard 
              icon={<UserGroupIcon />}
              title="Unika besökare"
              value={affiliateStats.uniqueClicks.toLocaleString('sv-SE')}
              color="bg-purple-500"
        />
            <StatCard 
              icon={<ShoppingCartIcon />}
              title="Konverteringar"
              value={affiliateStats.totalOrders.toLocaleString('sv-SE')}
              color="bg-orange-500"
        />
            <StatCard 
              icon={<ChartBarIcon />}
          title="Konverteringsgrad"
              value={`${affiliateStats.conversionRate}%`}
              color="bg-green-500"
            />
            <StatCard 
              icon={<BanknotesIcon />}
              title="Provision"
              value={formatCurrency(data.stats?.totalEarnings || 0)}
              color="bg-emerald-500"
        />
      </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSave}>
              {/* Basic Info Card */}
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <UserGroupIcon className="h-6 w-6 mr-2 text-gray-500" />
                      Grundinformation
                    </h2>
                    {!isApplication && (
                      <StatusBadge status={data.status} />
                    )}
        </div>
      </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <DetailItem 
                      label="Namn" 
                      icon={<UserGroupIcon className="h-5 w-5" />}
                    >
                      {data.name}
                    </DetailItem>
                    
                    <DetailItem 
                      label="E-post" 
                      icon={<LinkIcon className="h-5 w-5" />}
                    >
                      <a href={`mailto:${data.email}`} className="text-blue-600 hover:underline">
                        {data.email}
                      </a>
                    </DetailItem>

                    {!isApplication && (
                      <>
                        <DetailItem 
                          label="Affiliate Kod" 
                          icon={<TagIcon className="h-5 w-5" />}
                        >
                          <code className="bg-blue-50 px-3 py-1 rounded-md font-mono text-blue-700">
                            {data.affiliateCode}
                          </code>
                        </DetailItem>

                        <DetailItem 
                          label="Skapad" 
                          icon={<ClockIcon className="h-5 w-5" />}
                        >
                          {formatDate(data.createdAt)}
                        </DetailItem>
                      </>
                    )}
                  </div>
            </div>
            </div>

              {/* Settings Card */}
              {!isApplication && (
                <div className="bg-white shadow-lg rounded-2xl overflow-hidden mb-8">
                  <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <CurrencyEuroIcon className="h-6 w-6 mr-2 text-gray-500" />
                      Inställningar
                    </h2>
            </div>

                  <div className="p-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          {isEditing ? (
              <select
                              value={status} 
                              onChange={(e) => setStatus(e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                              <option value="active">Aktiv</option>
                              <option value="suspended">Suspenderad</option>
              </select>
                          ) : (
                            <StatusBadge status={status} />
                          )}
            </div>

            <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Provision
                          </label>
                          {isEditing ? (
                            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">%</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">{data.commissionRate}%</span>
                          )}
            </div>

            <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rabatt vid checkout
                          </label>
                          {isEditing ? (
                            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                                value={checkoutDiscount}
                                onChange={(e) => setCheckoutDiscount(e.target.value)}
                                className="block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">%</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">{data.checkoutDiscount}%</span>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Avbryt
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Spara ändringar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
            </div>
              )}

              {/* Marketing Info */}
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <ChartBarIcon className="h-6 w-6 mr-2 text-gray-500" />
                    Marknadsföring
                  </h2>
        </div>

                <div className="p-6">
        <div className="space-y-6">
                    <DetailItem 
                      label="Primär kanal"
                      icon={<ChatBubbleLeftIcon className="h-5 w-5" />}
                    >
                      {data.promotionMethod}
                    </DetailItem>

                    <DetailItem 
                      label="Meddelande"
                      icon={<DocumentTextIcon className="h-5 w-5" />}
                    >
                      <p className="whitespace-pre-wrap">{data.message || '-'}</p>
                    </DetailItem>

                    <DetailItem 
                      label="Sociala medier"
                      icon={<GlobeAltIcon className="h-5 w-5" />}
                    >
                      <SocialLinks socials={data.socials} />
                    </DetailItem>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {/* Address Card */}
            <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <HomeIcon className="h-6 w-6 mr-2 text-gray-500" />
                  Adress
                </h2>
              </div>
              
              <div className="p-6">
                <address className="not-italic">
                  <p className="text-gray-900">{data.address}</p>
                  <p className="text-gray-900">{data.postalCode}</p>
                  <p className="text-gray-900">{data.city}</p>
                  <p className="text-gray-900">{data.country}</p>
                </address>
            </div>
          </div>

          {/* Recent Orders */}
            {!isApplication && recentOrders.length > 0 && (
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <ShoppingCartIcon className="h-6 w-6 mr-2 text-gray-500" />
                    Senaste ordrar
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div 
                        key={order.id} 
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.orderNumber || order.id}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(order.total || order.totalAmount || 0)}</p>
                          <p className="text-sm text-green-600">{formatCurrency(order.affiliateCommission || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            {!isApplication && (
              <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <BanknotesIcon className="h-6 w-6 mr-2 text-gray-500" />
                    Utbetalningshistorik
                    {data?.stats?.payoutCount > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {data.stats.payoutCount} utbetalningar
                      </span>
                    )}
                  </h2>
                </div>

                <div className="p-6">
                  {loadingPayouts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Laddar utbetalningar...</span>
                    </div>
                  ) : payoutHistory.length > 0 ? (
                    <div className="space-y-4">
                      {payoutHistory.map((payout) => (
                        <div key={payout.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <ReceiptPercentIcon className="h-5 w-5 text-green-600" />
                                <span className="font-medium text-gray-900">
                                  {formatPayoutCurrency(payout.payoutAmount)}
                                </span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  {payout.status === 'completed' ? 'Slutförd' : payout.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                  {formatPayoutDate(payout.payoutDate)}
                                </div>
                                <div className="flex items-center">
                                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                                  Faktura: {payout.invoiceNumber}
                                </div>
                              </div>

                              {payout.notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">
                                  "{payout.notes}"
                                </p>
                              )}
                            </div>

                            {payout.invoiceUrl && (
                              <a
                                href={payout.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Ladda ner faktura"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                Ladda ner
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Summary Stats */}
                      {data?.stats && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <p className="text-sm text-blue-600 font-medium">Totalt utbetalt</p>
                              <p className="text-lg font-bold text-blue-900">
                                {formatPayoutCurrency(data.stats.totalPaidOut || 0)}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <p className="text-sm text-green-600 font-medium">Aktuellt saldo</p>
                              <p className="text-lg font-bold text-green-900">
                                {formatPayoutCurrency(data.stats.balance || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-600 font-medium">Antal utbetalningar</p>
                              <p className="text-lg font-bold text-gray-900">
                                {data.stats.payoutCount || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">Inga utbetalningar ännu</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Utbetalningar kommer att visas här när de har genomförts
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons for Applications */}
        {isApplication && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleDeny}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Neka
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Godkänn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminAffiliateEdit;