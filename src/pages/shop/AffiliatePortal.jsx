import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { 
  HomeIcon,
  BookOpenIcon,
  PresentationChartBarIcon,
  ChartBarIcon, 
  SparklesIcon
} from '@heroicons/react/24/outline';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { generateAffiliateLink, getCountryAwareUrl } from '../../utils/productUrls';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import AffiliateSuccessGuide from '../../components/affiliate/AffiliateSuccessGuide';
import AffiliateMarketingMaterials from '../../components/AffiliateMarketingMaterials';
import AffiliateAnalyticsTab from './AffiliateAnalyticsTab';
import SmartPrice, { ExactPrice } from '../../components/shop/SmartPrice';

import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const AffiliatePortal = () => {
  const { currentUser, loading: authLoading } = useSimpleAuth();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  


  // Link Generator State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [linkType, setLinkType] = useState('standard');
  const [generatedLink, setGeneratedLink] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [generatingQR, setGeneratingQR] = useState(false);

  // Product Groups for Link Generation
  const productGroups = [
    {
      id: 'transparent',
      name: 'B8Shield Transparent',
      description: 'Diskret vasskydd för klart vatten',
      path: '/product/transparent'
    },
    {
      id: 'rod',
      name: 'B8Shield Röd',
      description: 'Vasskydd för mörkt vatten',
      path: '/product/rod'
    },
    {
      id: 'fluorescerande',
      name: 'B8Shield Fluorescerande',
      description: 'Vasskydd för djupt vatten',
      path: '/product/fluorescerande'
    },
    {
      id: 'glitter',
      name: 'B8Shield Glitter',
      description: 'Vasskydd för extra synlighet',
      path: '/product/glitter'
    },
    {
      id: '3pack',
      name: 'B8Shield 3-pack',
      description: 'Komplett startpaket med alla storlekar',
      path: '/product/3pack'
    }
  ];

  // Generate affiliate link based on selection
  const generateLink = (productPath = '') => {
    return generateAffiliateLink(affiliateData?.affiliateCode, affiliateData?.preferredLang, productPath);
  };

  // Generate QR Code
  const generateQRCode = async (link) => {
    try {
    setGeneratingQR(true);
      const qrCodeDataUrl = await QRCode.toDataURL(link);
      setQrCodeDataUrl(qrCodeDataUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(t('affiliate_portal_qr_error', 'Kunde inte generera QR-kod'));
      return null;
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleGenerateLink = () => {
    const productPath = selectedProduct || '';
    const link = generateLink(productPath);
    setGeneratedLink(link);
    
    // Generate QR code for the link
    if (link) {
      generateQRCode(link);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('affiliate_portal_copy_success', 'Länk kopierad!'));
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error(t('affiliate_portal_copy_error', 'Kunde inte kopiera länk'));
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `affiliate-qr-${affiliateData.affiliateCode}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const [profileForm, setProfileForm] = useState({
    name: '',
    preferredLang: 'sv-SE',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    country: ''
  });

  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    fetchAffiliateData();
  }, [currentUser]);

  const fetchAffiliateData = async () => {
    if (!currentUser?.email) {
      setAffiliateData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const affiliatesRef = collection(db, 'affiliates');
          const affiliateQuery = query(affiliatesRef, where('email', '==', currentUser.email), where('status', '==', 'active'));
    const querySnapshot = await getDocs(affiliateQuery);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setAffiliateData(data);
        setProfileForm({
          name: data.name || '',
          preferredLang: data.preferredLang || 'sv-SE',
          phone: data.phone || '',
          address1: data.address1 || '',
          address2: data.address2 || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          country: data.country || ''
        });
        await loadLiveStats();
      } else {
        setAffiliateData(null);
        setError(t('affiliate_portal_no_account', 'Inget aktivt affiliate-konto hittades för denna e-post.'));
      }
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
      setError(t('affiliate_portal_error', 'Ett fel uppstod när vi försökte hämta dina uppgifter.'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    // TODO: Implement profile saving logic
    toast.success(t('affiliate_profile_saved', 'Profil sparad!'));
  };



  const safeGetContentValue = (content) => {
    if (!content) return '';
    
    // If it's a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object (multilingual), get the appropriate language
    if (typeof content === 'object' && content !== null) {
      // Try to get Swedish first, then English UK, then English US
      const swedishValue = content['sv-SE'];
      const englishGBValue = content['en-GB'];
      const englishUSValue = content['en-US'];
      
      // Ensure we return a string, never an object
      if (typeof swedishValue === 'string') return swedishValue;
      if (typeof englishGBValue === 'string') return englishGBValue;
      if (typeof englishUSValue === 'string') return englishUSValue;
      
      // Find any available string value
      const stringValue = Object.values(content).find(val => typeof val === 'string' && val && val.length > 0);
      
      // Final safety: convert to string and fallback to empty string
      return String(stringValue || '');
    }
    
    // Final safety: convert anything else to string
    return String(content || '');
  };

  const loadLiveStats = async () => {
    if (!affiliateData?.affiliateCode) return;
    // TODO: Implement live stats loading
    // This would fetch real-time stats from the backend
  };

  // Add tab configuration
  const tabs = [
    {
      id: 'overview',
      name: t('affiliate_portal_tab_overview', 'Översikt'),
      icon: <HomeIcon className="h-5 w-5" />
    },
    {
      id: 'analytics',
      name: t('affiliate_portal_tab_analytics', 'Analys'),
      icon: <ChartBarIcon className="h-5 w-5" />
    },
    {
      id: 'success',
      name: t('affiliate_portal_tab_success', 'Success Management'),
      icon: <BookOpenIcon className="h-5 w-5" />
    },
    {
      id: 'materials',
      name: t('affiliate_portal_tab_materials', 'Marknadsmaterial'),
      icon: <PresentationChartBarIcon className="h-5 w-5" />
    },
    {
      id: 'profile',
      name: t('affiliate_portal_tab_profile', 'Profil'),
      icon: <SparklesIcon className="h-5 w-5" />
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            {/* Mobile-First: Compact Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {/* Clicks Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 lg:p-4">
                <div className="text-center">
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">
                    {liveStats?.clicks ?? affiliateData.stats.clicks}
                  </div>
                  <div className="text-xs lg:text-sm text-gray-600 leading-tight">
                    {t('affiliate_portal_clicks_30_days', 'Klick (30 dagar)')}
                  </div>
                </div>
              </div>

              {/* Conversions Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 lg:p-4">
                <div className="text-center">
                  <div className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">
                    {liveStats?.conversions ?? affiliateData.stats.conversions}
                  </div>
                  <div className="text-xs lg:text-sm text-gray-600 leading-tight">
                    {t('affiliate_portal_conversions_30_days', 'Konverteringar (30 dagar)')}
                  </div>
                </div>
              </div>

              {/* Balance Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 lg:p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-xl font-bold text-green-600 mb-1">
                    <ExactPrice 
                      sekPrice={affiliateData.stats.balance} 
                      size="small"
                      showOriginal={false}
                    />
                  </div>
                  <div className="text-xs lg:text-sm text-gray-600 leading-tight">
                    {t('affiliate_portal_unpaid_commission', 'Obetald Provision')}
                  </div>
                </div>
              </div>

              {/* Total Earnings Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 lg:p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-xl font-bold text-green-600 mb-1">
                    <ExactPrice 
                      sekPrice={affiliateData.stats.totalEarnings} 
                      size="small"
                      showOriginal={false}
                    />
                  </div>
                  <div className="text-xs lg:text-sm text-gray-600 leading-tight">
                    {t('affiliate_portal_total_earnings', 'Totala Intäkter')}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-Optimized Affiliate Link Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 lg:p-6">
              {/* Primary: Affiliate Code Section */}
              <div className="mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">
                  {t('affiliate_portal_your_code', 'Din Affiliate-kod')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('affiliate_portal_code_explanation', 'Detta är din unika kod som du kan dela med andra')}
                  <br />
                  <span className="text-xs text-gray-500">
                    {t('affiliate_portal_case_insensitive_note', '💡 Koden fungerar oavsett om den skrivs med stora eller små bokstäver')}
                  </span>
                </p>
                
                {/* Prominent Code Display */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-2xl lg:text-3xl font-bold text-blue-800 font-mono">
                        {affiliateData?.affiliateCode || 'LOADING...'}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {t('affiliate_portal_code_explanation', 'Din unika kod för att spåra försäljningar')}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(affiliateData?.affiliateCode || '')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0"
                    >
                      {t('affiliate_portal_copy_code', 'Kopiera kod')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Secondary: Complete Link Section */}
              <div className="mb-6">
                <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2">
                  {t('affiliate_portal_your_complete_link', 'Din kompletta länk')}
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  {t('affiliate_portal_link_explanation', 'Detta är den kompletta länken med din kod inbäddad')}
                </p>
                
                {/* Compact Link Display */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs lg:text-sm text-gray-600 font-mono break-all flex-1 min-w-0">
                      {generateLink()}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generateLink())}
                      className="bg-gray-600 text-white px-3 py-2 rounded-md text-xs lg:text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
                      {t('affiliate_portal_copy_link', 'Kopiera länk')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile-Friendly Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                <button
                  onClick={() => {
                    const link = generateLink();
                    setGeneratedLink(link);
                    generateQRCode(link);
                  }}
                  className="flex-1 bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  {t('affiliate_portal_generate_qr', 'Generera QR-kod')}
                </button>
              </div>

              {/* Compact QR Code Display */}
              {qrCodeDataUrl && (
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-shrink-0">
                      <h4 className="text-sm font-medium text-gray-800 mb-2 text-center sm:text-left">
                        {t('affiliate_portal_qr_code', 'QR-kod för din länk')}
                      </h4>
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Affiliate QR Code" 
                        className="w-24 h-24 lg:w-32 lg:h-32 border rounded mx-auto sm:mx-0" 
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <button
                        onClick={downloadQRCode}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {t('affiliate_portal_download_qr', 'Ladda ner QR')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile-Optimized Payout Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                {t('affiliate_portal_request_payout', 'Begär utbetalning')}
              </button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-4">
            {/* Mobile-First Profile Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-gray-800 mb-4">
                {t('affiliate_profile_title', 'Din Profil')}
              </h2>

              <div className="space-y-4">
                {/* Read-only fields in compact layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_email', 'Email')}
                    </label>
                    <input 
                      type="email" 
                      value={affiliateData?.email || ''} 
                      disabled 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_code', 'Affiliate-kod')}
                    </label>
                    <input 
                      type="text" 
                      value={affiliateData?.affiliateCode || ''} 
                      disabled 
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                {/* Editable fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('affiliate_profile_name', 'Namn')}
                  </label>
                  <input 
                    name="name" 
                    value={profileForm.name} 
                    onChange={handleProfileChange} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_lang', 'Föredraget språk')}
                    </label>
                    <select 
                      name="preferredLang" 
                      value={profileForm.preferredLang} 
                      onChange={handleProfileChange} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sv-SE">Svenska</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="en-US">English (US)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_phone', 'Telefon')}
                    </label>
                    <input 
                      name="phone" 
                      value={profileForm.phone} 
                      onChange={handleProfileChange} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('affiliate_profile_address1', 'Adress')}
                  </label>
                  <input 
                    name="address1" 
                    value={profileForm.address1} 
                    onChange={handleProfileChange} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('affiliate_profile_address2', 'Adress 2 (valfritt)')}
                  </label>
                  <input 
                    name="address2" 
                    value={profileForm.address2} 
                    onChange={handleProfileChange} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_city', 'Stad')}
                    </label>
                    <input 
                      name="city" 
                      value={profileForm.city} 
                      onChange={handleProfileChange} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_postal', 'Postnummer')}
                    </label>
                    <input 
                      name="postalCode" 
                      value={profileForm.postalCode} 
                      onChange={handleProfileChange} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('affiliate_profile_country', 'Land')}
                    </label>
                    <input 
                      name="country" 
                      value={profileForm.country} 
                      onChange={handleProfileChange} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Mobile-Optimized Save Button */}
                <div className="pt-4 border-t">
                  <button 
                    onClick={saveProfile} 
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base"
                  >
                    {t('affiliate_profile_save_button', 'Spara Profil')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="space-y-4">
            {/* Mobile-Optimized Success Guide */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <AffiliateSuccessGuide />
            </div>
          </div>
        );
      case 'materials':
        return (
          <div className="space-y-4">
            {/* Mobile-First Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">
                {t('affiliate_portal_marketing_materials', 'Marknadsföringsmaterial')}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('affiliate_portal_materials_description', 'Ladda ner bilder, banners och annonser för att marknadsföra B8Shield effektivt.')}
              </p>
            </div>

            {/* Mobile-Optimized Marketing Materials */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <AffiliateMarketingMaterials affiliateCode={affiliateData.affiliateCode} />
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-4">
            {/* Mobile-Optimized Analytics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <AffiliateAnalyticsTab 
                affiliateCode={affiliateData.affiliateCode}
                affiliateStats={affiliateData.stats}
                affiliateData={affiliateData}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading while auth is being restored or while fetching affiliate data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('affiliate_portal_loading', 'Laddar portal...')}</p>
      </div>
    );
  }

  // Only redirect if auth is fully loaded and user is definitely not logged in
  if (!authLoading && !currentUser) {
    // Redirect to affiliate login page
    navigate(getCountryAwareUrl('affiliate-login'));
    return null;
  }

  if (error || !affiliateData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('affiliate_portal_title', 'Affiliate Portal')}</h1>
            <p className="text-red-600 mb-8">
              {t('affiliate_portal_no_account', 'Vi kunde inte hitta ett aktivt affiliate-konto kopplat till din e-post.')}
            </p>
            <div className="space-y-4">
              <Link to={getCountryAwareUrl('affiliate-registration')} className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {t('affiliate_portal_apply_now', 'Ansök nu')}
              </Link>
              <Link to={getCountryAwareUrl('affiliate-login')} className="block text-blue-600 hover:text-blue-800 font-medium">
                {t('affiliate_portal_try_different_account', 'Prova ett annat konto')}
              </Link>
            </div>
          </div>
        </div>
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ShopNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <header className="mb-6 lg:mb-8">
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-2">
            {t('affiliate_portal_welcome', 'Välkommen {{name}}!', { name: affiliateData.name })}
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            {t('affiliate_portal_dashboard_subtitle', 'Din affiliate-instrumentpanel')}
          </p>
        </header>

        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Left-side Tabs - Mobile: horizontal scroll, Desktop: vertical sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              {/* Mobile: Horizontal scrolling tabs with visual indicators */}
              <div className="lg:hidden">
                {/* Tab Counter */}
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      {tabs.findIndex(tab => tab.id === activeTab) + 1} av {tabs.length}
                    </span>
                    <div className="flex space-x-1">
                      {tabs.map((_, index) => (
                        <div
                          key={index}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            index === tabs.findIndex(tab => tab.id === activeTab)
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Scrollable Tab Container with Visual Indicators */}
                <div className="relative">
                  {/* Left Fade Gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                  
                  {/* Right Fade Gradient */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                  
                  {/* Scroll Hint Indicator */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none">
                    <div className="w-2 h-2 bg-blue-400 rounded-full scroll-hint opacity-60" />
                  </div>
                  
                  {/* Scrollable Tabs */}
                  <nav className="overflow-x-auto scrollbar-hide border-b border-gray-200" aria-label="Sidebar">
                    <div className="flex space-x-2 p-3 min-w-max">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center justify-center px-3 py-2.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 border flex-shrink-0 ${
                            activeTab === tab.id 
                              ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-sm' 
                              : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-black'
                          }`}
                        >
                          <span className="mr-2 flex-shrink-0 text-current">{tab.icon}</span>
                          <span className="font-medium text-current">{tab.name}</span>
                        </button>
                      ))}
                    </div>
                  </nav>
                </div>
              </div>
              
              {/* Desktop: Vertical sidebar */}
              <nav className="hidden lg:block space-y-1 p-4" aria-label="Sidebar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-start justify-start px-3 py-3 text-sm font-medium rounded-md w-full text-left transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <span className="mr-3 flex-shrink-0 mt-0.5">{tab.icon}</span>
                    <span className="break-words leading-tight min-w-0 flex-1">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content - 9 columns */}
          <div className="col-span-12 lg:col-span-9">
            {renderTabContent()}
          </div>
        </div>
      </div>
      <ShopFooter />
    </div>
  );
};

export default AffiliatePortal; 