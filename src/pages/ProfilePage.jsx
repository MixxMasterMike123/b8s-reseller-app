import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSimpleAuth } from '../contexts/SimpleAuthContext';
import { getAuth, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, defaultDb } from '../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';

const ProfilePage = () => {
  const { currentUser } = useSimpleAuth();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phoneNumber: '',
    address: '',
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
          setFormData(prev => ({
            ...prev,
            companyName: data.companyName || '',
            contactPerson: data.contactPerson || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
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
            setFormData(prev => ({
              ...prev,
              companyName: data.companyName || '',
              contactPerson: data.contactPerson || '',
              phoneNumber: data.phoneNumber || '',
              address: data.address || '',
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
              setFormData(prev => ({
                ...prev,
                companyName: '',
                contactPerson: '',
                phoneNumber: '',
                address: '',
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
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        updatedAt: new Date().toISOString()
      };
      
      // Try to update in both databases
      const userDocRef = doc(db, 'users', currentUser.uid);
      const defaultUserDocRef = doc(defaultDb, 'users', currentUser.uid);
      
      try {
        await updateDoc(userDocRef, profileData);
      } catch (error) {
        console.error('Error updating profile in named database:', error);
      }
      
      try {
        await updateDoc(defaultUserDocRef, profileData);
      } catch (error) {
        console.error('Error updating profile in default database:', error);
      }
      
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
              Your Profile
            </h1>
            <Link
              to="/"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Dashboard
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
              <h2 className="text-xl font-medium text-gray-900 mb-4">Profile Information</h2>
              
              {!isEditing ? (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{currentUser?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium">{userData?.companyName || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact Person</p>
                      <p className="font-medium">{userData?.contactPerson || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{userData?.phoneNumber || 'Not set'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{userData?.address || 'Not set'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        id="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phoneNumber"
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows="3"
                        value={formData.address}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
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