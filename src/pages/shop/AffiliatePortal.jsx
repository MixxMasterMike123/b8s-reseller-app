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
  SparklesIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { generateAffiliateLink } from '../../utils/productUrls';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import CustomerLogin from './CustomerLogin';
import AffiliateSuccessGuide from '../../components/affiliate/AffiliateSuccessGuide';
import AffiliateMarketingMaterials from '../../components/AffiliateMarketingMaterials';
import AffiliateAnalyticsTab from './AffiliateAnalyticsTab';
import SmartPrice from '../../components/shop/SmartPrice';
import { diagnoseAffiliateData, testCommissionProcessing, fixMissingCommissions, fixMissingCommissionsIntelligent } from '../../utils/affiliateDebug';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const AffiliatePortal = () => {
  const { currentUser } = useSimpleAuth();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Diagnostic state
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null); // New state for enhanced diagnostic results
  const [diagnosticData, setDiagnosticData] = useState(null);

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

  // Run diagnostic
  const runDiagnostic = async () => {
    if (!affiliateData?.affiliateCode) return;
    
    setDiagnosticLoading(true);
    try {
      const results = await diagnoseAffiliateData(affiliateData.affiliateCode);
      setDiagnosticData(results);
      
      if (results.recommendations.length > 0) {
        toast.error(`🚨 Found ${results.recommendations.length} issues with your affiliate data`);
      } else {
        toast.success('✅ No data issues found!');
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed: ' + error.message);
    } finally {
      setDiagnosticLoading(false);
    }
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
      id: 'success',
      name: t('affiliate_portal_tab_success', 'Success Management'),
      icon: <BookOpenIcon className="h-5 w-5" />
    },
    {
      id: 'materials',
      name: t('affiliate_portal_tab_materials', 'Marknadsföringsmaterial'),
      icon: <PresentationChartBarIcon className="h-5 w-5" />
    },
    {
      id: 'analytics',
      name: t('affiliate_portal_tab_analytics', 'Analys'),
      icon: <ChartBarIcon className="h-5 w-5" />
    },
    {
      id: 'debug',
      name: 'Debug',
      icon: <WrenchScrewdriverIcon className="h-5 w-5" />
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
          <div className="space-y-6">
            <aside className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('affiliate_portal_stats_title', 'Dina Statistik')}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('affiliate_portal_clicks_30_days', 'Klick (30 dagar)')}</span>
                  <span className="font-bold text-lg text-gray-800">{liveStats?.clicks ?? affiliateData.stats.clicks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('affiliate_portal_conversions_30_days', 'Konverteringar (30 dagar)')}</span>
                    <span className="font-bold text-lg text-gray-800">{liveStats?.conversions ?? affiliateData.stats.conversions}</span>
                  </div>
                  <div className="border-t my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('affiliate_portal_unpaid_commission', 'Obetald Provision')}</span>
                  <span className="font-bold text-lg text-green-600">
                    <SmartPrice 
                      sekPrice={affiliateData.stats.balance} 
                      variant="compact"
                      showOriginal={false}
                    />
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('affiliate_portal_total_earnings', 'Totala Intäkter')}</span>
                  <span className="font-bold text-lg text-green-600">
                    <SmartPrice 
                      sekPrice={affiliateData.stats.totalEarnings} 
                      variant="compact"
                      showOriginal={false}
                    />
                  </span>
                  </div>
                </div>
                <button className="w-full mt-6 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  {t('affiliate_portal_request_payout', 'Begär utbetalning')}
                </button>
            </aside>
          </div>
        );
      case 'debug':
        return (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">🔧 Affiliate System Diagnostics</h2>
            <p className="text-gray-600 mb-6">
              Run comprehensive diagnostics to identify and fix affiliate system issues.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={runDiagnostic}
                disabled={diagnosticLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-4"
              >
                {diagnosticLoading ? 'Running Diagnostic...' : '🔍 Run Full System Diagnostic'}
              </button>
              
              <button
                onClick={async () => {
                  setDiagnosticLoading(true);
                  try {
                    const result = await fixMissingCommissions();
                    console.log('✅ Bulk commission fix completed:', result);
                    setDiagnosticData(prev => ({
                      ...prev,
                      bulkFixResult: result
                    }));
                  } catch (error) {
                    console.error('❌ Error in bulk commission fix:', error);
                  } finally {
                    setDiagnosticLoading(false);
                  }
                }}
                disabled={diagnosticLoading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 mr-4"
              >
                {diagnosticLoading ? 'Fixing Commissions...' : '🔧 Fix Missing Commissions (Fast)'}
              </button>
              
              <button
                onClick={async () => {
                  setDiagnosticLoading(true);
                  try {
                    const result = await fixMissingCommissionsIntelligent();
                    console.log('✅ Intelligent bulk commission fix completed:', result);
                    setDiagnosticData(prev => ({
                      ...prev,
                      intelligentFixResult: result
                    }));
                  } catch (error) {
                    console.error('❌ Error in intelligent bulk commission fix:', error);
                  } finally {
                    setDiagnosticLoading(false);
                  }
                }}
                disabled={diagnosticLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {diagnosticLoading ? 'Processing Intelligently...' : '🧠 Fix Missing Commissions (Intelligent)'}
              </button>
            </div>
            
            <div className="mt-6 text-sm text-gray-600 space-y-2">
              <p>• <strong>Full System Diagnostic:</strong> Analyzes all affiliate data for inconsistencies</p>
              <p>• <strong>Fast Fix:</strong> Processes all orders quickly (may hit rate limits)</p>
              <p>• <strong>Intelligent Fix:</strong> Processes orders in batches with delays (respects rate limits)</p>
            </div>

            {/* Enhanced Diagnostic Results */}
            {diagnosticResult && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Diagnostic Results:</h4>
                
                {diagnosticResult.testType === 'commission_processing' && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${diagnosticResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-medium">
                        {diagnosticResult.success ? '✅ Commission Processing Test' : '❌ Commission Processing Failed'}
                      </div>
                      <div className="text-sm mt-1">
                        Order ID: {diagnosticResult.testOrderId}
                      </div>
                      {diagnosticResult.success && (
                        <div className="text-sm mt-1">
                          Commission Added: {diagnosticResult.commissionAdded ? 'Yes' : 'No'}
                          {diagnosticResult.commissionAmount && (
                            <> (${diagnosticResult.commissionAmount.toFixed(2)})</>
                          )}
                        </div>
                      )}
                    </div>
                    {diagnosticResult.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {diagnosticResult.error}
                      </div>
                    )}
                  </div>
                )}
                
                {diagnosticResult.testType === 'bulk_commission_fix' && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${diagnosticResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-medium">
                        {diagnosticResult.success ? '✅ Bulk Commission Fix' : '❌ Bulk Fix Failed'}
                      </div>
                      {diagnosticResult.success && (
                        <div className="text-sm mt-1">
                          Orders Processed: {diagnosticResult.ordersProcessed}
                        </div>
                      )}
                    </div>
                    {diagnosticResult.results && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Results:</div>
                        {diagnosticResult.results.map((result, index) => (
                          <div key={index} className={`p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                            Order {result.orderId}: {result.success ? 'Fixed' : `Failed - ${result.error}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {!diagnosticResult.testType && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${diagnosticResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-medium">
                        {diagnosticResult.success ? '✅ System Check Passed' : '❌ Issues Found'}
                      </div>
                    </div>
                    
                    {diagnosticResult.issues && diagnosticResult.issues.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-medium text-sm">Issues Found:</div>
                        {diagnosticResult.issues.map((issue, index) => (
                          <div key={index} className={`text-sm p-2 rounded ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-700' : 
                            issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                            <span className="font-medium">{issue.type}:</span> {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {diagnosticResult.summary && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Summary:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>Total Clicks: {diagnosticResult.summary.totalClicks}</div>
                          <div>Total Orders: {diagnosticResult.summary.totalOrders}</div>
                          <div>Current Stats: ${diagnosticResult.summary.currentStats.toFixed(2)}</div>
                          <div>Calculated Stats: ${diagnosticResult.summary.calculatedStats.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('affiliate_profile_title', 'Din Profil')}</h2>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_email', 'Email')}</label>
              <input type="email" value={affiliateData?.email || ''} disabled className="w-full bg-gray-100 border-gray-300 rounded-lg px-4 py-2" />
            </div>

            {/* Affiliate Code (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_code', 'Affiliate-kod')}</label>
              <input type="text" value={affiliateData?.affiliateCode || ''} disabled className="w-full bg-gray-100 border-gray-300 rounded-lg px-4 py-2" />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_name', 'Namn')}</label>
              <input name="name" value={profileForm.name} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_language', 'Föredraget språk')}</label>
              <select
                name="preferredLang"
                value={profileForm.preferredLang}
                onChange={handleProfileChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              >
                <option value="sv-SE">Svenska</option>
                <option value="en-GB">English (UK)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_phone', 'Telefon')}</label>
              <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_address', 'Adress')}</label>
              <input name="address1" value={profileForm.address1} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_city', 'Stad')}</label>
              <input name="city" value={profileForm.city} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_postal', 'Postnummer')}</label>
              <input name="postalCode" value={profileForm.postalCode} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affiliate_profile_country', 'Land')}</label>
              <input name="country" value={profileForm.country} onChange={handleProfileChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50" />
            </div>

            <button onClick={saveProfile} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('affiliate_profile_save_button', 'Spara Profil')}
            </button>
          </div>
        );
      case 'success':
        return <AffiliateSuccessGuide />;
      case 'materials':
        return (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{t('affiliate_portal_marketing_materials', 'Marknadsföringsmaterial')}</h2>
            <p className="text-gray-600 mb-6">
              {t('affiliate_portal_materials_description', 'Ladda ner bilder, banners och annonser för att marknadsföra B8Shield effektivt.')}
            </p>
            <AffiliateMarketingMaterials affiliateCode={affiliateData.affiliateCode} />
          </div>
        );
      case 'analytics':
        return (
          <AffiliateAnalyticsTab 
            affiliateCode={affiliateData.affiliateCode}
            affiliateStats={affiliateData.stats}
            affiliateData={affiliateData}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('affiliate_portal_loading', 'Laddar portal...')}</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('affiliate_portal_title', 'Affiliate Portal')}</h1>
            <p className="text-gray-600 mb-8">{t('affiliate_portal_login_prompt', 'Please log in to see your dashboard.')}</p>
            <CustomerLogin onLoginSuccess={() => fetchAffiliateData()} />
            <p className="mt-8">
              {t('affiliate_portal_not_affiliate', 'Not an affiliate yet?')}{' '}
              <Link to="/affiliate-registration" className="font-medium text-blue-600 hover:text-blue-800">
                {t('affiliate_portal_apply_here', 'Apply here!')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !affiliateData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('affiliate_portal_title', 'Affiliate Portal')}</h1>
            <p className="text-red-600 mb-8">{error}</p>
            <Link to="/affiliate-registration" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('affiliate_portal_apply_now', 'Ansök nu')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ShopNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('affiliate_portal_welcome', 'Välkommen {{name}}!', { name: affiliateData.name })}</h1>
          <p className="mt-2 text-gray-600">{t('affiliate_portal_dashboard_subtitle', 'Din affiliate-instrumentpanel')}</p>
        </header>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left-side Tabs */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow">
              <nav className="space-y-1 p-4" aria-label="Sidebar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="md:w-2/3">
            {renderTabContent()}
          </div>
        </div>
      </div>
      <ShopFooter />
    </div>
  );
};

export default AffiliatePortal; 