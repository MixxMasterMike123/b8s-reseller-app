import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { getAffiliatePayoutHistory, formatCurrency as formatPayoutCurrency, formatDate as formatPayoutDate } from '../../utils/affiliatePayouts';
import { validateCustomAffiliateCode, generateSimpleAffiliateCode } from '../../utils/affiliateCalculations';
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
  ReceiptPercentIcon,
  PaperAirplaneIcon,
  KeyIcon
} from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';

const SocialLinks = ({ socials }) => {
  if (!socials || Object.values(socials).every(val => !val)) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">-</p>;
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
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center group"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mr-2">
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
  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex items-start space-x-3">
    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${color}`}>
      {React.cloneElement(icon, { className: "h-5 w-5 text-white" })}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 line-clamp-2">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
    </div>
  </div>
);

const DetailItem = ({ label, children, icon }) => (
  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
      {icon && <span className="mr-2 text-gray-400 dark:text-gray-500">{icon}</span>}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">{children || '-'}</dd>
  </div>
);

const AdminAffiliateEdit = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApplication, setIsApplication] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  // Credential sending state
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [credentialsResult, setCredentialsResult] = useState(null);

  // Editable fields
  const [commissionRate, setCommissionRate] = useState('');
  const [checkoutDiscount, setCheckoutDiscount] = useState('');
  const [status, setStatus] = useState('');
  const [preferredLang, setPreferredLang] = useState('');
  const [customAffiliateCode, setCustomAffiliateCode] = useState('');
  const [codeValidationError, setCodeValidationError] = useState('');
  
  // Personal/Contact fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Social media fields
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  
  // Marketing fields
  const [promotionMethod, setPromotionMethod] = useState('');
  const [message, setMessage] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const fetchAffiliateStats = async (affiliateCode, affiliateData = null) => {
    try {
      // Use passed affiliateData or fall back to state (for manual refreshes)
      const currentAffiliateData = affiliateData || data;
      
      console.log(`🔍 Fetching stats for affiliate ${affiliateCode}, data available:`, {
        hasData: !!currentAffiliateData,
        hasStats: !!(currentAffiliateData?.stats),
        stats: currentAffiliateData?.stats
      });
      
      // Get recent orders with this affiliate code (for detailed list display)
      // Query 1: Orders with top-level affiliateCode (Mock payments)
      const ordersRef = collection(db, 'orders');
      const q1 = query(ordersRef, where('affiliateCode', '==', affiliateCode));
      const orderSnap1 = await getDocs(q1);
      const orders1 = orderSnap1.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Query 2: Orders with affiliate.code structure (Stripe payments)
      const q2 = query(ordersRef, where('affiliate.code', '==', affiliateCode));
      const orderSnap2 = await getDocs(q2);
      const orders2 = orderSnap2.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Merge and deduplicate orders by ID, then filter cancelled orders
      const allOrders = [...orders1, ...orders2];
      const orders = allOrders
        .filter((order, index, array) => array.findIndex(o => o.id === order.id) === index)
        .filter(order => order.status !== 'cancelled'); // Only count non-cancelled orders

      // Get click data for unique clicks calculation
      const clicksRef = collection(db, 'affiliateClicks');
      const clicksQuery = query(clicksRef, where('affiliateCode', '==', affiliateCode));
      const clicksSnap = await getDocs(clicksQuery);
      const clicks = clicksSnap.docs.map(doc => doc.data());

      // Calculate unique clicks by IP (for additional insight)
      const uniqueClicks = new Set(clicks.map(c => c.ipAddress)).size;

      // 🎯 USE AFFILIATE.STATS AS AUTHORITATIVE SOURCE (same as affiliate portal)
      const affiliateDbStats = currentAffiliateData?.stats || {};
      const totalClicks = affiliateDbStats.clicks || 0;
      const totalOrders = affiliateDbStats.conversions || 0;
      const totalEarnings = affiliateDbStats.totalEarnings || 0;
      
      console.log(`📊 Affiliate ${affiliateCode} stats comparison:`, {
        fromDatabase: { clicks: affiliateDbStats.clicks, conversions: affiliateDbStats.conversions },
        fromActualClicks: { totalClicks: clicks.length, uniqueClicks },
        willDisplay: { totalClicks, totalOrders, uniqueClicks }
      });

      setRecentOrders(orders);
      setAffiliateStats({
        totalClicks,
        uniqueClicks,
        totalOrders,
        totalEarnings,
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
            
            await fetchAffiliateStats(affiliateData.affiliateCode, affiliateData);
            await fetchPayoutHistory(id);
          }
          
          // Set form values
          setCommissionRate(affiliateData.commissionRate?.toString() || '');
          setCheckoutDiscount(affiliateData.checkoutDiscount?.toString() || '');
          setStatus(affiliateData.status || '');
          setPreferredLang(affiliateData.preferredLang || 'sv-SE');
          setCustomAffiliateCode(''); // Initialize empty for new custom codes
          
          // Set personal/contact fields
          setName(affiliateData.name || '');
          setEmail(affiliateData.email || '');
          setPhone(affiliateData.phone || '');
          setAddress(affiliateData.address || '');
          setPostalCode(affiliateData.postalCode || '');
          setCity(affiliateData.city || '');
          setCountry(affiliateData.country || '');
          
          // Set social media fields
          setWebsite(affiliateData.socials?.website || '');
          setInstagram(affiliateData.socials?.instagram || '');
          setYoutube(affiliateData.socials?.youtube || '');
          setFacebook(affiliateData.socials?.facebook || '');
          setTiktok(affiliateData.socials?.tiktok || '');
          
          // Set marketing fields
          setPromotionMethod(affiliateData.promotionMethod || '');
          setMessage(affiliateData.message || '');
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

  useEffect(() => {
    if (data && data.preferredLang) setPreferredLang(data.preferredLang);
  }, [data]);

  const handleApprove = async () => {
    const toastId = toast.loading('Godkänner affiliate...');
    try {
      const approveAffiliate = httpsCallable(functions, 'approveAffiliateV2');
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
      // Validate custom affiliate code if provided
      if (customAffiliateCode.trim()) {
        const validationResult = await validateCustomAffiliateCode(customAffiliateCode, id);
        if (!validationResult.isValid) {
          setCodeValidationError(validationResult.error);
          toast.error(`Kunde inte spara: ${validationResult.error}`, { id: toastId });
          setLoading(false);
          return;
        }
      }

      const updateData = {
        // Business settings
        commissionRate: Number(commissionRate),
        checkoutDiscount: Number(checkoutDiscount),
        status: status,
        preferredLang: preferredLang,
        
        // Personal/Contact information
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: country,
        
        // Social media
        socials: {
          website: website.trim(),
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
        },
        
        // Marketing information
        promotionMethod: promotionMethod.trim(),
        message: message.trim(),
        
        updatedAt: new Date(),
      };

      // Only update affiliate code if a new one was provided
      if (customAffiliateCode.trim()) {
        updateData.affiliateCode = customAffiliateCode.trim().toUpperCase();
      }

      const affiliateRef = doc(db, 'affiliates', id);
      await updateDoc(affiliateRef, updateData);
      
      toast.success('Ändringar sparade!', { id: toastId });
      setIsEditing(false);
      fetchData();
    } catch (error) {
      toast.error(`Kunde inte spara: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAffiliate = async () => {
    if (!window.confirm(`Är du säker på att du vill radera affiliate "${data.name}"? Detta kan inte ångras och kommer att ta bort all historik och statistik.`)) {
      return;
    }
    
    const toastId = toast.loading('Raderar affiliate...');
    try {
      // Delete the affiliate document
      await deleteDoc(doc(db, 'affiliates', id));
      
      toast.success(`Affiliate "${data.name}" har raderats.`, { id: toastId });
      navigate('/admin/affiliates'); // Redirect back to list
    } catch (error) {
      console.error("Error deleting affiliate: ", error);
      toast.error(`Kunde inte radera affiliate: ${error.message}`, { id: toastId });
    }
  };

  const handleToggleAffiliateStatus = async () => {
    let newStatus;
    let actionText;
    
    if (data.status === 'active') {
      newStatus = 'suspended';
      actionText = 'suspendra';
    } else if (data.status === 'suspended') {
      newStatus = 'inactive';
      actionText = 'inaktivera';
    } else if (data.status === 'inactive') {
      newStatus = 'active';
      actionText = 'aktivera';
    } else {
      newStatus = 'active';
      actionText = 'aktivera';
    }
    
    if (!window.confirm(`Är du säker på att du vill ${actionText} affiliate "${data.name}"?`)) {
      return;
    }
    
    const toastId = toast.loading(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} affiliate...`);
    try {
      // Update the affiliate status
      await updateDoc(doc(db, 'affiliates', id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      const statusText = {
        active: 'aktiverats',
        suspended: 'suspenderats',
        inactive: 'inaktiverats'
      };
      
      toast.success(`Affiliate "${data.name}" har ${statusText[newStatus] || 'uppdaterats'}.`, { id: toastId });
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Error updating affiliate status: ", error);
      toast.error(`Kunde inte uppdatera affiliate-status: ${error.message}`, { id: toastId });
    }
  };

  // Handle sending affiliate credentials
  const handleSendCredentials = async () => {
    if (!id || !data) return;
    
    try {
      setSendingCredentials(true);
      
      // Call the cloud function to send affiliate credentials
      const sendAffiliateCredentials = httpsCallable(functions, 'sendAffiliateCredentialsV2');
      const result = await sendAffiliateCredentials({ affiliateId: id });
      
      setCredentialsResult(result.data);
      
      // Refresh affiliate data to show updated credential status
      await fetchData();
      
      toast.success('Inloggningsuppgifter skickade framgångsrikt!');
      
    } catch (error) {
      console.error('Error sending affiliate credentials:', error);
      toast.error(`Kunde inte skicka inloggningsuppgifter: ${error.message}`);
    } finally {
      setSendingCredentials(false);
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
      active: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300",
      inactive: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
      suspended: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300",
      pending: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
    };
    const statusText = {
      active: "Aktiv",
      inactive: "Inte Aktiv",
      suspended: "Suspenderad",
      pending: "Väntar"
    };
    return (
      <span className={`${baseClasses} ${statusStyles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {statusText[status] || status}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link to="/admin/affiliates" className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Tillbaka till affiliates
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isApplication ? `Ansökan från ${data.name}` : `Affiliate: ${data.name}`}
            </h1>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {!isApplication && !isEditing && (
              <>
                {/* Send Credentials Button/Status */}
                {data.credentialsSent ? (
                  <div className="flex items-center px-3 py-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                    <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">
                        Inloggningsuppgifter skickade
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {data.credentialsSentAt && new Date(data.credentialsSentAt.seconds * 1000).toLocaleDateString('sv-SE')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSendCredentials}
                    disabled={sendingCredentials}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingCredentials ? (
                      <>
                        <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                        Skicka inloggningsuppgifter
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setIsEditing(true)} 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Redigera
                </button>
                
                <button
                  onClick={handleToggleAffiliateStatus}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    data.status === 'active' 
                      ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
                      : data.status === 'suspended'
                      ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  }`}
                >
                  {data.status === 'active' ? 'Suspendra' : data.status === 'suspended' ? 'Inaktivera' : 'Aktivera'}
                </button>
                
                <button
                  onClick={handleDeleteAffiliate}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Radera
                </button>
              </>
            )}
          </div>
        </div>

        {/* Credentials Result Display */}
        {credentialsResult && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start">
              <KeyIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  {credentialsResult.isExistingUser ? 
                    'Befintligt konto uppdaterat och inloggningsuppgifter skickade!' :
                    'Nytt konto skapat och inloggningsuppgifter skickade!'
                  }
                </h4>
                <div className="text-sm text-blue-700">
                  <p><strong>E-post:</strong> {data.email}</p>
                  <p><strong>Tillfälligt lösenord:</strong> <code className="bg-blue-100 px-2 py-1 rounded font-mono">{credentialsResult.temporaryPassword}</code></p>
                  {credentialsResult.isExistingUser && (
                    <p className="text-xs mt-1 text-blue-600">
                      <strong>Obs:</strong> Ett befintligt Firebase Auth-konto uppdaterades med nytt lösenord.
                    </p>
                  )}
                  <p className="text-xs mt-2 text-blue-600">
                    Affiliate kommer att få instruktioner om att ändra lösenordet vid första inloggningen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <UserGroupIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
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
                      {isEditing ? (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="Förnamn Efternamn"
                        />
                      ) : (
                        data.name
                      )}
                    </DetailItem>
                    
                    <DetailItem 
                      label="E-post" 
                      icon={<LinkIcon className="h-5 w-5" />}
                    >
                      {isEditing ? (
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="email@example.com"
                        />
                      ) : (
                        <a href={`mailto:${data.email}`} className="text-blue-600 hover:underline">
                          {data.email}
                        </a>
                      )}
                    </DetailItem>

                    <DetailItem 
                      label="Telefon" 
                      icon={<LinkIcon className="h-5 w-5" />}
                    >
                      {isEditing ? (
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="+46 70 123 45 67"
                        />
                      ) : (
                        data.phone || '-'
                      )}
                    </DetailItem>

                    {!isApplication && (
                      <>
                        <DetailItem 
                          label="Affiliate Kod" 
                          icon={<TagIcon className="h-5 w-5" />}
                        >
                          <code className="bg-blue-50 dark:bg-blue-900 px-3 py-1 rounded-md font-mono text-blue-700 dark:text-blue-300">
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
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden mb-8">
                  <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <CurrencyEuroIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
                      Inställningar
                    </h2>
                  </div>

                  <div className="p-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                          </label>
                          {isEditing ? (
                            <select
                              value={status} 
                              onChange={(e) => setStatus(e.target.value)}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            >
                              <option value="active">Aktiv</option>
                              <option value="suspended">Suspenderad</option>
                              <option value="inactive">Inte Aktiv</option>
                            </select>
                          ) : (
                            <StatusBadge status={status} />
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Anpassad Affiliate-kod
                          </label>
                          {isEditing ? (
                            <div>
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={customAffiliateCode}
                                  onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    setCustomAffiliateCode(value);
                                    setCodeValidationError('');
                                  }}
                                  placeholder="t.ex. EMMA, FISHING"
                                  className={`flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                                    codeValidationError ? 'border-red-300' : ''
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const simpleCode = generateSimpleAffiliateCode(data.name);
                                    setCustomAffiliateCode(simpleCode);
                                    setCodeValidationError('');
                                  }}
                                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                                  title="Generera enkel kod från namn"
                                >
                                  Auto
                                </button>
                              </div>
                              {codeValidationError && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeValidationError}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                3-20 tecken, endast bokstäver, siffror och bindestreck. Lämna tomt för att behålla nuvarande kod.
                              </p>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">
                              {data.affiliateCode}
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {isEditing ? t('affiliate_reg_preferred_lang', 'Föredraget språk') : 'Föredraget språk'}
                          </label>
                          {isEditing ? (
                            <select
                              value={preferredLang}
                              onChange={e => setPreferredLang(e.target.value)}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            >
                              <option value="sv-SE">{t('lang_swedish', 'Svenska')}</option>
                              <option value="en-GB">{t('lang_english_uk', 'English (UK)')}</option>
                              <option value="en-US">{t('lang_english_us', 'English (US)')}</option>
                            </select>
                          ) : (
                            <span className="text-lg font-semibold">
                              {preferredLang === 'sv-SE' && t('lang_swedish', 'Svenska')}
                              {preferredLang === 'en-GB' && t('lang_english_uk', 'English (UK)')}
                              {preferredLang === 'en-US' && t('lang_english_us', 'English (US)')}
                            </span>
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
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <ChartBarIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
                    Marknadsföring
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-6">
                    <DetailItem 
                      label="Primär kanal"
                      icon={<ChatBubbleLeftIcon className="h-5 w-5" />}
                    >
                      {isEditing ? (
                        <textarea
                          value={promotionMethod}
                          onChange={(e) => setPromotionMethod(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="Beskriv hur affiliate planerar att marknadsföra produkterna..."
                        />
                      ) : (
                        data.promotionMethod || '-'
                      )}
                    </DetailItem>

                    <DetailItem 
                      label="Meddelande"
                      icon={<DocumentTextIcon className="h-5 w-5" />}
                    >
                      {isEditing ? (
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="Ytterligare information eller meddelande..."
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{data.message || '-'}</p>
                      )}
                    </DetailItem>

                    <DetailItem 
                      label="Sociala medier"
                      icon={<GlobeAltIcon className="h-5 w-5" />}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Hemsida
                            </label>
                            <input
                              type="url"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="https://example.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Instagram
                            </label>
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="@username"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              YouTube
                            </label>
                            <input
                              type="text"
                              value={youtube}
                              onChange={(e) => setYoutube(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="Kanalnamn"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Facebook
                            </label>
                            <input
                              type="text"
                              value={facebook}
                              onChange={(e) => setFacebook(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="Sidnamn"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              TikTok
                            </label>
                            <input
                              type="text"
                              value={tiktok}
                              onChange={(e) => setTiktok(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="@username"
                            />
                          </div>
                        </div>
                      ) : (
                        <SocialLinks socials={data.socials} />
                      )}
                    </DetailItem>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {/* Address Card */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <HomeIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
                  Adress
                </h2>
              </div>
              
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Adress
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="Gatunamn 123"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Postnummer
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="123 45"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Stad
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="Stockholm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Land
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      >
                        <option value="SE">Sverige</option>
                        <option value="NO">Norge</option>
                        <option value="DK">Danmark</option>
                        <option value="FI">Finland</option>
                        <option value="DE">Tyskland</option>
                        <option value="US">USA</option>
                        <option value="GB">Storbritannien</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <address className="not-italic">
                    <p className="text-gray-900">{data.address || '-'}</p>
                    <p className="text-gray-900">{data.postalCode || '-'}</p>
                    <p className="text-gray-900">{data.city || '-'}</p>
                    <p className="text-gray-900">{data.country || '-'}</p>
                  </address>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            {!isApplication && recentOrders.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <ShoppingCartIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
                    Senaste ordrar
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div 
                        key={order.id} 
                        className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
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
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <BanknotesIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
                    Utbetalningshistorik
                    {data?.stats?.payoutCount > 0 && (
                      <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {data.stats.payoutCount} utbetalningar
                      </span>
                    )}
                  </h2>
                </div>

                <div className="p-6">
                  {loadingPayouts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Laddar utbetalningar...</span>
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
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                  "{payout.notes}"
                                </p>
                              )}
                            </div>

                            {payout.invoiceUrl && (
                              <a
                                href={payout.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
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
                            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                              <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Totalt utbetalt</p>
                              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                {formatPayoutCurrency(data.stats.totalPaidOut || 0)}
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                              <p className="text-sm text-green-600 dark:text-green-300 font-medium">Aktuellt saldo</p>
                              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                {formatPayoutCurrency(data.stats.balance || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Antal utbetalningar</p>
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