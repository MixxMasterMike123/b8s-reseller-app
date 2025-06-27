import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { useAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AffiliatePortal = () => {
  const { currentUser } = useAuth();
  const [affiliateData, setAffiliateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      // User not logged in, maybe redirect or show login prompt later
      return;
    }

    const fetchAffiliateData = async () => {
      setLoading(true);
      setError(null);
      try {
        const affiliatesRef = collection(db, 'affiliates');
        // Query by email, as it's the most reliable link to the auth user
        const q = query(affiliatesRef, where("email", "==", currentUser.email), where("status", "==", "active"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Du är inte en godkänd affiliate. Ansök idag!");
          setAffiliateData(null);
        } else {
          // Should only be one result
          const docData = querySnapshot.docs[0].data();
          setAffiliateData(docData);
        }
      } catch (err) {
        console.error("Error fetching affiliate data:", err);
        setError("Kunde inte ladda affiliate-data. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [currentUser]);

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
  
  if (error) {
     return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600">Ett fel uppstod</h1>
          <p className="text-gray-700 mt-2">{error}</p>
          {error.includes("Ansök idag") && (
             <Link to="/affiliate-registration" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Bli Affiliate
            </Link>
          )}
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
          <h1 className="text-2xl font-bold">Ingen åtkomst</h1>
          <p className="text-gray-700 mt-2">Vänligen logga in för att se din affiliate-portal.</p>
          <Link to="/shop/login" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Logga in
          </Link>
        </div>
        <ShopFooter />
      </div>
    );
  }

  const affiliateLink = `https://shop.b8shield.com/?ref=${affiliateData.affiliateCode}`;

  return (
    // This page should be protected by a route that checks if the user is an active affiliate
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

            {/* Marketing Materials Placeholder */}
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Marknadsföringsmaterial</h2>
              <p className="text-gray-600 mb-4">
                Här kommer du snart att hitta bilder, banners och textannonser för att hjälpa dig marknadsföra B8Shield.
              </p>
              <Link to="#" className="text-blue-600 hover:underline">
                Utforska material (kommer snart)
              </Link>
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