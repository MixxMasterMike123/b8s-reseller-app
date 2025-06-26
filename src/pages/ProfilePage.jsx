import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuth, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, defaultDb } from '../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';

const ProfilePage = () => {
  const { currentUser, updateUserProfile } = useAuth();
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
          }));
        } else {
          console.log('User not found in named database, trying default database');
          // Try default database as fallback
          const defaultUserDocRef = doc(defaultDb, 'users', currentUser.uid);
          userDocSnap = await getDoc(defaultUserDocRef);
          
          if (userDocSnap.exists()) {
            console.log('User found in default database');
            const data = userDocSnap.data();
            setUserData(data);
            setSameAsCompanyAddress(data.sameAsCompanyAddress !== false);
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
            }));
          } else {
            console.log('No user found in either database, creating profile');
            // Create new user in both databases
            try {
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
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              // Try to set document in named database
              try {
                console.log('Creating profile in named database');
                await setDoc(doc(db, 'users', currentUser.uid), newUserData);
                console.log('Profile created in named database');
              } catch (nameDbError) {
                console.error('Error creating profile in named database:', nameDbError);
              }
              
              // Try to set document in default database
              try {
                console.log('Creating profile in default database');
                await setDoc(doc(defaultDb, 'users', currentUser.uid), newUserData);
                console.log('Profile created in default database');
              } catch (defaultDbError) {
                console.error('Error creating profile in default database:', defaultDbError);
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
              }));
              
              toast.success('Profile created. Please update your information.');
            } catch (createError) {
              console.error('Error creating user profile:', createError);
              toast.error('Could not create your profile. Please contact support.');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Could not fetch your profile data. Please try again later.');
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
      return setError('Passwords do not match');
    }
    
    if (formData.newPassword.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Use Firebase Auth directly to update password
      const auth = getAuth();
      await firebaseUpdatePassword(auth.currentUser, formData.newPassword);
      
      setSuccess('Password updated successfully');
      toast.success('Password updated successfully');
      
      setFormData({
        ...formData,
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password update error:', error);
      setError('Failed to update password. You may need to re-login.');
      toast.error('Failed to update password. You may need to re-login.');
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
      };
      
      // Use AuthContext method for updating
      await updateUserProfile(profileData);
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        ...profileData
      }));
      
      setSuccess('Profile updated successfully');
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile. Please try again later.');
      toast.error('Failed to update profile. Please try again later.');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h1 className="text-lg leading-6 font-medium text-gray-900">
              Din Profil
            </h1>
            <Link
              to="/"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Tillbaka till Dashboard
            </Link>
          </div>

          {/* Profile content */}
          <div className="p-6">
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

            <div className="mb-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Profilinformation</h2>
              
              {!isEditing ? (
                <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                  {/* Company Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Företagsinformation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">E-post</p>
                        <p className="font-medium">{currentUser?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Företagsnamn</p>
                        <p className="font-medium">{userData?.companyName || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Kontaktperson</p>
                        <p className="font-medium">{userData?.contactPerson || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Telefon</p>
                        <p className="font-medium">{userData?.phone || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Organisationsnummer</p>
                        <p className="font-medium">{userData?.orgNumber || 'Ej angivet'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Company Address */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Företagsadress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Gatuadress</p>
                        <p className="font-medium">{userData?.address || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Postnummer</p>
                        <p className="font-medium">{userData?.postalCode || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Stad</p>
                        <p className="font-medium">{userData?.city || 'Ej angivet'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Land</p>
                        <p className="font-medium">{userData?.country || 'Sverige'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Leveransadress
                    </h3>
                    {userData?.sameAsCompanyAddress !== false ? (
                      <p className="text-sm text-gray-600 italic">Samma som företagsadress</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Leveransadress</p>
                          <p className="font-medium">{userData?.deliveryAddress || 'Ej angivet'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Postnummer</p>
                          <p className="font-medium">{userData?.deliveryPostalCode || 'Ej angivet'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Stad</p>
                          <p className="font-medium">{userData?.deliveryCity || 'Ej angivet'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Land</p>
                          <p className="font-medium">{userData?.deliveryCountry || 'Sverige'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Redigera Profil
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-8">
                  {/* Company Information Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Företagsinformation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                          Företagsnamn *
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          id="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                          Kontaktperson *
                        </label>
                        <input
                          type="text"
                          name="contactPerson"
                          id="contactPerson"
                          value={formData.contactPerson}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="08-123 456 78"
                        />
                      </div>
                      <div>
                        <label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700">
                          Organisationsnummer
                        </label>
                        <input
                          type="text"
                          name="orgNumber"
                          id="orgNumber"
                          value={formData.orgNumber}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="556123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Address Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Företagsadress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Gatuadress
                        </label>
                        <input
                          type="text"
                          name="address"
                          id="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Gatuadress 123"
                        />
                      </div>
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                          Postnummer
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="123 45"
                        />
                      </div>
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                          Stad
                        </label>
                        <input
                          type="text"
                          name="city"
                          id="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Stockholm"
                        />
                      </div>
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                          Land
                        </label>
                        <select
                          name="country"
                          id="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Sverige">Sverige</option>
                          <option value="Norge">Norge</option>
                          <option value="Danmark">Danmark</option>
                          <option value="Finland">Finland</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Leveransadress
                    </h3>
                    
                    <div className="mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={sameAsCompanyAddress}
                          onChange={handleCheckboxChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Samma som företagsadress
                        </span>
                      </label>
                    </div>
                    
                    {!sameAsCompanyAddress && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700">
                            Leveransadress
                          </label>
                          <input
                            type="text"
                            name="deliveryAddress"
                            id="deliveryAddress"
                            value={formData.deliveryAddress}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Leveransadress 123"
                          />
                        </div>
                        <div>
                          <label htmlFor="deliveryPostalCode" className="block text-sm font-medium text-gray-700">
                            Postnummer
                          </label>
                          <input
                            type="text"
                            name="deliveryPostalCode"
                            id="deliveryPostalCode"
                            value={formData.deliveryPostalCode}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="123 45"
                          />
                        </div>
                        <div>
                          <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700">
                            Stad
                          </label>
                          <input
                            type="text"
                            name="deliveryCity"
                            id="deliveryCity"
                            value={formData.deliveryCity}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Stockholm"
                          />
                        </div>
                        <div>
                          <label htmlFor="deliveryCountry" className="block text-sm font-medium text-gray-700">
                            Land
                          </label>
                          <select
                            name="deliveryCountry"
                            id="deliveryCountry"
                            value={formData.deliveryCountry}
                            onChange={handleChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Sverige">Sverige</option>
                            <option value="Norge">Norge</option>
                            <option value="Danmark">Danmark</option>
                            <option value="Finland">Finland</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      disabled={loading}
                    >
                      Avbryt
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? 'Sparar...' : 'Spara Ändringar'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Ändra Lösenord</h2>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      Nytt Lösenord
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Bekräfta Nytt Lösenord
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Uppdaterar...' : 'Uppdatera Lösenord'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage; 