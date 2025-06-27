import React from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
// import { useAuth } from '../../contexts/AuthContext'; // Or a dedicated AffiliateContext

const AffiliatePortal = () => {
  // const { currentUser } = useAuth(); // Placeholder for affiliate user data
  
  // Placeholder data - this will come from the affiliate's user profile
  const affiliateData = {
    name: "Mikael Öhlen",
    affiliateCode: "MIKAEL20",
    commissionRate: 15,
    stats: {
      clicks: 1245,
      conversions: 82,
      balance: 4350.50,
      totalEarnings: 12500.00
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount);
  };

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