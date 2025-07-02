import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
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
  TrashIcon, 
  PencilIcon, 
  BanknotesIcon,
  StopIcon,
  PlayIcon
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

      // Fetch all approved/managed affiliates
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
      const approveAffiliate = httpsCallable(functions, 'approveAffiliate');
      const result = await approveAffiliate({ applicationId: appId });

      if (result.data.success) {
        toast.success(`Affiliate godkänd! Kod: ${result.data.affiliateCode}`, { id: toastId, duration: 5000 });
        fetchData(); // Refresh both lists
        // Optional: navigate to the new affiliate's edit page
        // navigate(`/admin/affiliates/manage/${result.data.newAffiliateId}`);
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
      // For now, we just delete the application.
      await deleteDoc(doc(db, 'affiliateApplications', appId));
      
      toast.success('Ansökan har nekats och raderats.', { id: toastId });
      fetchData(); // Refresh both lists
    } catch (error) {
      console.error("Error denying affiliate: ", error);
      toast.error('Kunde inte neka ansökan.', { id: toastId });
    }
  };

  const handleDeleteAffiliate = async (affiliateId, affiliateName) => {
    if (!window.confirm(`Är du säker på att du vill radera affiliate "${affiliateName}"? Detta kan inte ångras.`)) {
      return;
    }
    
    const toastId = toast.loading('Raderar affiliate...');
    try {
      // Delete the affiliate document
      await deleteDoc(doc(db, 'affiliates', affiliateId));
      
      toast.success(`Affiliate "${affiliateName}" har raderats.`, { id: toastId });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Error deleting affiliate: ", error);
      toast.error(`Kunde inte radera affiliate: ${error.message}`, { id: toastId });
    }
  };

  const handleToggleAffiliateStatus = async (affiliateId, currentStatus, affiliateName) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'active' ? 'aktivera' : 'suspendra';
    
    if (!window.confirm(`Är du säker på att du vill ${actionText} affiliate "${affiliateName}"?`)) {
      return;
    }
    
    const toastId = toast.loading(`${actionText === 'aktivera' ? 'Aktiverar' : 'Suspenderar'} affiliate...`);
    try {
      // Update the affiliate status
      await updateDoc(doc(db, 'affiliates', affiliateId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      toast.success(`Affiliate "${affiliateName}" har ${newStatus === 'active' ? 'aktiverats' : 'suspenderats'}.`, { id: toastId });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Error updating affiliate status: ", error);
      toast.error(`Kunde inte uppdatera affiliate-status: ${error.message}`, { id: toastId });
    }
  };

  const StatusBadge = ({ status }) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      active: "bg-green-100 text-green-800",
      suspended: "bg-orange-100 text-orange-800",
      denied: "bg-red-100 text-red-800",
    };
    const statusText = {
      pending: "Väntar",
      approved: "Godkänd",
      active: "Aktiv",
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate-hantering</h1>
              <p className="text-gray-600">Hantera nya ansökningar och se statistik för dina aktiva affiliates.</p>
            </div>
            <Link 
              to="/admin/affiliates/analytics" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Detaljerad Analytics
            </Link>
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

        {/* Active Affiliates */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-3 text-green-600" />
            Aktiva Affiliates ({affiliates.length})
          </h2>
          {loading ? (
            <p>Laddar affiliates...</p>
          ) : affiliates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-gray-500">Inga aktiva affiliates hittades.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {affiliates.map((affiliate) => (
                <div key={affiliate.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-200">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{affiliate.name}</h3>
                      <StatusBadge status={affiliate.status} />
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{affiliate.email}</p>
                    
                    {/* Affiliate Code Section */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">Affiliate Kod</p>
                      <div className="font-mono text-sm bg-white px-3 py-2 rounded border border-blue-100">
                        {affiliate.affiliateCode}
                      </div>
                    </div>

                    {/* Website Link */}
                    {affiliate.website && (
                      <a 
                        href={affiliate.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block mb-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {affiliate.website}
                      </a>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <dt className="text-sm font-medium text-gray-500">Provision</dt>
                        <dd className="text-sm text-gray-900 font-semibold">{affiliate.commissionRate}%</dd>
                        
                        <dt className="text-sm font-medium text-gray-500">Rabatt</dt>
                        <dd className="text-sm text-gray-900 font-semibold">{affiliate.checkoutDiscount || 0}%</dd>
                        
                        <dt className="text-sm font-medium text-gray-500">Besök</dt>
                        <dd className="text-sm text-gray-900 font-semibold">{(affiliate.stats?.clicks || 0).toLocaleString('sv-SE')}</dd>
                        
                        <dt className="text-sm font-medium text-gray-500">Konverteringar</dt>
                        <dd className="text-sm text-gray-900 font-semibold">{(affiliate.stats?.conversions || 0).toLocaleString('sv-SE')}</dd>
                        
                        <dt className="text-sm font-medium text-gray-500">Konv.grad</dt>
                        <dd className="text-sm text-gray-900 font-semibold">
                          {affiliate.stats?.clicks ? 
                            ((affiliate.stats.conversions / affiliate.stats.clicks) * 100).toFixed(1) : 
                            0}%
                        </dd>
                        
                        <dt className="text-sm font-medium text-gray-500">Intjänat</dt>
                        <dd className="text-sm text-gray-900 font-bold text-green-600">{formatCurrency(affiliate.stats?.totalEarnings)}</dd>
                      </dl>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-6 space-y-3">
                    {/* Primary Actions Row */}
                    <div className="flex justify-between space-x-2">
                      <button
                        onClick={() => navigate(`/admin/affiliates/manage/${affiliate.id}`)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Hantera
                      </button>
                      
                      {affiliate.stats?.balance > 0 && (
                        <button
                          onClick={() => navigate(`/admin/affiliates/payout/${affiliate.id}`)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <BanknotesIcon className="h-4 w-4 mr-1" />
                          Betala
                        </button>
                      )}
                    </div>
                    
                    {/* Secondary Actions Row */}
                    <div className="flex justify-between space-x-2">
                      <button
                        onClick={() => handleToggleAffiliateStatus(affiliate.id, affiliate.status, affiliate.name)}
                        className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          affiliate.status === 'active' 
                            ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
                            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        }`}
                      >
                        {affiliate.status === 'active' ? (
                          <>
                            <StopIcon className="h-4 w-4 mr-1" />
                            Suspendra
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4 mr-1" />
                            Aktivera
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAffiliate(affiliate.id, affiliate.name)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Radera
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliates; 