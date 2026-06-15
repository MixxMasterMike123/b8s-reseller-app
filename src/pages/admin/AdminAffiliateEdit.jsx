import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import { getAffiliatePayoutHistory, formatCurrency as formatPayoutCurrency, formatDate as formatPayoutDate } from '../../utils/affiliatePayouts';
import { validateCustomAffiliateCode, generateSimpleAffiliateCode } from '../../utils/affiliateCalculations';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import { APP_URLS } from '../../config/urls';
import {
  CheckIcon,
  XMarkIcon,
  GlobeAltIcon,
  LinkIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  KeyIcon,
  EyeIcon
} from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useTranslation } from '../../contexts/TranslationContext';
import { Page, Card, CardSection, RightRail, Button, StatusPill, MetricsBar } from '../../components/admin/ui';

const SocialLinks = ({ socials }) => {
  if (!socials || Object.values(socials).every(val => !val)) {
    return <p className="text-[13px] text-admin-text-muted">-</p>;
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
              className="flex items-center gap-2 text-[13px] text-admin-text hover:text-admin-info-text group"
            >
              <span className="text-admin-text-faint group-hover:text-admin-info-text transition-colors">
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

// Map affiliate status → StatusPill tone (green→success, gray→neutral, orange→warning, yellow→warning)
const STATUS_TONE = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
  pending: 'warning',
};
const STATUS_TEXT = {
  active: 'Aktiv',
  inactive: 'Inte Aktiv',
  suspended: 'Suspenderad',
  pending: 'Väntar',
};

const AdminAffiliateEdit = () => {
  const { id } = useParams();
  const shopId = useShopId();
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
      const q1 = query(ordersRef, where('shopId', '==', shopId), where('affiliateCode', '==', affiliateCode));
      const orderSnap1 = await getDocs(q1);
      const orders1 = orderSnap1.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Query 2: Orders with affiliate.code structure (Stripe payments)
      const q2 = query(ordersRef, where('shopId', '==', shopId), where('affiliate.code', '==', affiliateCode));
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
      const clicksQuery = query(clicksRef, where('shopId', '==', shopId), where('affiliateCode', '==', affiliateCode));
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
      const payouts = await getAffiliatePayoutHistory(affiliateId, shopId);
      console.log('📊 Payout history results:', payouts);
      setPayoutHistory(payouts);

      if (payouts.length === 0) {
        console.log('⚠️ No payouts found for affiliate ID:', affiliateId);
        // Let's also try to fetch all payouts to see what's in the database
        console.log('🔍 Checking all payouts in database...');

        // Debug: Get all payouts to see what's available
        const allPayoutsQuery = query(collection(db, 'affiliatePayouts'), where('shopId', '==', shopId));
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
      // Validate custom affiliate code if provided
      if (customAffiliateCode.trim()) {
        const validationResult = await validateCustomAffiliateCode(customAffiliateCode, id, shopId);
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

  // Handle sending affiliate credentials (Updated to use orchestrator)
  const handleSendCredentials = async () => {
    if (!id || !data) return;

    try {
      setSendingCredentials(true);

      // Call the unified orchestrator function to send affiliate credentials
      const sendLoginCredentialsEmail = httpsCallable(functions, 'sendLoginCredentialsEmail');

      // Determine if this is an existing Firebase Auth user
      const wasExistingAuthUser = !!data.firebaseAuthUid;

      const result = await sendLoginCredentialsEmail({
        userInfo: {
          name: data.name,
          email: data.email
        },
        credentials: {
          email: data.email,
          affiliateCode: data.affiliateCode,
          temporaryPassword: wasExistingAuthUser ? undefined : 'Affiliate' + Math.random().toString(36).substring(2, 8)
        },
        accountType: 'AFFILIATE',
        wasExistingAuthUser: wasExistingAuthUser,
        userId: id,
        language: data.preferredLang || 'sv-SE'
      });

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

  if (loading) {
    return (
      <AppLayout>
        <Page title="Affiliate" back={{ to: '/admin/affiliates', label: 'Affiliates' }}>
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }
  if (!data) {
    return (
      <AppLayout>
        <Page title="Affiliate" back={{ to: '/admin/affiliates', label: 'Affiliates' }}>
          <Card className="px-6 py-12 text-center">
            <p className="text-[13px] text-admin-text-muted">Ingen data hittades.</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const formatDate = (date) => {
    if (!date) return '-';
    return format(date.toDate(), 'PPP', { locale: sv });
  };

  // Admin portal access function
  const handleViewAffiliatePortal = () => {
    if (!data?.affiliateCode) {
      toast.error('Affiliate-kod saknas');
      return;
    }

    // Use URL parameters for cross-domain admin access (sessionStorage doesn't work across domains)
    const adminParams = new URLSearchParams({
      admin_code: data.affiliateCode,
      admin_name: encodeURIComponent(data.name),
      admin_access: 'true',
      timestamp: Date.now().toString()
    });

    // Open affiliate portal in new tab with admin parameters
    const affiliatePortalUrl = `${APP_URLS.B2C_SHOP}/affiliate-portal?${adminParams.toString()}`;
    window.open(affiliatePortalUrl, '_blank');

    toast.success(`Öppnar ${data.name}s affiliate-portal i ny flik`);
  };

  // Shared field styling (matches ProductForm labelCls/inputCls pattern)
  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  // Header action cluster (only for affiliates, when not editing)
  const headerActions = !isApplication && !isEditing ? (
    <>
      {/* Send Credentials Button/Status */}
      {data.credentialsSent ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5">
          <CheckIcon className="h-4 w-4 text-admin-success-dot" />
          <div className="leading-tight">
            <div className="text-[12px] font-medium text-admin-text">
              Inloggningsuppgifter skickade
            </div>
            <div className="text-[11px] text-admin-text-muted">
              {data.credentialsSentAt && new Date(data.credentialsSentAt.seconds * 1000).toLocaleDateString('sv-SE')}
            </div>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={handleSendCredentials} disabled={sendingCredentials}>
          {sendingCredentials ? (
            <>
              <ClockIcon className="h-4 w-4 animate-spin" />
              Skickar...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4" />
              Skicka inloggningsuppgifter
            </>
          )}
        </Button>
      )}

      {/* View Portal Button */}
      <Button variant="secondary" onClick={handleViewAffiliatePortal} title="Visa affiliate-portal som admin">
        <EyeIcon className="h-4 w-4" />
        Visa Portal
      </Button>

      <Button variant="primary" onClick={() => setIsEditing(true)}>
        Redigera
      </Button>

      <Button variant="secondary" onClick={handleToggleAffiliateStatus}>
        {data.status === 'active' ? 'Suspendra' : data.status === 'suspended' ? 'Inaktivera' : 'Aktivera'}
      </Button>

      <Button variant="destructive" onClick={handleDeleteAffiliate}>
        Radera
      </Button>
    </>
  ) : null;

  // Quick-stat metrics (mirrors the previous StatCard strip values 1:1).
  const statMetrics = affiliateStats ? [
    { key: 'clicks', label: 'Totalt antal besök', value: affiliateStats.totalClicks.toLocaleString('sv-SE') },
    { key: 'unique', label: 'Unika besökare', value: affiliateStats.uniqueClicks.toLocaleString('sv-SE') },
    { key: 'conversions', label: 'Konverteringar', value: affiliateStats.totalOrders.toLocaleString('sv-SE') },
    { key: 'rate', label: 'Konverteringsgrad', value: `${affiliateStats.conversionRate}%` },
    { key: 'commission', label: 'Provision', value: formatCurrency(data.stats?.totalEarnings || 0) },
  ] : [];

  return (
    <AppLayout>
      <Page
        title={isApplication ? `Ansökan från ${data.name}` : `Affiliate: ${data.name}`}
        titleAdornment={!isApplication ? <StatusPill tone={STATUS_TONE[data.status] || 'neutral'}>{STATUS_TEXT[data.status] || data.status}</StatusPill> : undefined}
        back={{ to: '/admin/affiliates', label: 'Affiliates' }}
        actions={headerActions}
      >
        {/* Credentials Result Display */}
        {credentialsResult && (
          <CardSection className="mb-5" bodyClassName="space-y-2">
            <div className="flex items-start gap-2">
              <KeyIcon className="h-5 w-5 text-admin-info-text mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[13px] font-semibold text-admin-text mb-2">
                  {credentialsResult.isExistingUser ?
                    'Befintligt konto uppdaterat och inloggningsuppgifter skickade!' :
                    'Nytt konto skapat och inloggningsuppgifter skickade!'
                  }
                </h4>
                <div className="text-[13px] text-admin-text-muted space-y-1">
                  <p><strong className="text-admin-text">E-post:</strong> {data.email}</p>
                  <p><strong className="text-admin-text">Tillfälligt lösenord:</strong> <code className="rounded-sm bg-admin-surface-2 px-2 py-1 font-mono text-admin-text">{credentialsResult.temporaryPassword}</code></p>
                  {credentialsResult.isExistingUser && (
                    <p className="text-[12px] text-admin-text-muted">
                      <strong className="text-admin-text">Obs:</strong> Ett befintligt Firebase Auth-konto uppdaterades med nytt lösenord.
                    </p>
                  )}
                  <p className="text-[12px] text-admin-text-muted">
                    Affiliate kommer att få instruktioner om att ändra lösenordet vid första inloggningen.
                  </p>
                </div>
              </div>
            </div>
          </CardSection>
        )}

        {/* Quick Stats for Active Affiliates */}
        {!isApplication && data && affiliateStats && (
          <MetricsBar className="mb-5" metrics={statMetrics} />
        )}

        <form onSubmit={handleSave}>
          <RightRail
            main={
              <>
                {/* Basic Info Card */}
                <CardSection title="Grundinformation" bodyClassName="space-y-5">
                  <div>
                    <label className={labelCls}>Namn</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                        placeholder="Förnamn Efternamn"
                      />
                    ) : (
                      <p className="text-[13px] text-admin-text">{data.name}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>E-post</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        placeholder="email@example.com"
                      />
                    ) : (
                      <a href={`mailto:${data.email}`} className="text-[13px] text-admin-info-text hover:underline">
                        {data.email}
                      </a>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Telefon</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputCls}
                        placeholder="+46 70 123 45 67"
                      />
                    ) : (
                      <p className="text-[13px] text-admin-text">{data.phone || '-'}</p>
                    )}
                  </div>

                  {!isApplication && (
                    <>
                      <div>
                        <label className={labelCls}>Affiliate Kod</label>
                        <code className="inline-block rounded-[var(--radius-admin-el)] bg-admin-info-bg px-3 py-1 font-mono text-[13px] text-admin-info-text">
                          {data.affiliateCode}
                        </code>
                      </div>

                      <div>
                        <label className={labelCls}>Skapad</label>
                        <p className="text-[13px] text-admin-text">{formatDate(data.createdAt)}</p>
                      </div>
                    </>
                  )}
                </CardSection>

                {/* Settings Card */}
                {!isApplication && (
                  <CardSection title="Inställningar" bodyClassName="space-y-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className={labelCls}>Status</label>
                        {isEditing ? (
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={inputCls}
                          >
                            <option value="active">Aktiv</option>
                            <option value="suspended">Suspenderad</option>
                            <option value="inactive">Inte Aktiv</option>
                          </select>
                        ) : (
                          <StatusPill tone={STATUS_TONE[status] || 'neutral'}>{STATUS_TEXT[status] || status}</StatusPill>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Anpassad Affiliate-kod</label>
                        {isEditing ? (
                          <div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customAffiliateCode}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase();
                                  setCustomAffiliateCode(value);
                                  setCodeValidationError('');
                                }}
                                placeholder="t.ex. EMMA, FISHING"
                                className={`${inputCls} flex-1 ${codeValidationError ? 'border-admin-critical-dot' : ''}`}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  const simpleCode = generateSimpleAffiliateCode(data.name);
                                  setCustomAffiliateCode(simpleCode);
                                  setCodeValidationError('');
                                }}
                                title="Generera enkel kod från namn"
                              >
                                Auto
                              </Button>
                            </div>
                            {codeValidationError && (
                              <p className="mt-1 text-[12px] text-admin-critical-text">{codeValidationError}</p>
                            )}
                            <p className={helpCls}>
                              3-20 tecken, endast bokstäver, siffror och bindestreck. Lämna tomt för att behålla nuvarande kod.
                            </p>
                          </div>
                        ) : (
                          <span className="text-[15px] font-semibold text-admin-text">
                            {data.affiliateCode}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Provision</label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="number"
                              value={commissionRate}
                              onChange={(e) => setCommissionRate(e.target.value)}
                              className={`${inputCls} pr-10`}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-[13px] text-admin-text-muted">%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[15px] font-semibold text-admin-text">{data.commissionRate}%</span>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Rabatt vid checkout</label>
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="number"
                              value={checkoutDiscount}
                              onChange={(e) => setCheckoutDiscount(e.target.value)}
                              className={`${inputCls} pr-10`}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-[13px] text-admin-text-muted">%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[15px] font-semibold text-admin-text">{data.checkoutDiscount}%</span>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>
                          {isEditing ? t('affiliate_reg_preferred_lang', 'Föredraget språk') : 'Föredraget språk'}
                        </label>
                        {isEditing ? (
                          <select
                            value={preferredLang}
                            onChange={e => setPreferredLang(e.target.value)}
                            className={inputCls}
                          >
                            <option value="sv-SE">{t('lang_swedish', 'Svenska')}</option>
                            <option value="en-GB">{t('lang_english_uk', 'English (UK)')}</option>
                            <option value="en-US">{t('lang_english_us', 'English (US)')}</option>
                          </select>
                        ) : (
                          <span className="text-[15px] font-semibold text-admin-text">
                            {preferredLang === 'sv-SE' && t('lang_swedish', 'Svenska')}
                            {preferredLang === 'en-GB' && t('lang_english_uk', 'English (UK)')}
                            {preferredLang === 'en-US' && t('lang_english_us', 'English (US)')}
                          </span>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                          Avbryt
                        </Button>
                        <Button type="submit" variant="primary">
                          Spara ändringar
                        </Button>
                      </div>
                    )}
                  </CardSection>
                )}

                {/* Marketing Info */}
                <CardSection title="Marknadsföring" bodyClassName="space-y-5">
                  <div>
                    <label className={labelCls}>Primär kanal</label>
                    {isEditing ? (
                      <textarea
                        value={promotionMethod}
                        onChange={(e) => setPromotionMethod(e.target.value)}
                        rows="3"
                        className={inputCls}
                        placeholder="Beskriv hur affiliate planerar att marknadsföra produkterna..."
                      />
                    ) : (
                      <p className="text-[13px] text-admin-text">{data.promotionMethod || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Meddelande</label>
                    {isEditing ? (
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows="3"
                        className={inputCls}
                        placeholder="Ytterligare information eller meddelande..."
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-[13px] text-admin-text">{data.message || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Sociala medier</label>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Hemsida</label>
                          <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className={inputCls}
                            placeholder="https://example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Instagram</label>
                          <input
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            className={inputCls}
                            placeholder="@username"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">YouTube</label>
                          <input
                            type="text"
                            value={youtube}
                            onChange={(e) => setYoutube(e.target.value)}
                            className={inputCls}
                            placeholder="Kanalnamn"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Facebook</label>
                          <input
                            type="text"
                            value={facebook}
                            onChange={(e) => setFacebook(e.target.value)}
                            className={inputCls}
                            placeholder="Sidnamn"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">TikTok</label>
                          <input
                            type="text"
                            value={tiktok}
                            onChange={(e) => setTiktok(e.target.value)}
                            className={inputCls}
                            placeholder="@username"
                          />
                        </div>
                      </div>
                    ) : (
                      <SocialLinks socials={data.socials} />
                    )}
                  </div>
                </CardSection>
              </>
            }
            rail={
              <>
                {/* Address Card */}
                <CardSection title="Adress" bodyClassName="space-y-3">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Adress</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className={inputCls}
                          placeholder="Gatunamn 123"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Postnummer</label>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className={inputCls}
                            placeholder="123 45"
                          />
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Stad</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className={inputCls}
                            placeholder="Stockholm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-admin-text-muted mb-1">Land</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={inputCls}
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
                    </>
                  ) : (
                    <address className="not-italic text-[13px] text-admin-text space-y-0.5">
                      <p>{data.address || '-'}</p>
                      <p>{data.postalCode || '-'}</p>
                      <p>{data.city || '-'}</p>
                      <p>{data.country || '-'}</p>
                    </address>
                  )}
                </CardSection>

                {/* Recent Orders */}
                {!isApplication && recentOrders.length > 0 && (
                  <CardSection title="Senaste ordrar" bodyClassName="p-0" className="overflow-hidden">
                    <div className="divide-y divide-admin-border-soft">
                      {recentOrders.slice(0, 5).map((order) => (
                        <button
                          key={order.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-admin-surface-2"
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-admin-text">
                              Order #{order.orderNumber || order.id}
                            </p>
                            <p className="text-[12px] text-admin-text-muted">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-medium text-admin-text tabular-nums">{formatCurrency(order.total || order.totalAmount || 0)}</p>
                            <p className="text-[12px] text-admin-success-text tabular-nums">{formatCurrency(order.affiliateCommission || 0)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardSection>
                )}

                {/* Payment History */}
                {!isApplication && (
                  <CardSection
                    title="Utbetalningshistorik"
                    actions={data?.stats?.payoutCount > 0 ? (
                      <StatusPill tone="info" marker="none">{data.stats.payoutCount} utbetalningar</StatusPill>
                    ) : undefined}
                    bodyClassName="space-y-4"
                  >
                    {loadingPayouts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent"></div>
                        <span className="ml-2 text-[13px] text-admin-text-muted">Laddar utbetalningar...</span>
                      </div>
                    ) : payoutHistory.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {payoutHistory.map((payout) => (
                            <div key={payout.id} className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-admin-text tabular-nums">
                                      {formatPayoutCurrency(payout.payoutAmount)}
                                    </span>
                                    <StatusPill tone="success">
                                      {payout.status === 'completed' ? 'Slutförd' : payout.status}
                                    </StatusPill>
                                  </div>

                                  <div className="space-y-1 text-[12px] text-admin-text-muted">
                                    <div>{formatPayoutDate(payout.payoutDate)}</div>
                                    <div>Faktura: {payout.invoiceNumber}</div>
                                  </div>

                                  {payout.notes && (
                                    <p className="mt-2 text-[12px] italic text-admin-text-muted">
                                      "{payout.notes}"
                                    </p>
                                  )}
                                </div>

                                {payout.invoiceUrl && (
                                  <a
                                    href={payout.invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-[var(--radius-admin-el)] bg-admin-info-bg px-3 py-1.5 text-[12px] font-medium text-admin-info-text transition-colors hover:opacity-80"
                                    title="Ladda ner faktura"
                                  >
                                    <DocumentArrowDownIcon className="h-4 w-4" />
                                    Ladda ner
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary Stats */}
                        {data?.stats && (
                          <div className="border-t border-admin-border-soft pt-4">
                            <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                              <div className="rounded-[var(--radius-admin-el)] bg-admin-surface-2 p-3">
                                <p className="text-[12px] font-medium text-admin-text-muted">Totalt utbetalt</p>
                                <p className="text-[15px] font-bold text-admin-text tabular-nums">
                                  {formatPayoutCurrency(data.stats.totalPaidOut || 0)}
                                </p>
                              </div>
                              <div className="rounded-[var(--radius-admin-el)] bg-admin-surface-2 p-3">
                                <p className="text-[12px] font-medium text-admin-text-muted">Aktuellt saldo</p>
                                <p className="text-[15px] font-bold text-admin-text tabular-nums">
                                  {formatPayoutCurrency(data.stats.balance || 0)}
                                </p>
                              </div>
                              <div className="rounded-[var(--radius-admin-el)] bg-admin-surface-2 p-3">
                                <p className="text-[12px] font-medium text-admin-text-muted">Antal utbetalningar</p>
                                <p className="text-[15px] font-bold text-admin-text tabular-nums">
                                  {data.stats.payoutCount || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-[13px] text-admin-text-muted">Inga utbetalningar ännu</p>
                        <p className="mt-1 text-[12px] text-admin-text-faint">
                          Utbetalningar kommer att visas här när de har genomförts
                        </p>
                      </div>
                    )}
                  </CardSection>
                )}
              </>
            }
          />
        </form>

        {/* Action Buttons for Applications */}
        {isApplication && (
          <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-admin-border bg-admin-surface p-4">
            <div className="mx-auto flex max-w-7xl justify-end gap-2 px-4 sm:px-6 lg:px-8">
              <Button variant="destructive" onClick={handleDeny}>
                <XMarkIcon className="h-4 w-4" />
                Neka
              </Button>
              <Button variant="primary" onClick={handleApprove}>
                <CheckIcon className="h-4 w-4" />
                Godkänn
              </Button>
            </div>
          </div>
        )}
      </Page>
    </AppLayout>
  );
};

export default AdminAffiliateEdit;
