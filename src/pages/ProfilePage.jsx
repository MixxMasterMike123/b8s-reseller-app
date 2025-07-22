import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { getAuth, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';

const ProfilePage = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const { t } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [sameAsCompanyAddress, setSameAsCompanyAddress] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sverige',
    orgNumber: '',
    // Delivery address fields
    deliveryAddress: '',
    deliveryCity: '',
    deliveryPostalCode: '',
    deliveryCountry: 'Sverige',
    sameAsCompanyAddress: true,
    preferredLang: 'sv-SE',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch user data directly from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      
      try {
        console.log('Current user UID:', currentUser.uid);
        
        // Try to get user data from named database first
        const userDocRef = doc(db, 'users', currentUser.uid);
        console.log('Trying to fetch from named database (b8s-reseller-db)');
        let userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          console.log('User found in named database');
          const data = userDocSnap.data();
          setUserData(data);
          setSameAsCompanyAddress(data.sameAsCompanyAddress !== false); // Default to true if not set
          setFormData(prev => ({
            ...prev,
            companyName: data.companyName || '',
            contactPerson: data.contactPerson || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Sverige',
            orgNumber: data.orgNumber || '',
            // Delivery address fields
            deliveryAddress: data.deliveryAddress || '',
            deliveryCity: data.deliveryCity || '',
            deliveryPostalCode: data.deliveryPostalCode || '',
            deliveryCountry: data.deliveryCountry || 'Sverige',
            sameAsCompanyAddress: data.sameAsCompanyAddress !== false,
            preferredLang: data.preferredLang || 'sv-SE',
          }));
        } else {
          console.log('No user found in named database, creating profile');
          // Create new user profile
          const newUserData = {
            email: currentUser.email,
            companyName: '',
            contactPerson: '',
            phoneNumber: '',
            address: '',
            role: 'user',
            active: true,
            isActive: true,
            sameAsCompanyAddress: true,
            preferredLang: 'sv-SE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          try {
            console.log('Creating profile in named database');
            await setDoc(doc(db, 'users', currentUser.uid), newUserData);
            console.log('Profile created in named database');
          } catch (nameDbError) {
            console.error('Error creating profile in named database:', nameDbError);
          }
          
          setUserData(newUserData);
          setSameAsCompanyAddress(true);
          setFormData(prev => ({
            ...prev,
            companyName: '',
            contactPerson: '',
            phoneNumber: '',
            address: '',
            sameAsCompanyAddress: true,
            preferredLang: 'sv-SE',
          }));
          
          toast.success(t('profile.profile_created', 'Profile created. Please update your information.'));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error(t('profile.fetch_error', 'Could not fetch your profile data. Please try again later.'));
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchUserData();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSameAsCompanyAddress(checked);
    setFormData({
      ...formData,
      sameAsCompanyAddress: checked,
    });
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      return setError(t('profile.passwords_no_match', 'Passwords do not match'));
    }
    
    if (formData.newPassword.length < 6) {
      return setError(t('profile.password_min_length', 'Password must be at least 6 characters long'));
    }
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Use Firebase Auth directly to update password
      const auth = getAuth();
      await firebaseUpdatePassword(auth.currentUser, formData.newPassword);
      
      setSuccess(t('profile.password_updated', 'Password updated successfully'));
      toast.success(t('profile.password_updated', 'Password updated successfully'));
      
      setFormData({
        ...formData,
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password update error:', error);
      setError(t('profile.password_update_error', 'Failed to update password. You may need to re-login.'));
      toast.error(t('profile.password_update_error', 'Failed to update password. You may need to re-login.'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Update profile data directly in Firestore
      if (!currentUser) throw new Error('No authenticated user');
      
      const profileData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        orgNumber: formData.orgNumber,
        // Delivery address fields
        deliveryAddress: sameAsCompanyAddress ? formData.address : formData.deliveryAddress,
        deliveryCity: sameAsCompanyAddress ? formData.city : formData.deliveryCity,
        deliveryPostalCode: sameAsCompanyAddress ? formData.postalCode : formData.deliveryPostalCode,
        deliveryCountry: sameAsCompanyAddress ? formData.country : formData.deliveryCountry,
        sameAsCompanyAddress: sameAsCompanyAddress,
        preferredLang: formData.preferredLang,
      };
      
      // Use AuthContext method for updating
      await updateUserProfile(profileData);
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        ...profileData
      }));
      
      setSuccess(t('profile.profile_updated', 'Profile updated successfully'));
      toast.success(t('profile.profile_updated', 'Profile updated successfully'));
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(t('profile.profile_update_error', 'Failed to update profile. Please try again later.'));
      toast.error(t('profile.profile_update_error', 'Failed to update profile. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('profile.title', 'Profil')}</h1>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 md:py-2 border border-gray-300 text-base md:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-h-[48px] md:min-h-0"
            >
              {t('profile.back_to_dashboard', 'Tillbaka till Dashboard')}
            </Link>
          </div>
        </div>

        {/* Profile content */}
        <div className="p-4 md:p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-4 md:mb-6">{t('profile.profile_information', 'Profilinformation')}</h2>
            
            {!isEditing ? (
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg space-y-6 md:space-y-8">
                {/* Company Information */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4 pb-2 border-b border-gray-200">
                    {t('profile.company_information', 'Företagsinformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.email', 'E-post')}</p>
                      <p className="font-medium text-base">{currentUser?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.company_name', 'Företagsnamn')}</p>
                      <p className="font-medium text-base">{userData?.companyName || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.contact_person', 'Kontaktperson')}</p>
                      <p className="font-medium text-base">{userData?.contactPerson || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.phone', 'Telefon')}</p>
                      <p className="font-medium text-base">{userData?.phone || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <label htmlFor="preferredLang" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.preferred_language', 'Föredraget språk')}
                      </label>
                      <select
                        name="preferredLang"
                        id="preferredLang"
                        value={formData.preferredLang}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                      >
                        <option value="sv-SE">{t('lang_swedish', 'Svenska')}</option>
                        <option value="en-GB">{t('lang_english_uk', 'English (UK)')}</option>
                        <option value="en-US">{t('lang_english_us', 'English (US)')}</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.org_number', 'Organisationsnummer')}</p>
                      <p className="font-medium text-base">{userData?.orgNumber || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.your_margin', 'Din Marginal')}</p>
                      <p className="font-medium text-base">{userData?.marginal ? `${userData.marginal}%` : t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                  </div>
                </div>

                {/* Company Address */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4 pb-2 border-b border-gray-200">
                    {t('profile.company_address', 'Företagsadress')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="md:col-span-2">
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.street_address', 'Gatuadress')}</p>
                      <p className="font-medium text-base">{userData?.address || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.postal_code', 'Postnummer')}</p>
                      <p className="font-medium text-base">{userData?.postalCode || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.city', 'Stad')}</p>
                      <p className="font-medium text-base">{userData?.city || t('profile.not_specified', 'Ej angivet')}</p>
                    </div>
                    <div>
                      <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.country', 'Land')}</p>
                      <p className="font-medium text-base">{userData?.country || t('profile.default_country', 'Sverige')}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4 pb-2 border-b border-gray-200">
                    {t('profile.delivery_address', 'Leveransadress')}
                  </h3>
                  {userData?.sameAsCompanyAddress !== false ? (
                    <p className="text-sm md:text-sm text-gray-600 italic">{t('profile.same_as_company_address', 'Samma som företagsadress')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                              <div className="md:col-span-2">
                          <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.delivery_address', 'Leveransadress')}</p>
                          <p className="font-medium text-base">{userData?.deliveryAddress || t('profile.not_specified', 'Ej angivet')}</p>
                        </div>
                        <div>
                          <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.postal_code', 'Postnummer')}</p>
                          <p className="font-medium text-base">{userData?.deliveryPostalCode || t('profile.not_specified', 'Ej angivet')}</p>
                        </div>
                        <div>
                          <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.city', 'Stad')}</p>
                          <p className="font-medium text-base">{userData?.deliveryCity || t('profile.not_specified', 'Ej angivet')}</p>
                        </div>
                        <div>
                          <p className="text-sm md:text-sm text-gray-500 mb-1">{t('profile.country', 'Land')}</p>
                          <p className="font-medium text-base">{userData?.deliveryCountry || t('profile.default_country', 'Sverige')}</p>
                        </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 md:px-4 md:py-2 border border-transparent text-base md:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 min-h-[48px] md:min-h-0"
                >
                  {t('profile.edit_profile', 'Redigera Profil')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-6 md:space-y-8">
                {/* Company Information Section */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4 md:mb-6 pb-2 border-b border-gray-200">
                    {t('profile.company_information', 'Företagsinformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label htmlFor="companyName" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.company_name', 'Företagsnamn')} *
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="contactPerson" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.contact_person', 'Kontaktperson')} *
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.phone', 'Telefon')}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        placeholder="08-123 456 78"
                      />
                    </div>
                    <div>
                      <label htmlFor="orgNumber" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.org_number', 'Organisationsnummer')}
                      </label>
                      <input
                        type="text"
                        name="orgNumber"
                        id="orgNumber"
                        value={formData.orgNumber}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        placeholder="556123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Address Section */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4 md:mb-6 pb-2 border-b border-gray-200">
                    {t('profile.company_address', 'Företagsadress')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.street_address', 'Gatuadress')}
                      </label>
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        placeholder={t('profile.street_address_placeholder', 'Gatuadress 123')}
                      />
                    </div>
                    <div>
                      <label htmlFor="postalCode" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.postal_code', 'Postnummer')}
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        placeholder={t('profile.postal_code_placeholder', '123 45')}
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.city', 'Stad')}
                      </label>
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        placeholder={t('profile.city_placeholder', 'Stockholm')}
                      />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                        {t('profile.country', 'Land')}
                      </label>
                      <select
                        name="country"
                        id="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                      >
                        <option value="Sverige">{t('profile.country_sweden', 'Sverige')}</option>
                        <option value="Norge">{t('profile.country_norway', 'Norge')}</option>
                        <option value="Danmark">{t('profile.country_denmark', 'Danmark')}</option>
                        <option value="Finland">{t('profile.country_finland', 'Finland')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Section */}
                <div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4 md:mb-6 pb-2 border-b border-gray-200">
                    {t('profile.delivery_address', 'Leveransadress')}
                  </h3>
                  
                  <div className="mb-6">
                    <label className="flex items-center p-3 md:p-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsCompanyAddress}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 md:ml-2 text-base md:text-sm text-gray-700">
                        {t('profile.same_as_company_address', 'Samma som företagsadress')}
                      </span>
                    </label>
                  </div>
                  
                  {!sameAsCompanyAddress && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="md:col-span-2">
                        <label htmlFor="deliveryAddress" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                          {t('profile.delivery_address', 'Leveransadress')}
                        </label>
                        <input
                          type="text"
                          name="deliveryAddress"
                          id="deliveryAddress"
                          value={formData.deliveryAddress}
                          onChange={handleChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                          placeholder={t('profile.delivery_address_placeholder', 'Leveransadress 123')}
                        />
                      </div>
                      <div>
                        <label htmlFor="deliveryPostalCode" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                          {t('profile.postal_code', 'Postnummer')}
                        </label>
                        <input
                          type="text"
                          name="deliveryPostalCode"
                          id="deliveryPostalCode"
                          value={formData.deliveryPostalCode}
                          onChange={handleChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                          placeholder={t('profile.postal_code_placeholder', '123 45')}
                        />
                      </div>
                      <div>
                        <label htmlFor="deliveryCity" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                          {t('profile.city', 'Stad')}
                        </label>
                        <input
                          type="text"
                          name="deliveryCity"
                          id="deliveryCity"
                          value={formData.deliveryCity}
                          onChange={handleChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                          placeholder={t('profile.city_placeholder', 'Stockholm')}
                        />
                      </div>
                      <div>
                        <label htmlFor="deliveryCountry" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                          {t('profile.country', 'Land')}
                        </label>
                        <select
                          name="deliveryCountry"
                          id="deliveryCountry"
                          value={formData.deliveryCountry}
                          onChange={handleChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                        >
                          <option value="Sverige">{t('profile.country_sweden', 'Sverige')}</option>
                          <option value="Norge">{t('profile.country_norway', 'Norge')}</option>
                          <option value="Danmark">{t('profile.country_denmark', 'Danmark')}</option>
                          <option value="Finland">{t('profile.country_finland', 'Finland')}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 md:px-4 md:py-2 border border-gray-300 text-base md:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 min-h-[48px] md:min-h-0"
                    disabled={loading}
                  >
                    {t('profile.cancel', 'Avbryt')}
                  </button>
                  <button
                    type="submit"
                    className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 md:px-4 md:py-2 border border-transparent text-base md:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 min-h-[48px] md:min-h-0"
                    disabled={loading}
                  >
                    {loading ? t('profile.saving', 'Sparar...') : t('profile.save_changes', 'Spara Ändringar')}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6 md:pt-8">
            <h2 className="text-lg md:text-xl font-medium text-gray-900 mb-4 md:mb-6">{t('profile.change_password', 'Ändra Lösenord')}</h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label htmlFor="newPassword" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                    {t('profile.new_password', 'Nytt Lösenord')}
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-base md:text-sm font-medium text-gray-700 mb-2 md:mb-1">
                    {t('profile.confirm_password', 'Bekräfta Nytt Lösenord')}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-3 md:py-2 px-4 md:px-3 text-base focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[48px] md:min-h-0"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 md:px-4 md:py-2 border border-transparent text-base md:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 min-h-[48px] md:min-h-0"
                  disabled={loading}
                >
                  {loading ? t('profile.updating', 'Uppdaterar...') : t('profile.update_password', 'Uppdatera Lösenord')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage; 