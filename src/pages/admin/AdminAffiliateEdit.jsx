import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { ArrowLeftIcon, PencilIcon, CheckIcon, XMarkIcon, TagIcon, LinkIcon, AtSymbolIcon, PhoneIcon, HomeIcon } from '@heroicons/react/24/solid';

const SocialLinks = ({ socials }) => {
  if (!socials || Object.values(socials).every(val => !val)) {
    return <p className="text-sm text-gray-500">-</p>;
  }

  const socialPlatforms = [
    { key: 'website', name: 'Hemsida' },
    { key: 'instagram', name: 'Instagram' },
    { key: 'youtube', name: 'YouTube' },
    { key: 'facebook', name: 'Facebook' },
    { key: 'tiktok', name: 'TikTok' },
  ];

  return (
    <ul className="space-y-2">
      {socialPlatforms.map(platform =>
        socials[platform.key] ? (
          <li key={platform.key}>
            <a href={socials[platform.key]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
              <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
              <span>{platform.name}: {socials[platform.key]}</span>
            </a>
          </li>
        ) : null
      )}
    </ul>
  );
};

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
  const [checkoutDiscount, setCheckoutDiscount] = useState('');
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
          setCheckoutDiscount(docData.checkoutDiscount === undefined ? '10' : docData.checkoutDiscount);
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
      // Pass all relevant data from the application to the cloud function
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
      const affiliateRef = doc(db, 'affiliates', id);
      await updateDoc(affiliateRef, {
        commissionRate: Number(commissionRate),
        checkoutDiscount: Number(checkoutDiscount),
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
  
  if (loading) return <AppLayout><div className="text-center p-8">Laddar...</div></AppLayout>;
  if (!data) return <AppLayout><div className="text-center p-8">Ingen data hittades.</div></AppLayout>;

  const DetailItem = ({ label, children }) => (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{children || '-'}</dd>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link to="/admin/affiliates" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Tillbaka till affiliates
          </Link>
        </div>

        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
          <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {isApplication ? `Ansökan från ${data.name}` : `Hantera ${data.name}`}
              </h2>
              {!isApplication && !isEditing && (
                 <button 
                  onClick={() => setIsEditing(true)} 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                 >
                   <PencilIcon className="h-5 w-5 mr-2" />
                   Redigera
                 </button>
              )}
            </div>
             {isApplication && <p className="text-sm text-gray-500 mt-1">Granska ansökan nedan och välj att godkänna eller neka.</p>}
          </div>

          <form onSubmit={handleSave}>
            <div className="px-6 py-6">
              <dl className="space-y-6">
                
                {/* Applicant Info Card */}
                <div className="p-6 bg-gray-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ansökandes Information</h3>
                  <div className="space-y-4">
                    <DetailItem label="Namn">{data.name}</DetailItem>
                    <DetailItem label="E-post">{data.email}</DetailItem>
                    <DetailItem label="Telefon">{data.phone}</DetailItem>
                  </div>
                </div>

                {/* Address Info Card */}
                 {(data.address || data.city) && (
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Adress</h3>
                    <div className="space-y-4">
                      <DetailItem label="Gatuadress">{data.address}</DetailItem>
                      <DetailItem label="Postnummer">{data.postalCode}</DetailItem>
                      <DetailItem label="Stad">{data.city}</DetailItem>
                      <DetailItem label="Land">{data.country}</DetailItem>
                    </div>
                  </div>
                )}
                
                {/* Marketing & Channels Card */}
                <div className="p-6 bg-gray-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Kanaler & Marknadsföring</h3>
                   <div className="space-y-4">
                      <DetailItem label="Primär kanal">{data.promotionMethod}</DetailItem>
                      <DetailItem label="Meddelande">{data.message || '-'}</DetailItem>
                      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                        <dt className="text-sm font-medium text-gray-500">Sociala medier</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                          <SocialLinks socials={data.socials} />
                        </dd>
                      </div>
                  </div>
                </div>

                {/* Settings for approving an application */}
                {isApplication && (
                    <div className="p-6 bg-white rounded-xl border-2 border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Godkännandeinställningar</h3>
                       <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                         <dt className="text-sm font-medium text-gray-500 flex items-center">
                           <TagIcon className="h-5 w-5 mr-2 text-gray-400" />
                           Rabatt vid checkout
                         </dt>
                         <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                             <div className="relative mt-1 rounded-md shadow-sm w-full max-w-xs">
                               <input type="number" value={checkoutDiscount} onChange={(e) => setCheckoutDiscount(e.target.value)} className="block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                 <span className="text-gray-500 sm:text-sm">%</span>
                               </div>
                             </div>
                             <p className="text-xs text-gray-500 mt-1">Ange den rabatt i procent som kunderna får när de använder denna affiliate-länk/kod. Standard är 10%.</p>
                         </dd>
                       </div>
                    </div>
                )}
                
                {/* Display for existing affiliates */}
                {!isApplication && (
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Affiliate-inställningar</h3>
                     <dl className="sm:divide-y sm:divide-gray-200">
                        <DetailItem label="Affiliate-kod"><span>{data.affiliateCode}</span></DetailItem>
                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                          <dt className="text-sm font-medium text-gray-500">Status</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                            {isEditing ? (
                              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                                <option value="active">Aktiv</option>
                                <option value="suspended">Suspenderad</option>
                              </select>
                            ) : (
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {data.status}
                              </span>
                            )}
                          </dd>
                        </div>
                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                          <dt className="text-sm font-medium text-gray-500">Provision</dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                            {isEditing ? (
                              <div className="relative mt-1 rounded-md shadow-sm w-full max-w-xs">
                                <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  <span className="text-gray-500 sm:text-sm">%</span>
                                </div>
                              </div>
                            ) : (
                              <span>{data.commissionRate}%</span>
                            )}
                          </dd>
                        </div>
                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5">
                          <dt className="text-sm font-medium text-gray-500 flex items-center">
                            <TagIcon className="h-5 w-5 mr-2 text-gray-400" />
                            Rabatt vid checkout
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                            {isEditing ? (
                              <div className="relative mt-1 rounded-md shadow-sm w-full max-w-xs">
                                <input type="number" value={checkoutDiscount} onChange={(e) => setCheckoutDiscount(e.target.value)} className="block w-full rounded-md border-gray-300 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  <span className="text-gray-500 sm:text-sm">%</span>
                                </div>
                              </div>
                            ) : (
                              <span>{data.checkoutDiscount}%</span>
                            )}
                          </dd>
                        </div>
                    </dl>
                  </div>
                )}
              </dl>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50">
              {isEditing && !isApplication && (
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsEditing(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                    Avbryt
                  </button>
                  <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                    {loading ? 'Sparar...' : 'Spara ändringar'}
                  </button>
                </div>
              )}
              {isApplication && (
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={handleDeny} className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700">
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Neka
                  </button>
                  <button type="button" onClick={handleApprove} className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Godkänn Ansökan
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminAffiliateEdit; 