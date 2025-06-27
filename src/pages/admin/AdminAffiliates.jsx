import React, { useState, useEffect } from 'react';
import { db, functions } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';

const AdminAffiliates = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'affiliateApplications'));
      const apps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by status: pending first
      apps.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return 0;
      });
      setApplications(apps);
    } catch (error) {
      console.error("Error fetching affiliate applications: ", error);
      toast.error('Kunde inte hämta affiliate-ansökningar.');
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
        fetchApplications(); // Refresh list
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
      // You might want to move it to a 'denied' status instead.
      await deleteDoc(doc(db, 'affiliateApplications', appId));
      
      toast.success('Ansökan har nekats och raderats.', { id: toastId });
      fetchApplications(); // Refresh list
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
      denied: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Hantera Affiliates</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Inkomna Ansökningar</h2>

          {loading ? (
            <p>Laddar ansökningar...</p>
          ) : applications.length === 0 ? (
            <p className="text-gray-500">Inga nya ansökningar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Namn</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-post</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kanal</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{app.website || 'N/A'}</a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {app.status === 'pending' && (
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => handleApprove(app.id)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs">Godkänn</button>
                            <button onClick={() => handleDeny(app.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs">Neka</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliates; 