import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';

const AdminAffiliateEdit = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isApplication, setIsApplication] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [commissionRate, setCommissionRate] = useState('');
  const [status, setStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const isApp = location.pathname.includes('/application/');
    setIsApplication(isApp);
    const collectionName = isApp ? 'affiliateApplications' : 'affiliates';

    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const docData = docSnap.data();
        setData(docData);
        if (!isApp) {
          setCommissionRate(docData.commissionRate || '15');
          setStatus(docData.status || 'active');
        }
      } else {
        toast.error('Dokumentet hittades inte.');
        navigate('/admin/affiliates');
      }
    } catch (error) {
      console.error("Fel vid hämtning av dokument:", error);
      toast.error('Kunde inte hämta information.');
    } finally {
      setLoading(false);
    }
  }, [id, location.pathname, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    const toastId = toast.loading('Godkänner affiliate...');
    try {
      const approveAffiliate = httpsCallable(functions, 'approveAffiliate');
      await approveAffiliate({ applicationId: id });
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
      const affiliateRef = doc(db, 'affiliates', id);
      await updateDoc(affiliateRef, {
        commissionRate: Number(commissionRate),
        status: status,
        updatedAt: new Date(),
      });
      toast.success('Ändringar sparade!', { id: toastId });
      setIsEditing(false);
      fetchData();
    } catch (error) {
      toast.error(`Kunde inte spara: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <AppLayout><p>Laddar...</p></AppLayout>;
  if (!data) return <AppLayout><p>Ingen data hittades.</p></AppLayout>;

  const DetailItem = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">{value || '-'}</dd>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {isApplication ? `Ansökan från ${data.name}` : `Hantera ${data.name}`}
            </h1>
            {!isApplication && (
               <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`px-4 py-2 rounded-md font-semibold text-sm ${isEditing ? 'bg-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}
               >
                 {isEditing ? 'Avbryt' : 'Redigera'}
               </button>
            )}
          </div>

          {!isEditing && (
            <dl className="divide-y divide-gray-200">
              <DetailItem label="Namn" value={data.name} />
              <DetailItem label="E-post" value={data.email} />
              <DetailItem label="Hemsida/Kanal" value={<a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{data.website}</a>} />
              <DetailItem label="Beskrivning" value={<p className="whitespace-pre-wrap">{data.description}</p>} />
              {!isApplication && <DetailItem label="Status" value={data.status} />}
              {!isApplication && <DetailItem label="Affiliate-kod" value={data.affiliateCode} />}
              {!isApplication && <DetailItem label="Provision" value={`${data.commissionRate}%`} />}
            </dl>
          )}

          {isEditing && !isApplication && (
            <form onSubmit={handleSave}>
              <div className="space-y-4">
                 <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="active">Aktiv</option>
                        <option value="suspended">Suspenderad</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700">Provision (%)</label>
                    <input type="number" id="commissionRate" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:bg-green-300">
                  {loading ? 'Sparar...' : 'Spara ändringar'}
                </button>
              </div>
            </form>
          )}

          {isApplication && (
            <div className="mt-8 border-t pt-6 flex justify-end space-x-3">
              <button onClick={handleDeny} className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700">
                Neka
              </button>
              <button onClick={handleApprove} className="bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700">
                Godkänn Ansökan
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliateEdit; 