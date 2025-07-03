import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import AffiliateMarketingMaterials from '../../components/AffiliateMarketingMaterials';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import CustomerLogin from './CustomerLogin';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { 
  ClipboardDocumentIcon, 
  QrCodeIcon, 
  ArrowDownTrayIcon,
  LinkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const AffiliatePortal = () => {
  const { currentUser } = useSimpleAuth();
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  const generateAffiliateLink = (productPath = '') => {
    if (!affiliateData?.affiliateCode) return '';
    
    const baseUrl = 'https://shop.b8shield.com';
    const path = productPath || '';
    const ref = `?ref=${affiliateData.affiliateCode}`;
    
    return `${baseUrl}${path}${ref}`;
  };

  // Generate QR Code
  const generateQRCode = async (url) => {
    try {
      setGeneratingQR(true);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Kunde inte generera QR-kod');
    } finally {
      setGeneratingQR(false);
    }
  };

  // Handle link generation
  const handleGenerateLink = () => {
    const selectedGroup = productGroups.find(group => group.id === selectedProduct);
    const productPath = selectedGroup ? selectedGroup.path : '';
    const link = generateAffiliateLink(productPath);
    
    setGeneratedLink(link);
    
    if (linkType === 'qr') {
      generateQRCode(link);
    } else {
      setQrCodeDataUrl('');
    }
  };

  // Copy link to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Länk kopierad!');
    }).catch(() => {
      toast.error('Kunde inte kopiera länk');
    });
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `B8Shield-QR-${affiliateData.affiliateCode}-${selectedProduct || 'shop'}.png`;
    link.href = qrCodeDataUrl;
    link.click();
    toast.success('QR-kod nedladdad!');
  };

  const fetchAffiliateData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const affiliatesRef = collection(db, 'affiliates');
      const q = query(affiliatesRef, where("email", "==", currentUser.email), where("status", "==", "active"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Du är inte en godkänd affiliate. Ansök idag!");
        setAffiliateData(null);
      } else {
        const docData = querySnapshot.docs[0].data();
        setAffiliateData(docData);
      }
    } catch (err) {
      console.error("Error fetching affiliate data:", err);
      setError("Kunde inte ladda affiliate-data. Försök igen senare.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAffiliateData();
  }, [fetchAffiliateData, currentUser]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laddar portal...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Affiliate Portal</h1>
            <p className="text-gray-600 mb-8">Vänligen logga in för att se din instrumentpanel.</p>
            <div className="max-w-md mx-auto">
                <CustomerLogin onLoginSuccess={() => fetchAffiliateData()} />
            </div>
            <p className="mt-8">
                Inte en affiliate än?{' '}
                <Link to="/affiliate-registration" className="font-medium text-blue-600 hover:text-blue-800">
                    Ansök här!
                </Link>
            </p>
        </div>
        <ShopFooter />
      </div>
    );
  }

  if (!affiliateData) {
     return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600">Ingen åtkomst</h1>
          <p className="text-gray-700 mt-2">{error || "Vi kunde inte hitta ett aktivt affiliate-konto kopplat till din e-post."}</p>
          <p className="text-gray-500 text-sm mt-1">Observera: Det kan ta några minuter efter godkännande innan portalen blir aktiv.</p>
          <Link to="/affiliate-registration" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Ansök för att bli Affiliate
          </Link>
        </div>
        <ShopFooter />
      </div>
    );
  }

  const affiliateLink = `https://shop.b8shield.com/?ref=${affiliateData.affiliateCode}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Affiliate Portal</h1>
          <p className="text-lg text-gray-600 mt-2">Välkommen, {affiliateData.name}!</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <main className="lg:col-span-2 space-y-8">
            {/* Affiliate Link */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Din unika affiliatelänk</h2>
              <p className="text-gray-600 mb-4">Dela denna länk för att spåra klick och tjäna provision. Alla köp som görs via din länk ger dig {affiliateData.commissionRate}% i provision.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={affiliateLink}
                  className="w-full bg-gray-100 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(affiliateLink);
                    alert('Länk kopierad!');
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Kopiera
                </button>
              </div>
            </div>

            {/* Marketing Materials Section */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Marknadsföringsmaterial</h2>
              <p className="text-gray-600 mb-6">
                Ladda ner bilder, banners och annonser för att marknadsföra B8Shield effektivt.
              </p>
              
              <AffiliateMarketingMaterials affiliateCode={affiliateData.affiliateCode} />
            </div>
          </main>

          {/* Stats Sidebar */}
          <aside className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Din Statistik</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Klick (30 dagar)</span>
                  <span className="font-bold text-lg text-gray-800">{affiliateData.stats.clicks.toLocaleString('sv-SE')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Konverteringar (30 dagar)</span>
                  <span className="font-bold text-lg text-gray-800">{affiliateData.stats.conversions}</span>
                </div>
                <div className="border-t my-4"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Obetald Provision</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(affiliateData.stats.balance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Totala Intäkter</span>
                  <span className="font-bold text-lg text-gray-800">{formatCurrency(affiliateData.stats.totalEarnings)}</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                Begär utbetalning
              </button>
            </div>
          </aside>

        </div>
      </div>
      <ShopFooter />
    </div>
  );
};

export default AffiliatePortal; 