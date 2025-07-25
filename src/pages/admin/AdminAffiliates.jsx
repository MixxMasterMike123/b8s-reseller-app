import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { 
  UsersIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CursorArrowRaysIcon, 
  PencilIcon, 
  BanknotesIcon,
  LinkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center space-x-4">
    <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const AdminAffiliates = () => {
  const [applications, setApplications] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (affiliates.length === 0) {
      return { totalClicks: 0, totalConversions: 0 };
    }
    const totalClicks = affiliates.reduce((acc, aff) => acc + (aff.stats?.clicks || 0), 0);
    const totalConversions = affiliates.reduce((acc, aff) => acc + (aff.stats?.conversions || 0), 0);
    return { totalClicks, totalConversions };
  }, [affiliates]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending applications
      const appQuery = query(collection(db, 'affiliateApplications'), where("status", "==", "pending"));
      const appSnapshot = await getDocs(appQuery);
      const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(apps);

      // Fetch all affiliates (including inactive)
      const affiliateQuery = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
      const affiliateSnapshot = await getDocs(affiliateQuery);
      const affiliateList = affiliateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAffiliates(affiliateList);

    } catch (error) {
      console.error("Error fetching affiliate data: ", error);
      toast.error('Kunde inte hämta affiliate-data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    const toastId = toast.loading('Godkänner affiliate...');
    try {
      const approveAffiliate = httpsCallable(functions, 'approveAffiliateV2');
      const result = await approveAffiliate({ applicationId: appId });

      if (result.data.success) {
        toast.success(`Affiliate godkänd! Kod: ${result.data.affiliateCode}`, { id: toastId, duration: 5000 });
        fetchData(); // Refresh both lists
      } else {
        throw new Error(result.data.error || 'Okänt fel vid godkännande.');
      }
    } catch (error) {
      console.error("Error approving affiliate: ", error);
      toast.error(`Kunde inte godkänna affiliate: ${error.message}`, { id: toastId });
    }
  };

  const handleDeny = async (appId) => {
    if (!window.confirm('Är du säker på att du vill neka och radera denna ansökan?')) {
      return;
    }
    const toastId = toast.loading('Nekar ansökan...');
    try {
      await deleteDoc(doc(db, 'affiliateApplications', appId));
      toast.success('Ansökan har nekats och raderats.', { id: toastId });
      fetchData(); // Refresh both lists
    } catch (error) {
      console.error("Error denying affiliate: ", error);
      toast.error('Kunde inte neka ansökan.', { id: toastId });
    }
  };

  const StatusBadge = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-orange-100 text-orange-800",
      denied: "bg-red-100 text-red-800",
    };
    const statusText = {
      pending: "Väntar",
      approved: "Godkänd",
      active: "Aktiv",
      inactive: "Inte Aktiv",
      suspended: "Suspenderad",
      denied: "Nekad"
    };
    return <span className={`${baseClasses} ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{statusText[status] || status}</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount || 0);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate-hantering</h1>
              <p className="text-gray-600">Hantera nya ansökningar och se statistik för dina aktiva affiliates.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/admin/affiliates/create" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <UsersIcon className="h-5 w-5 mr-2" />
                Lägg till Affiliate
              </Link>
              <Link 
                to="/admin/affiliates/analytics" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Detaljerad Analytics
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            icon={<UsersIcon className="h-6 w-6 text-white" />}
            title="Väntande Ansökningar"
            value={applications.length}
            color="bg-yellow-500"
          />
          <StatCard 
            icon={<CursorArrowRaysIcon className="h-6 w-6 text-white" />}
            title="Totalt antal klick"
            value={stats.totalClicks.toLocaleString('sv-SE')}
            color="bg-blue-500"
          />
          <StatCard 
            icon={<CheckCircleIcon className="h-6 w-6 text-white" />}
            title="Totala Konverteringar"
            value={stats.totalConversions.toLocaleString('sv-SE')}
            color="bg-green-500"
          />
        </div>

        {/* Pending Applications */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <ClockIcon className="h-6 w-6 mr-3 text-yellow-600" />
            Inkomna Ansökningar
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            {loading ? (
              <p>Laddar ansökningar...</p>
            ) : applications.length === 0 ? (
              <p className="text-gray-500">Inga nya ansökningar.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {applications.map(app => (
                  <li key={app.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-md font-semibold text-gray-900">{app.name}</p>
                      <p className="text-sm text-gray-600">{app.email}</p>
                    </div>
                    <button onClick={() => navigate(`/admin/affiliates/application/${app.id}`)} className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700">
                      Granska
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Active Affiliates Table */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-3 text-green-600" />
            Alla Affiliates ({affiliates.length})
          </h2>
          
          {loading ? (
            <p>Laddar affiliates...</p>
          ) : affiliates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-gray-500">Inga aktiva affiliates hittades.</p>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Affiliate & Kontakt
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kod & Status
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prestanda
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intjäning
                      </th>
                      <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Åtgärder
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affiliates.map((affiliate) => (
                      <tr key={affiliate.id} className="hover:bg-gray-50">
                        {/* Column 1: Affiliate & Contact */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-12 w-12 mr-4">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">
                                  {affiliate.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 mb-1">{affiliate.name}</div>
                              <div className="text-sm text-gray-500 mb-1">{affiliate.email}</div>
                              {affiliate.website && (
                                <div className="flex items-center text-xs text-blue-600">
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  <a 
                                    href={affiliate.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:underline truncate max-w-[200px]"
                                  >
                                    {affiliate.website.replace(/^https?:\/\//, '')}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Code & Status */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="space-y-2">
                            <div className="bg-blue-50 rounded-lg p-2">
                              <div className="text-xs text-blue-600 font-medium mb-1">Affiliate Kod</div>
                              <div className="font-mono text-sm bg-white px-2 py-1 rounded border border-blue-100">
                                {affiliate.affiliateCode}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={affiliate.status} />
                              <div className="text-xs text-gray-500">
                                {affiliate.commissionRate}% provision
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Performance */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Besök:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {(affiliate.stats?.clicks || 0).toLocaleString('sv-SE')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Konverteringar:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {(affiliate.stats?.conversions || 0).toLocaleString('sv-SE')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Konv.grad:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {affiliate.stats?.clicks ? 
                                  ((affiliate.stats.conversions / affiliate.stats.clicks) * 100).toFixed(1) : 
                                  0}%
                              </span>
                            </div>
                            {affiliate.checkoutDiscount > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Rabatt:</span>
                                <span className="text-sm font-medium text-green-600">
                                  {affiliate.checkoutDiscount}%
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 4: Earnings */}
                        <td className="px-4 md:px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Totalt intjänat:</div>
                              <div className="text-sm font-bold text-green-600">
                                {formatCurrency(affiliate.stats?.totalEarnings)}
                              </div>
                            </div>
                            {affiliate.stats?.balance > 0 && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Obetalt saldo:</div>
                                <div className="text-sm font-medium text-orange-600">
                                  {formatCurrency(affiliate.stats?.balance)}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 5: Actions */}
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => navigate(`/admin/affiliates/manage/${affiliate.id}`)}
                              className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Hantera
                            </button>
                            
                            {affiliate.stats?.balance > 0 && (
                              <button
                                onClick={() => navigate(`/admin/affiliates/payout/${affiliate.id}`)}
                                className="inline-flex items-center px-3 py-2 text-xs font-medium text-green-600 hover:text-green-900 hover:bg-green-50 border border-green-300 rounded transition-colors"
                              >
                                <BanknotesIcon className="h-4 w-4 mr-1" />
                                Betala
                              </button>
                            )}
                            
                            <a
                              href={`https://shop.b8shield.com/${(affiliate.preferredLang || 'sv-SE').split('-')[1].toLowerCase()}?ref=${affiliate.affiliateCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Testa länk
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliates; 